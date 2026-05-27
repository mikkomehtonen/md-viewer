(function () {
  'use strict';

  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  var toggleButtons = document.querySelectorAll('.sidebar-toggle');
  var closeButton = document.getElementById('sidebar-close');

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('visible');
    closeButton.focus();
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('visible');
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