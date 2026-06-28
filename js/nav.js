(() => {
  'use strict';
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('nav__links--open');
    toggle.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('nav__links--open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
