(() => {
  'use strict';

  const { $, showToast, copyText } = Utils;

  const SAMPLE = JSON.stringify({
    name: "JSON Prettier",
    version: "1.0.0",
    features: ["format", "validate", "stringify"],
    config: { debug: false, maxDepth: 10 }
  }, null, 2);

  function updateGutter(textarea, gutter) {
    if (!textarea || !gutter) return;
    const lines = textarea.value.split('\n').length;
    const current = gutter.children.length;
    if (lines === current) return;

    if (lines > current) {
      const frag = document.createDocumentFragment();
      for (let i = current + 1; i <= lines; i++) {
        const div = document.createElement('div');
        div.className = 'editor__gutter-line';
        div.textContent = i;
        frag.appendChild(div);
      }
      gutter.appendChild(frag);
    } else {
      while (gutter.children.length > lines) {
        gutter.removeChild(gutter.lastChild);
      }
    }
  }

  function syncScroll(textarea, gutter) {
    if (gutter && textarea) gutter.scrollTop = textarea.scrollTop;
  }

  function setupPane(textareaId, gutterId) {
    const textarea = $(textareaId);
    const gutter = $(gutterId);
    if (!textarea || !gutter) return;

    updateGutter(textarea, gutter);
    textarea.addEventListener('input', () => updateGutter(textarea, gutter));
    textarea.addEventListener('scroll', () => syncScroll(textarea, gutter));
  }

  function init() {
    setupPane('#stringifyJsonInput', '#stringifyJsonGutter');
    setupPane('#stringifyStringOutput', '#stringifyStrGutter');

    initDivider();

    const btnStringify = $('#btnStringify');
    const btnParse = $('#btnParse');
    const btnClear = $('#btnClearStringify');
    const btnSample = $('#btnStringifySample');
    const btnCopyJson = $('#btnCopyJson');
    const btnCopyStr = $('#btnCopyStringified');

    if (btnStringify) btnStringify.addEventListener('click', doStringify);
    if (btnParse) btnParse.addEventListener('click', doParse);
    if (btnClear) btnClear.addEventListener('click', doClear);
    if (btnSample) btnSample.addEventListener('click', () => {
      const jsonInput = $('#stringifyJsonInput');
      if (jsonInput) {
        jsonInput.value = SAMPLE;
        updateGutter(jsonInput, $('#stringifyJsonGutter'));
      }
      hideError();
    });
    if (btnCopyJson) btnCopyJson.addEventListener('click', () => {
      const val = $('#stringifyJsonInput')?.value;
      if (!val) { showToast('Nothing to copy', 'danger'); return; }
      copyText(val);
    });
    if (btnCopyStr) btnCopyStr.addEventListener('click', () => {
      const val = $('#stringifyStringOutput')?.value;
      if (!val) { showToast('Nothing to copy', 'danger'); return; }
      copyText(val);
    });
  }

  function doStringify() {
    const jsonInput = $('#stringifyJsonInput');
    const strOutput = $('#stringifyStringOutput');
    if (!jsonInput || !strOutput) return;

    const raw = jsonInput.value.trim();
    if (!raw) { showError('Enter JSON to stringify.'); return; }

    try {
      const parsed = JSON.parse(raw);
      strOutput.value = JSON.stringify(JSON.stringify(parsed));
      updateGutter(strOutput, $('#stringifyStrGutter'));
      hideError();
    } catch (e) {
      showError('Invalid JSON: ' + e.message.replace(/^JSON\.parse:\s*/, ''));
    }
  }

  function doParse() {
    const jsonInput = $('#stringifyJsonInput');
    const strOutput = $('#stringifyStringOutput');
    if (!jsonInput || !strOutput) return;

    const raw = strOutput.value.trim();
    if (!raw) { showError('Enter a stringified JSON string to parse.'); return; }

    try {
      let unquoted = raw;
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        unquoted = JSON.parse(raw);
      }

      const parsed = JSON.parse(unquoted);
      jsonInput.value = JSON.stringify(parsed, null, 2);
      updateGutter(jsonInput, $('#stringifyJsonGutter'));
      hideError();
    } catch (e) {
      showError('Invalid stringified JSON: ' + e.message.replace(/^JSON\.parse:\s*/, ''));
    }
  }

  function doClear() {
    const jsonInput = $('#stringifyJsonInput');
    const strOutput = $('#stringifyStringOutput');
    if (jsonInput) {
      jsonInput.value = '';
      updateGutter(jsonInput, $('#stringifyJsonGutter'));
    }
    if (strOutput) {
      strOutput.value = '';
      updateGutter(strOutput, $('#stringifyStrGutter'));
    }
    hideError();
  }

  function initDivider() {
    const divider = $('#stringifyDivider');
    const layout = $('#stringifyEditorLayout');
    const inputPane = $('#stringifyInputPane');
    const outputPane = $('#stringifyOutputPane');
    if (!divider || !layout || !inputPane || !outputPane) return;

    let isDragging = false;

    function onPointerDown(e) {
      isDragging = true;
      divider.classList.add('editor-divider--active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const rect = layout.getBoundingClientRect();
      const isVertical = window.innerWidth <= 768;

      if (isVertical) {
        const offset = e.clientY - rect.top;
        const pct = (offset / rect.height) * 100;
        const clamped = Math.max(20, Math.min(80, pct));
        inputPane.style.flex = 'none';
        outputPane.style.flex = 'none';
        inputPane.style.height = clamped + '%';
        outputPane.style.height = (100 - clamped) + '%';
      } else {
        const offset = e.clientX - rect.left;
        const pct = (offset / rect.width) * 100;
        const clamped = Math.max(20, Math.min(80, pct));
        inputPane.style.flex = 'none';
        outputPane.style.flex = 'none';
        inputPane.style.width = clamped + '%';
        outputPane.style.width = (100 - clamped) + '%';
      }
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      divider.classList.remove('editor-divider--active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    divider.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);

    divider.addEventListener('touchstart', e => {
      onPointerDown(e);
    }, { passive: false });
    document.addEventListener('touchmove', e => {
      if (isDragging) onPointerMove(e.touches[0]);
    }, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }

  function showError(msg) {
    const el = $('#stringifyError');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  function hideError() {
    const el = $('#stringifyError');
    if (el) el.style.display = 'none';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
