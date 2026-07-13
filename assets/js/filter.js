(function () {
  var tabs = document.querySelectorAll(".filter-tab");
  var cards = document.querySelectorAll(".project-card");
  if (!tabs.length) return;

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("is-active"); });
      tab.classList.add("is-active");

      var filter = tab.getAttribute("data-filter");
      cards.forEach(function (card) {
        var match = filter === "all" || card.getAttribute("data-category") === filter;
        card.style.display = match ? "" : "none";
      });
    });
  });
})();
