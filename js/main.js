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


/* ==========================================================================
   Service worker aur "Install app" banner (PWA)
   ========================================================================== */
(function () {
  "use strict";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      // Sw ka path manifest.json ke path se nikalte hain, taaki subfolder (/avisite/) par bhi chale
    var manifestLink = document.querySelector('link[rel="manifest"]');
    var root = manifestLink ? new URL(manifestLink.getAttribute("href"), location.href) : new URL("./", location.href);
    navigator.serviceWorker.register(new URL("sw.js", root)).catch(function () {
        /* offline support optional hai, error ignore */
      });
    });
  }

  // Install banner (Android Chrome par "beforeinstallprompt" aata hai)
  var deferredPrompt = null;
  var DISMISS_KEY = "avisiteInstallDismissed";

  function showBanner() {
    if (document.getElementById("install-banner")) { return; }
    var bar = document.createElement("div");
    bar.id = "install-banner";
    bar.className = "install-banner";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Install Avisite app");

    var text = document.createElement("span");
    text.textContent = "Avisite ko phone par app ki tarah install karein.";

    var install = document.createElement("button");
    install.type = "button";
    install.className = "btn btn--primary install-banner__btn";
    install.textContent = "Install";
    install.addEventListener("click", function () {
      if (!deferredPrompt) { return; }
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
        bar.remove();
      });
    });

    var close = document.createElement("button");
    close.type = "button";
    close.className = "install-banner__close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.addEventListener("click", function () {
      try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) { /* ignore */ }
      bar.remove();
    });

    bar.appendChild(text);
    bar.appendChild(install);
    bar.appendChild(close);
    document.body.appendChild(bar);
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") { return; }
    } catch (e) { /* ignore */ }
    deferredPrompt = event;
    showBanner();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    var bar = document.getElementById("install-banner");
    if (bar) { bar.remove(); }
  });
})();
