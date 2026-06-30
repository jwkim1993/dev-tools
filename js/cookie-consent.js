(() => {
  'use strict';

  const CONSENT_KEY = 'cookie_consent';

  if (localStorage.getItem(CONSENT_KEY)) return;

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML =
    '<div class="cookie-banner__inner">' +
      '<p class="cookie-banner__text">' +
        'This site uses cookies for essential functionality and third-party advertising (Google AdSense). ' +
        'By continuing to use this site, you consent to our use of cookies. ' +
        '<a href="/privacy.html">Learn more</a>' +
      '</p>' +
      '<div class="cookie-banner__actions">' +
        '<button class="btn btn--primary cookie-banner__btn" id="cookieAccept">Accept</button>' +
        '<button class="btn btn--default cookie-banner__btn" id="cookieDecline">Decline</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(banner);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.classList.add('cookie-banner--visible');
    });
  });

  function dismiss(accepted) {
    localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'declined');
    banner.classList.remove('cookie-banner--visible');
    banner.addEventListener('transitionend', () => banner.remove(), { once: true });
  }

  document.getElementById('cookieAccept').addEventListener('click', () => dismiss(true));
  document.getElementById('cookieDecline').addEventListener('click', () => dismiss(false));
})();
