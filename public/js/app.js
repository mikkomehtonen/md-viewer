(function () {
  'use strict';

  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  var toggleButtons = document.querySelectorAll('.sidebar-toggle');
  var closeButton = document.getElementById('sidebar-close');
  var triggerElement = null;
  var focusTrapHandler = null;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function openSidebar() {
    triggerElement = document.activeElement;

    sidebar.classList.add('open');
    backdrop.classList.add('visible');
    closeButton.focus();

    // Update aria-expanded on all toggle buttons
    toggleButtons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'true');
    });

    if (isMobile()) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Add inert to main content
      var main = document.querySelector('main');
      if (main) {
        main.setAttribute('inert', '');
      }

      // Add focus trap (Tab cycles within sidebar)
      if (!focusTrapHandler) {
        focusTrapHandler = function (e) {
          if (e.key !== 'Tab') return;
          var focusable = sidebar.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          var first = focusable[0];
          var last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        };
        document.addEventListener('keydown', focusTrapHandler);
      }
    }
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('visible');

    // Restore focus to the element that triggered the open
    if (triggerElement) {
      triggerElement.focus();
      triggerElement = null;
    }

    // Restore body scroll
    document.body.style.overflow = '';

    // Remove inert from main content
    var main = document.querySelector('main');
    if (main) {
      main.removeAttribute('inert');
    }

    // Update aria-expanded on all toggle buttons
    toggleButtons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });

    // Remove focus trap
    if (focusTrapHandler) {
      document.removeEventListener('keydown', focusTrapHandler);
      focusTrapHandler = null;
    }
  }

  toggleButtons.forEach(function (btn) {
    btn.addEventListener('click', openSidebar);
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeSidebar);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }

  // Close sidebar on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  // Auto-expand the folder containing the active file
  var activeFile = document.querySelector('.tree-file.active');
  if (activeFile) {
    var parent = activeFile.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') {
        parent.open = true;
      }
      parent = parent.parentElement;
    }
  }
})();
