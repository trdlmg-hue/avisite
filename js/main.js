/* ==========================================================================
   Avisite - Common JavaScript
   Sirf navigation ka kaam yahan hai. Tool ka JS alag file mein hoga
   (js/tools/...) aur sirf tool page par load hoga.
   ========================================================================== */

(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  if (!toggle || !nav) {
    return;
  }

  function openMenu() {
    nav.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Menu band karein");
  }

  function closeMenu() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Menu kholein");
  }

  function isOpen() {
    return nav.classList.contains("is-open");
  }

  toggle.addEventListener("click", function () {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Menu ka koi link dabaye to menu band ho jaaye
  nav.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  // Escape dabane par menu band ho
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      closeMenu();
      toggle.focus();
    }
  });

  // Bade screen par resize hone par menu state reset ho
  var desktopQuery = window.matchMedia("(min-width: 768px)");
  desktopQuery.addEventListener("change", function (event) {
    if (event.matches) {
      closeMenu();
    }
  });
})();
