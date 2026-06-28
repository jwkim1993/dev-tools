(() => {
  'use strict';

  const { $, $$, showToast, copyText, downloadFile, debounce, escapeHtml } = Utils;

  let currentTab = 'formatted';
  let outputMode = 'format'; // 'format' or 'minify'
  let lastFormattedOutput = '';
  let lastParsedData = null;

  const SAMPLE_JSON = JSON.stringify({
    "name": "JSON Prettier",
    "version": "1.0.0",
    "description": "A free online JSON formatter and validator",
    "features": ["format", "validate", "minify", "tree view", "statistics"],
    "author": {
      "name": "JSON Prettier Team",
      "website": "https://json-prettier.pages.dev"
    },
    "settings": {
      "indentation": 2,
      "sortKeys": false,
      "autoValidate": true
    },
    "stats": {
      "users": 10000,
      "rating": 4.8,
      "isOpenSource": true,
      "license": null
    },
    "tags": ["json", "formatter", "validator", "developer-tools"]
  }, null, 2);

  const LARGE_INPUT_THRESHOLD = 500 * 1024;

  function getFormatOptions() {
    const indentSelect = $('#indentSelect');
    const sortKeysCheck = $('#sortKeysCheck');
    let indent = indentSelect ? indentSelect.value : '2';
    if (indent === 'tab') indent = '\t';
    else indent = parseInt(indent, 10);
    return {
      indent,
      sortKeys: sortKeysCheck ? sortKeysCheck.checked : false
    };
  }

  function processOutput(input) {
    if (!input) input = Editor.getValue();
    if (!input.trim()) return;

    let result;
    if (outputMode === 'minify') {
      result = JSONFormatter.minify(input);
    } else {
      result = JSONFormatter.format(input, getFormatOptions());
    }

    if (result.error) {
      showError(result.error);
      return;
    }

    Editor.clearError();
    lastFormattedOutput = result.result;
    lastParsedData = JSON.parse(input);
    updateOutput();
    updateStatusBar(true);
  }

  function onClear() {
    Editor.clear();
    lastFormattedOutput = '';
    lastParsedData = null;
    clearOutput();
    updateStatusBar(null);
  }

  function onLoadSample() {
    Editor.setValue(SAMPLE_JSON);
  }

  function onCopyOutput() {
    if (!lastFormattedOutput) {
      showToast('No output to copy', 'danger');
      return;
    }
    copyText(lastFormattedOutput);
  }

  function onDownloadOutput() {
    if (!lastFormattedOutput) {
      showToast('No output to download', 'danger');
      return;
    }
    downloadFile(lastFormattedOutput, 'formatted.json');
    showToast('File downloaded');
  }

  function showError(error) {
    Editor.markError(error.line, error.message);
    Editor.scrollToLine(error.line);
    lastFormattedOutput = '';
    lastParsedData = null;
    const outputCode = $('#outputCode');
    if (outputCode) {
      outputCode.innerHTML = '<span style="color:var(--color-danger)">' +
        'Error at line ' + error.line + ', column ' + error.column + ':\n' +
        escapeHtml(error.message) + '</span>';
    }
    showOutputPanel('formatted');
    updateStatusBar(false, error);
  }

  function updateOutput() {
    showOutputPanel(currentTab);
  }

  function showOutputPanel(tab) {
    const formattedPanel = $('#panelFormatted');
    const treePanel = $('#panelTree');
    const statsPanel = $('#panelStats');
    const emptyState = $('#outputEmpty');

    if (emptyState) emptyState.style.display = 'none';

    if (formattedPanel) formattedPanel.style.display = tab === 'formatted' ? 'block' : 'none';
    if (treePanel) treePanel.style.display = tab === 'tree' ? 'block' : 'none';
    if (statsPanel) statsPanel.style.display = tab === 'stats' ? 'block' : 'none';

    if (tab === 'formatted' && lastFormattedOutput) {
      const outputCode = $('#outputCode');
      if (outputCode) {
        outputCode.innerHTML = JSONFormatter.syntaxHighlight(escapeHtml(lastFormattedOutput));
      }
    }

    if (tab === 'tree' && lastParsedData !== null) {
      const treeContainer = $('#treeContainer');
      if (treeContainer) TreeView.render(treeContainer, lastParsedData);
    }

    if (tab === 'stats') {
      renderStats();
    }
  }

  function clearOutput() {
    const outputCode = $('#outputCode');
    const treeContainer = $('#treeContainer');
    const statsContent = $('#statsContent');
    const emptyState = $('#outputEmpty');

    if (outputCode) outputCode.innerHTML = '';
    if (treeContainer) treeContainer.innerHTML = '';
    if (statsContent) statsContent.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';

    $$('#panelFormatted, #panelTree, #panelStats').forEach(el => el.style.display = 'none');
  }

  function renderStats() {
    const input = Editor.getValue();
    const statsContent = $('#statsContent');
    if (!statsContent) return;

    const stats = JSONFormatter.getStats(input);
    if (!stats) {
      statsContent.innerHTML = '<p style="color:var(--color-ink-muted);padding:var(--space-4)">Parse JSON first to see statistics.</p>';
      return;
    }

    statsContent.innerHTML =
      '<div class="stats-grid">' +
        statCard(Utils.formatBytes(stats.size), 'Size') +
        statCard(stats.depth, 'Max Depth') +
        statCard(stats.keyCount, 'Keys') +
        statCard(stats.valueCount, 'Values') +
      '</div>' +
      '<div class="stats-breakdown">' +
        '<div class="stats-breakdown__title">Type Breakdown</div>' +
        breakdownRow('Objects', stats.types.object) +
        breakdownRow('Arrays', stats.types.array) +
        breakdownRow('Strings', stats.types.string) +
        breakdownRow('Numbers', stats.types.number) +
        breakdownRow('Booleans', stats.types.boolean) +
        breakdownRow('Nulls', stats.types.null) +
      '</div>';
  }

  function statCard(value, label) {
    return '<div class="stat-card"><div class="stat-card__value">' + value + '</div><div class="stat-card__label">' + label + '</div></div>';
  }

  function breakdownRow(label, count) {
    return '<div class="stats-breakdown__row"><span class="stats-breakdown__label">' + label + '</span><span class="stats-breakdown__value">' + count + '</span></div>';
  }

  function updateStatusBar(valid, error) {
    const validityEl = $('#statusValidity');
    const sizeEl = $('#statusSize');

    if (!validityEl) return;

    if (valid === null) {
      validityEl.className = 'status-bar__item status-bar__validity--empty';
      validityEl.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg><span>Ready</span>';
    } else if (valid) {
      validityEl.className = 'status-bar__item status-bar__validity--valid';
      validityEl.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8.5l3.5 3.5 6.5-7"/></svg><span>Valid JSON</span>';
    } else {
      const errMsg = error ? 'Ln ' + error.line + ', Col ' + error.column + ': ' + error.message : 'Invalid JSON';
      validityEl.className = 'status-bar__item status-bar__validity--invalid';
      validityEl.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg><span>' + escapeHtml(errMsg) + '</span>';
    }

    if (sizeEl) {
      const input = Editor.getValue();
      sizeEl.textContent = Utils.formatBytes(new Blob([input]).size);
    }
  }

  function onRealtimeInput(value) {
    if (!value.trim()) {
      onClear();
      return;
    }

    if (value.length > LARGE_INPUT_THRESHOLD) {
      updateStatusBar(null);
      const validityEl = $('#statusValidity');
      if (validityEl) {
        validityEl.className = 'status-bar__item status-bar__validity--empty';
        validityEl.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg><span>Large input detected</span>';
      }
      return;
    }

    const validation = JSONFormatter.validate(value);
    if (validation.valid) {
      processOutput(value);
    } else {
      Editor.markError(validation.error.line, validation.error.message);
      lastFormattedOutput = '';
      lastParsedData = null;
      updateStatusBar(false, validation.error);
    }

    const sizeEl = $('#statusSize');
    if (sizeEl) sizeEl.textContent = Utils.formatBytes(new Blob([value]).size);
  }

  function initTabs() {
    $$('.tab-bar__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab-bar__tab').forEach(t => t.classList.remove('tab-bar__tab--active'));
        tab.classList.add('tab-bar__tab--active');
        currentTab = tab.dataset.tab;

        const emptyState = $('#outputEmpty');
        if (lastFormattedOutput || lastParsedData !== null) {
          if (emptyState) emptyState.style.display = 'none';
          showOutputPanel(currentTab);
        }
      });
    });
  }

  function initNav() {
    const toggle = $('#navToggle');
    const links = $('#navLinks');
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
  }

  function initDivider() {
    const divider = $('#editorDivider');
    const layout = $('#editorLayout');
    const inputPane = $('#inputPane');
    const outputPane = $('#outputPane');
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

  function initUrlModal() {
    const modal = $('#urlModal');
    const btnOpen = $('#btnLoadUrl');
    const btnCancel = $('#btnUrlCancel');
    const btnLoad = $('#btnUrlLoad');
    const input = $('#urlInput');
    if (!modal) return;

    function openModal() {
      modal.classList.add('modal--open');
      if (input) { input.value = ''; input.focus(); }
    }

    function closeModal() {
      modal.classList.remove('modal--open');
    }

    if (btnOpen) btnOpen.addEventListener('click', openModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    modal.querySelector('.modal__backdrop').addEventListener('click', closeModal);

    if (btnLoad) {
      btnLoad.addEventListener('click', () => {
        const url = input.value.trim();
        if (!url) return;
        loadFromUrl(url);
        closeModal();
      });
    }

    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { btnLoad.click(); }
        if (e.key === 'Escape') { closeModal(); }
      });
    }
  }

  async function loadFromUrl(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      Editor.setValue(text);
      showToast('Loaded from URL');
    } catch (e) {
      showToast('Failed to load: ' + e.message + '. Try pasting the JSON directly.', 'danger');
    }
  }

  function initTreeControls() {
    const btnExpand = $('#btnExpandAll');
    const btnCollapse = $('#btnCollapseAll');
    const container = $('#treeContainer');
    if (btnExpand) btnExpand.addEventListener('click', () => TreeView.expandAll(container));
    if (btnCollapse) btnCollapse.addEventListener('click', () => TreeView.collapseAll(container));
  }

  function initModeToggle() {
    $$('.mode-toggle__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.mode-toggle__btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        outputMode = btn.dataset.mode;
        if (lastParsedData !== null) processOutput();
      });
    });
  }

  function init() {
    initNav();
    Editor.init('inputTextarea', 'lineNumbers', 'inputEditor');
    Editor.onInputChange(debounce(onRealtimeInput, 200));
    Editor.onCursorChange(pos => {
      const cursorEl = $('#statusCursor');
      if (cursorEl) cursorEl.textContent = 'Ln ' + pos.line + ', Col ' + pos.column;
    });
    Editor.setupFileUpload('btnUpload', 'fileInput');

    initTabs();
    initModeToggle();
    initDivider();
    initUrlModal();
    initTreeControls();

    $('#btnClear').addEventListener('click', onClear);
    $('#btnSample').addEventListener('click', onLoadSample);
    $('#btnCopyOutput').addEventListener('click', onCopyOutput);
    $('#btnDownload').addEventListener('click', onDownloadOutput);

    $('#indentSelect').addEventListener('change', () => {
      if (lastParsedData !== null) processOutput();
    });
    $('#sortKeysCheck').addEventListener('change', () => {
      if (lastParsedData !== null) processOutput();
    });

    updateStatusBar(null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
