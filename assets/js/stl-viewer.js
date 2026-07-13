import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/+esm";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js/+esm";
import { STLLoader } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/STLLoader.js/+esm";

// Warm gradient tied to the site palette: pine (low) -> pegboard ->
// brass -> safety orange (high). Colors are converted to linear space
// since vertex color buffer attributes aren't auto color-managed.
var HEAT_STOPS_HEX = [0x2f4239, 0x5b7065, 0xb98b3e, 0xe85d2c];
var HEAT_STOPS_T = [0, 0.35, 0.65, 1];
var HEAT_COLORS = HEAT_STOPS_HEX.map(function (hex) {
  return new THREE.Color(hex).convertSRGBToLinear();
});

function rampColor(t) {
  t = Math.min(1, Math.max(0, t));
  for (var i = 0; i < HEAT_STOPS_T.length - 1; i++) {
    if (t >= HEAT_STOPS_T[i] && t <= HEAT_STOPS_T[i + 1]) {
      var span = HEAT_STOPS_T[i + 1] - HEAT_STOPS_T[i] || 1;
      var localT = (t - HEAT_STOPS_T[i]) / span;
      return HEAT_COLORS[i].clone().lerp(HEAT_COLORS[i + 1], localT);
    }
  }
  return HEAT_COLORS[HEAT_COLORS.length - 1].clone();
}

function applyHeatmapVertexColors(geometry) {
  geometry.computeBoundingBox();
  var box = geometry.boundingBox;
  var minZ = box.min.z;
  var range = box.max.z - minZ || 1;
  var pos = geometry.attributes.position;
  var colors = new Float32Array(pos.count * 3);
  for (var i = 0; i < pos.count; i++) {
    var t = (pos.getZ(i) - minZ) / range;
    var c = rampColor(t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function initViewer(container) {
  if (container.dataset.initialized) return;
  container.dataset.initialized = "true";

  var src = container.dataset.src;
  var flatColor = container.dataset.color || "#B98B3E";
  var root = container.closest(".stl-viewer");

  var width = container.clientWidth;
  var height = container.clientHeight;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f2e7); // --paper

  var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // Brighter, more even lighting — a hemisphere light (sky/ground fill)
  // plus a modest key/fill pair, so the model doesn't rely on one
  // directional light to avoid looking dark and flat.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3f5147, 1.1));
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  var key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(1, 1.4, 1.2);
  scene.add(key);
  var fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-1.2, -0.3, -0.8);
  scene.add(fillLight);

  var material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    flatShading: true, // crisp facets rather than smoothed-over surfaces
    metalness: 0.05,
    roughness: 0.6,
  });

  var edgesMaterial = new THREE.LineBasicMaterial({
    color: 0x2b2620,
    transparent: true,
    opacity: 0.5,
  });

  var mesh = null;
  var edgeLines = null;
  var autoRotate = false;
  var heatmapOn = true;
  var defaultCameraPos = null;

  var loader = new STLLoader();
  loader.load(
    src,
    function (geometry) {
      geometry.computeVertexNormals();
      geometry.center();
      applyHeatmapVertexColors(geometry);

      mesh = new THREE.Mesh(geometry, material);
      // Most STL exports use Z-up (print bed = XY); three.js is Y-up.
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);

      var edgesGeom = new THREE.EdgesGeometry(geometry, 25);
      edgeLines = new THREE.LineSegments(edgesGeom, edgesMaterial);
      mesh.add(edgeLines);

      geometry.computeBoundingBox();
      var size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      var maxDim = Math.max(size.x, size.y, size.z) || 1;
      var fitDist = maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));

      camera.near = maxDim / 100;
      camera.far = maxDim * 100;
      camera.position.set(fitDist * 0.9, fitDist * 0.7, fitDist * 1.1);
      camera.updateProjectionMatrix();
      defaultCameraPos = camera.position.clone();

      controls.target.set(0, 0, 0);
      controls.update();

      var loadingEl = container.querySelector(".stl-viewer-loading");
      if (loadingEl) loadingEl.remove();
    },
    undefined,
    function (err) {
      container.innerHTML = '<p class="stl-viewer-error">Couldn\u2019t load this model.</p>';
      console.error("STL viewer failed to load " + src, err);
    }
  );

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate && mesh) mesh.rotation.z += 0.006;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  function setHeatmap(on) {
    heatmapOn = on;
    material.vertexColors = on;
    if (on) {
      material.color.set(0xffffff);
    } else {
      material.color.set(flatColor);
    }
    material.needsUpdate = true;
  }

  if (root) {
    var buttons = root.querySelectorAll("[data-action]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (e) {
        var btn = e.currentTarget;
        var action = btn.dataset.action;
        if (action === "wireframe") {
          material.wireframe = !material.wireframe;
          btn.classList.toggle("is-active", material.wireframe);
        } else if (action === "rotate") {
          autoRotate = !autoRotate;
          btn.classList.toggle("is-active", autoRotate);
        } else if (action === "heatmap") {
          setHeatmap(!heatmapOn);
          btn.classList.toggle("is-active", heatmapOn);
        } else if (action === "edges") {
          if (edgeLines) edgeLines.visible = !edgeLines.visible;
          btn.classList.toggle("is-active");
        } else if (action === "reset") {
          if (defaultCameraPos) camera.position.copy(defaultCameraPos);
          controls.target.set(0, 0, 0);
          controls.update();
        }
      });
    }
  }

  window.addEventListener("resize", function () {
    var w = container.clientWidth;
    var h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function scan() {
  document.querySelectorAll(".stl-viewer-canvas[data-src]").forEach(initViewer);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scan);
} else {
  scan();
}
