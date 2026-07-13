// Adds a "copy" button to every fenced code block in post content.
// No markup changes needed in posts — this just finds <pre> blocks
// rendered by kramdown/rouge and wires a button onto each.
(function () {
  function addButton(pre) {
    if (pre.dataset.copyReady) return;
    pre.dataset.copyReady = "true";

    var codeEl = pre.querySelector("code") || pre;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-code-btn";
    btn.textContent = "copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");

    var resetTimer = null;

    btn.addEventListener("click", function () {
      var text = codeEl.textContent;

      var done = function () {
        btn.textContent = "copied!";
        btn.classList.add("is-copied");
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
          btn.textContent = "copy";
          btn.classList.remove("is-copied");
        }, 1500);
      };

      var fail = function () {
        btn.textContent = "couldn't copy";
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
          btn.textContent = "copy";
        }, 1500);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else {
        // fallback for browsers without the async Clipboard API
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          done();
        } catch (e) {
          fail();
        }
        document.body.removeChild(ta);
      }
    });

    pre.appendChild(btn);
  }

  function scan() {
    document.querySelectorAll(".post-content pre").forEach(addButton);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
})();
