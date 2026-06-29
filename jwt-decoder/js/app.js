(() => {
  'use strict';

  const { $, showToast, copyText, debounce, escapeHtml } = Utils;

  // === Base64URL ===

  function b64UrlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function b64UrlEncodeBytes(buffer) {
    let bin = '';
    const bytes = new Uint8Array(buffer);
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // === JWT Operations ===

  function decodeJwt(token) {
    token = token.trim();
    if (token.toLowerCase().startsWith('bearer ')) token = token.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT: expected 3 segments separated by dots, got ' + parts.length);
    }

    let header, payload;
    try {
      header = JSON.parse(b64UrlDecode(parts[0]));
    } catch (e) {
      throw new Error('Invalid header: unable to decode Base64URL or parse JSON');
    }
    try {
      payload = JSON.parse(b64UrlDecode(parts[1]));
    } catch (e) {
      throw new Error('Invalid payload: unable to decode Base64URL or parse JSON');
    }

    return { header, payload, signature: parts[2], parts };
  }

  async function signJwt(headerObj, payloadObj, secret) {
    const alg = headerObj.alg;
    const hashMap = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
    const hash = hashMap[alg];
    if (!hash) throw new Error('Unsupported algorithm: ' + alg + '. Only HS256, HS384, HS512 are supported.');

    const headerB64 = b64UrlEncode(JSON.stringify(headerObj));
    const payloadB64 = b64UrlEncode(JSON.stringify(payloadObj));
    const input = headerB64 + '.' + payloadB64;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(input));

    return input + '.' + b64UrlEncodeBytes(sig);
  }

  async function verifySignature(token, secret) {
    const parts = token.trim().split('.');
    if (parts.length !== 3) return false;

    let header;
    try {
      header = JSON.parse(b64UrlDecode(parts[0]));
    } catch {
      return false;
    }

    const hashMap = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
    const hash = hashMap[header.alg];
    if (!hash) return null;

    const enc = new TextEncoder();
    const input = parts[0] + '.' + parts[1];

    try {
      const key = await crypto.subtle.importKey(
        'raw', enc.encode(secret),
        { name: 'HMAC', hash }, false, ['verify']
      );
      const sigStr = parts[2].replace(/-/g, '+').replace(/_/g, '/');
      const padded = sigStr + '='.repeat((4 - sigStr.length % 4) % 4);
      const sigBytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
      return await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(input));
    } catch {
      return false;
    }
  }

  // === Standard Claims ===

  const KNOWN_CLAIMS = {
    iss: { name: 'Issuer', desc: 'Entity that issued the token' },
    sub: { name: 'Subject', desc: 'Subject of the token (user ID)' },
    aud: { name: 'Audience', desc: 'Intended recipient of the token' },
    exp: { name: 'Expiration', desc: 'Token expiration time', isTime: true },
    nbf: { name: 'Not Before', desc: 'Token is not valid before this time', isTime: true },
    iat: { name: 'Issued At', desc: 'Time the token was issued', isTime: true },
    jti: { name: 'JWT ID', desc: 'Unique token identifier' },
    name: { name: 'Name', desc: 'Full name' },
    email: { name: 'Email', desc: 'Email address' },
    role: { name: 'Role', desc: 'User role' },
    roles: { name: 'Roles', desc: 'User roles' },
    scope: { name: 'Scope', desc: 'Authorized scopes' },
    azp: { name: 'Authorized Party', desc: 'Party the token was issued to' },
    nonce: { name: 'Nonce', desc: 'Value for replay prevention' },
    auth_time: { name: 'Auth Time', desc: 'Time of authentication', isTime: true },
  };

  function formatTimestamp(ts) {
    try {
      const d = new Date(ts * 1000);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString() + ' (' + timeAgo(d) + ')';
    } catch {
      return String(ts);
    }
  }

  function timeAgo(date) {
    const diff = date.getTime() - Date.now();
    const abs = Math.abs(diff);
    const future = diff > 0;

    if (abs < 60000) return future ? 'in < 1 min' : '< 1 min ago';
    if (abs < 3600000) {
      const m = Math.floor(abs / 60000);
      return future ? 'in ' + m + ' min' : m + ' min ago';
    }
    if (abs < 86400000) {
      const h = Math.floor(abs / 3600000);
      return future ? 'in ' + h + 'h' : h + 'h ago';
    }
    const d = Math.floor(abs / 86400000);
    return future ? 'in ' + d + 'd' : d + 'd ago';
  }

  function getExpiryStatus(payload) {
    if (payload.exp == null) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return { status: 'expired', text: 'Expired' };
    if (payload.exp - now < 300) return { status: 'expiring', text: 'Expiring soon' };
    return { status: 'valid', text: 'Valid' };
  }

  // === UI State ===

  const SAMPLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

  let lastDecodedToken = '';

  function init() {
    const tabs = document.querySelectorAll('.jwt-tab__btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => switchMode(tab.dataset.mode));
    });

    const tokenInput = $('#tokenInput');
    tokenInput.addEventListener('input', debounce(handleDecode, 250));

    $('#btnPaste').addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        tokenInput.value = text;
        handleDecode();
      } catch {
        showToast('Cannot access clipboard', 'danger');
      }
    });

    $('#btnSample').addEventListener('click', () => {
      tokenInput.value = SAMPLE_TOKEN;
      handleDecode();
    });

    $('#btnClearDecode').addEventListener('click', () => {
      tokenInput.value = '';
      clearDecodeOutput();
    });

    $('#btnCopyHeader').addEventListener('click', () => {
      const text = $('#headerOutput').textContent;
      if (text) copyText(text);
    });

    $('#btnCopyPayload').addEventListener('click', () => {
      const text = $('#payloadOutput').textContent;
      if (text) copyText(text);
    });

    $('#btnVerify').addEventListener('click', handleVerify);
    $('#verifySecret').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleVerify();
    });

    $('#algoSelect').addEventListener('change', e => {
      updateEncodeHeader(e.target.value);
    });

    $('#btnAddIat').addEventListener('click', () => injectClaim('iat', Math.floor(Date.now() / 1000)));
    $('#btnAddExp').addEventListener('click', () => injectClaim('exp', Math.floor(Date.now() / 1000) + 3600));
    $('#btnAddSub').addEventListener('click', () => injectClaim('sub', '1234567890'));

    $('#btnGenerate').addEventListener('click', handleGenerate);
    $('#btnCopyGenerated').addEventListener('click', () => {
      const val = $('#generatedToken').value;
      if (val) copyText(val);
    });

    $('#btnDecodeGenerated').addEventListener('click', () => {
      const val = $('#generatedToken').value;
      if (!val) return;
      switchMode('decode');
      tokenInput.value = val;
      handleDecode();
    });

    updateEncodeHeader('HS256');
    $('#encodePayload').value = JSON.stringify({
      sub: '1234567890',
      name: 'John Doe',
      iat: Math.floor(Date.now() / 1000)
    }, null, 2);
  }

  function switchMode(mode) {
    document.querySelectorAll('.jwt-tab__btn').forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.mode === mode);
    });
    $('#decodeSection').style.display = mode === 'decode' ? '' : 'none';
    $('#encodeSection').style.display = mode === 'encode' ? '' : 'none';
  }

  // === Decode ===

  function handleDecode() {
    const raw = $('#tokenInput').value.trim();
    if (!raw) {
      clearDecodeOutput();
      return;
    }

    try {
      const { header, payload, parts } = decodeJwt(raw);
      lastDecodedToken = raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;

      showSegments(parts, header);
      showDecodedOutput(header, payload);
      $('#decodeError').style.display = 'none';
    } catch (e) {
      clearDecodeOutput();
      $('#decodeError').style.display = '';
      $('#decodeError').textContent = e.message;
    }
  }

  function showSegments(parts, header) {
    const el = $('#jwtSegments');
    el.style.display = '';

    const truncate = (s, n) => s.length > n ? s.substring(0, n) + '…' : s;
    $('#segHeaderText').textContent = truncate(parts[0], 24);
    $('#segPayloadText').textContent = truncate(parts[1], 24);
    $('#segSignatureText').textContent = truncate(parts[2], 24);
    $('#segAlgo').textContent = header.alg || '?';
  }

  function showDecodedOutput(header, payload) {
    $('#headerOutput').textContent = JSON.stringify(header, null, 2);
    $('#payloadOutput').textContent = JSON.stringify(payload, null, 2);

    const expiry = getExpiryStatus(payload);
    const badge = $('#expiryBadge');
    if (expiry) {
      badge.textContent = expiry.text;
      badge.className = 'jwt-badge jwt-badge--' + expiry.status;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }

    renderClaims(payload);
    $('#jwtDecoded').style.display = '';
    $('#verifyStatus').innerHTML = '';
    $('#verifyStatus').className = 'jwt-verify__status';
  }

  function clearDecodeOutput() {
    lastDecodedToken = '';
    $('#jwtSegments').style.display = 'none';
    $('#jwtDecoded').style.display = 'none';
    $('#decodeError').style.display = 'none';
  }

  function renderClaims(payload) {
    const container = $('#claimsTable');
    const keys = Object.keys(payload);
    if (!keys.length) {
      container.innerHTML = '<p class="jwt-claims__empty">No claims in payload</p>';
      return;
    }

    let html = '<table class="jwt-claims-table"><thead><tr><th>Claim</th><th>Value</th><th>Description</th></tr></thead><tbody>';
    for (const key of keys) {
      const known = KNOWN_CLAIMS[key];
      const val = payload[key];
      let displayVal;

      if (known && known.isTime && typeof val === 'number') {
        displayVal = '<span class="jwt-claims__time">' + escapeHtml(formatTimestamp(val)) + '</span>';
      } else if (typeof val === 'object' && val !== null) {
        displayVal = '<code>' + escapeHtml(JSON.stringify(val)) + '</code>';
      } else {
        displayVal = escapeHtml(String(val));
      }

      const desc = known ? known.desc : '';
      html += '<tr><td><code>' + escapeHtml(key) + '</code></td><td>' + displayVal + '</td><td class="jwt-claims__desc">' + escapeHtml(desc) + '</td></tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // === Verify ===

  async function handleVerify() {
    const secret = $('#verifySecret').value;
    if (!secret) { showToast('Enter a secret key', 'danger'); return; }
    if (!lastDecodedToken) return;

    const status = $('#verifyStatus');
    try {
      const result = await verifySignature(lastDecodedToken, secret);
      if (result === null) {
        status.innerHTML = '<svg class="jwt-verify__svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Unsupported algorithm — only HMAC (HS256/HS384/HS512) can be verified in-browser';
        status.className = 'jwt-verify__status jwt-verify__status--warn';
      } else if (result) {
        status.innerHTML = '<svg class="jwt-verify__svg" viewBox="0 0 16 16"><path d="M3 8.5l3.5 3.5 6.5-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Signature verified';
        status.className = 'jwt-verify__status jwt-verify__status--valid';
      } else {
        status.innerHTML = '<svg class="jwt-verify__svg" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Invalid signature';
        status.className = 'jwt-verify__status jwt-verify__status--invalid';
      }
    } catch (e) {
      status.innerHTML = '<svg class="jwt-verify__svg" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> ' + escapeHtml(e.message);
      status.className = 'jwt-verify__status jwt-verify__status--invalid';
    }
  }

  // === Encode ===

  function updateEncodeHeader(alg) {
    $('#encodeHeader').value = JSON.stringify({ alg: alg, typ: 'JWT' }, null, 2);
  }

  function injectClaim(key, value) {
    const ta = $('#encodePayload');
    try {
      const obj = JSON.parse(ta.value);
      obj[key] = value;
      ta.value = JSON.stringify(obj, null, 2);
    } catch {
      showToast('Fix payload JSON before adding claims', 'danger');
    }
  }

  async function handleGenerate() {
    const headerText = $('#encodeHeader').value.trim();
    const payloadText = $('#encodePayload').value.trim();
    const secret = $('#encodeSecret').value;

    if (!secret) { showToast('Enter a secret key', 'danger'); return; }

    let header, payload;
    try {
      header = JSON.parse(headerText);
    } catch {
      showToast('Invalid header JSON', 'danger'); return;
    }
    try {
      payload = JSON.parse(payloadText);
    } catch {
      showToast('Invalid payload JSON', 'danger'); return;
    }

    try {
      const token = await signJwt(header, payload, secret);
      $('#generatedToken').value = token;
      $('#encodeOutput').style.display = '';
      showToast('Token generated');
    } catch (e) {
      showToast(e.message, 'danger');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
