(() => {
  'use strict';

  const { $, showToast, copyText } = Utils;

  const textEl = $('#encInput');
  const encodedEl = $('#encOutput');
  const errorEl = $('#encError');
  const inputCounter = $('#inputCounter');
  const outputCounter = $('#outputCounter');
  const modeTabs = document.querySelectorAll('.enc-tab__btn');

  let currentMode = 'base64';

  const codecs = {
    base64: {
      encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
      },
      decode(str) {
        try {
          return decodeURIComponent(escape(atob(str.trim())));
        } catch {
          throw new Error('Invalid Base64 string');
        }
      }
    },
    url: {
      encode(str) {
        return encodeURIComponent(str);
      },
      decode(str) {
        try {
          return decodeURIComponent(str.trim());
        } catch {
          throw new Error('Invalid URL-encoded string');
        }
      }
    },
    html: {
      encode(str) {
        const el = document.createElement('div');
        el.textContent = str;
        return el.innerHTML
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      },
      decode(str) {
        const el = document.createElement('textarea');
        el.innerHTML = str;
        return el.value;
      }
    }
  };

  function updateCounters() {
    const inLen = textEl.value.length;
    const outLen = encodedEl.value.length;
    inputCounter.textContent = inLen + ' char' + (inLen !== 1 ? 's' : '');
    outputCounter.textContent = outLen + ' char' + (outLen !== 1 ? 's' : '');
  }

  // Text → Encoded (left → right)
  function encode() {
    const input = textEl.value;
    errorEl.style.display = 'none';
    if (!input) {
      encodedEl.value = '';
      updateCounters();
      return;
    }
    try {
      encodedEl.value = codecs[currentMode].encode(input);
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = 'block';
      encodedEl.value = '';
    }
    updateCounters();
  }

  // Encoded → Text (right → left)
  function decode() {
    const input = encodedEl.value;
    errorEl.style.display = 'none';
    if (!input) {
      textEl.value = '';
      updateCounters();
      return;
    }
    try {
      textEl.value = codecs[currentMode].decode(input);
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = 'block';
      textEl.value = '';
    }
    updateCounters();
  }

  // Mode tabs
  modeTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      modeTabs.forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      currentMode = btn.dataset.mode;
      if (textEl.value) encode();
    });
  });

  // Per-panel: Copy
  $('#btnCopyText').addEventListener('click', () => {
    if (textEl.value) copyText(textEl.value);
  });
  $('#btnCopyEncoded').addEventListener('click', () => {
    if (encodedEl.value) copyText(encodedEl.value);
  });

  // Per-panel: Paste
  async function pasteInto(el) {
    try {
      el.value = await navigator.clipboard.readText();
      updateCounters();
      showToast('Pasted from clipboard');
    } catch {
      showToast('Clipboard access denied', 'danger');
    }
  }
  $('#btnPasteText').addEventListener('click', () => pasteInto(textEl));
  $('#btnPasteEncoded').addEventListener('click', () => pasteInto(encodedEl));

  // Clear All
  $('#btnClearAll').addEventListener('click', () => {
    textEl.value = '';
    encodedEl.value = '';
    errorEl.style.display = 'none';
    updateCounters();
    textEl.focus();
  });

  // Real-time: typing in Text panel auto-encodes
  textEl.addEventListener('input', () => {
    if (textEl.value) {
      encode();
    } else {
      encodedEl.value = '';
      errorEl.style.display = 'none';
      updateCounters();
    }
  });

  // Typing in Encoded panel auto-decodes
  encodedEl.addEventListener('input', () => {
    if (encodedEl.value) {
      decode();
    } else {
      textEl.value = '';
      errorEl.style.display = 'none';
      updateCounters();
    }
  });

  // Resizable divider
  const divider = $('#encDivider');
  const layout = $('#encEditorLayout');
  if (divider && layout) {
    let dragging = false;
    divider.addEventListener('mousedown', e => {
      e.preventDefault();
      dragging = true;
      divider.classList.add('editor-divider--active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const rect = layout.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, pct));
      layout.style.gridTemplateColumns = clamped + '% 6px ' + (100 - clamped) + '%';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      divider.classList.remove('editor-divider--active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  updateCounters();
})();
