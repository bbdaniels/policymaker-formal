/**
 * pf.main.js -- Application entry point.
 *
 * Loads demo data on first visit and initializes the UI.
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    PF.UI.init();

    // Auto-load demo project
    PF.UI.loadDemo();
  });
})();
