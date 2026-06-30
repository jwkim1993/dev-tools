(() => {
  'use strict';

  const { $, copyText, showToast, escapeHtml, debounce } = Utils;

  const originalInput = $('#originalInput');
  const modifiedInput = $('#modifiedInput');
  const diffBody = $('#diffBody');
  const statsBar = $('#diffStats');
  const btnCompare = $('#btnCompare');
  const btnClearAll = $('#btnClearAll');
  const btnSwap = $('#btnSwap');
  const btnCopyDiff = $('#btnCopyDiff');
  const btnSample = $('#btnSample');
  const origCounter = $('#origCounter');
  const modCounter = $('#modCounter');

  let viewMode = 'unified';
  let lastDiff = null;

  // --- LCS-based diff ---

  function diffLines(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const ops = lcs(oldLines, newLines);
    return { ops, oldLines, newLines };
  }

  function lcs(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const ops = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.push({ type: 'equal', oldIdx: i - 1, newIdx: j - 1 });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ type: 'add', newIdx: j - 1 });
        j--;
      } else {
        ops.push({ type: 'del', oldIdx: i - 1 });
        i--;
      }
    }
    ops.reverse();
    return ops;
  }

  // --- Inline char diff for modified lines ---

  function charDiff(oldStr, newStr) {
    const m = oldStr.length;
    const n = newStr.length;

    if (m * n > 500000) {
      return {
        oldHtml: '<span class="diff-char--del">' + escapeHtml(oldStr) + '</span>',
        newHtml: '<span class="diff-char--add">' + escapeHtml(newStr) + '</span>'
      };
    }

    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = oldStr[i - 1] === newStr[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const parts = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldStr[i - 1] === newStr[j - 1]) {
        parts.push({ type: 'eq', ch: oldStr[i - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        parts.push({ type: 'add', ch: newStr[j - 1] });
        j--;
      } else {
        parts.push({ type: 'del', ch: oldStr[i - 1] });
        i--;
      }
    }
    parts.reverse();

    let oldHtml = '', newHtml = '';
    let delBuf = '', addBuf = '', eqBuf = '';

    function flushDel() {
      if (delBuf) { oldHtml += '<span class="diff-char--del">' + escapeHtml(delBuf) + '</span>'; delBuf = ''; }
    }
    function flushAdd() {
      if (addBuf) { newHtml += '<span class="diff-char--add">' + escapeHtml(addBuf) + '</span>'; addBuf = ''; }
    }
    function flushEq() {
      if (eqBuf) { oldHtml += escapeHtml(eqBuf); newHtml += escapeHtml(eqBuf); eqBuf = ''; }
    }

    for (const p of parts) {
      if (p.type === 'eq') {
        flushDel(); flushAdd();
        eqBuf += p.ch;
      } else if (p.type === 'del') {
        flushEq(); flushAdd();
        delBuf += p.ch;
      } else {
        flushEq(); flushDel();
        addBuf += p.ch;
      }
    }
    flushEq(); flushDel(); flushAdd();

    return { oldHtml, newHtml };
  }

  // --- Render ---

  function computeDiff() {
    const oldText = originalInput.value;
    const newText = modifiedInput.value;

    if (!oldText && !newText) {
      renderEmpty();
      statsBar.style.display = 'none';
      lastDiff = null;
      return;
    }

    lastDiff = diffLines(oldText, newText);
    updateStats(lastDiff.ops);
    statsBar.style.display = '';

    if (viewMode === 'unified') {
      renderUnified(lastDiff);
    } else {
      renderSideBySide(lastDiff);
    }
  }

  function updateStats(ops) {
    let added = 0, deleted = 0, unchanged = 0;
    for (const op of ops) {
      if (op.type === 'add') added++;
      else if (op.type === 'del') deleted++;
      else unchanged++;
    }
    statsBar.innerHTML =
      '<span class="diff-stats__item diff-stats__item--add">+ ' + added + ' added</span>' +
      '<span class="diff-stats__item diff-stats__item--del">- ' + deleted + ' deleted</span>' +
      '<span class="diff-stats__item">' + unchanged + ' unchanged</span>' +
      '<span class="diff-stats__item">' + (added + deleted + unchanged) + ' total lines</span>';
  }

  function renderEmpty() {
    diffBody.innerHTML =
      '<div class="diff-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>' +
        '<div class="diff-empty__text">No diff to display</div>' +
        '<div class="diff-empty__hint">Paste or type text in both panels, then click Compare</div>' +
      '</div>';
  }

  function renderUnified(diff) {
    const { ops, oldLines, newLines } = diff;
    let html = '<table class="diff-table" role="grid">';

    const merged = mergeAdjacentOps(ops);

    for (const group of merged) {
      if (group.type === 'equal') {
        for (const op of group.ops) {
          html += row('ctx', op.oldIdx + 1, op.newIdx + 1, ' ', escapeHtml(oldLines[op.oldIdx]));
        }
      } else {
        const dels = group.ops.filter(o => o.type === 'del');
        const adds = group.ops.filter(o => o.type === 'add');
        const pairs = Math.min(dels.length, adds.length);

        for (let i = 0; i < pairs; i++) {
          const cd = charDiff(oldLines[dels[i].oldIdx], newLines[adds[i].newIdx]);
          html += row('del', dels[i].oldIdx + 1, '', '-', cd.oldHtml);
          html += row('add', '', adds[i].newIdx + 1, '+', cd.newHtml);
        }
        for (let i = pairs; i < dels.length; i++) {
          html += row('del', dels[i].oldIdx + 1, '', '-', escapeHtml(oldLines[dels[i].oldIdx]));
        }
        for (let i = pairs; i < adds.length; i++) {
          html += row('add', '', adds[i].newIdx + 1, '+', escapeHtml(newLines[adds[i].newIdx]));
        }
      }
    }

    html += '</table>';
    diffBody.innerHTML = html;
  }

  function renderSideBySide(diff) {
    const { ops, oldLines, newLines } = diff;
    let leftHtml = '<table class="diff-table" role="grid">';
    let rightHtml = '<table class="diff-table" role="grid">';

    const merged = mergeAdjacentOps(ops);

    for (const group of merged) {
      if (group.type === 'equal') {
        for (const op of group.ops) {
          leftHtml += sideRow('ctx', op.oldIdx + 1, escapeHtml(oldLines[op.oldIdx]));
          rightHtml += sideRow('ctx', op.newIdx + 1, escapeHtml(newLines[op.newIdx]));
        }
      } else {
        const dels = group.ops.filter(o => o.type === 'del');
        const adds = group.ops.filter(o => o.type === 'add');
        const max = Math.max(dels.length, adds.length);

        for (let i = 0; i < max; i++) {
          if (i < dels.length && i < adds.length) {
            const cd = charDiff(oldLines[dels[i].oldIdx], newLines[adds[i].newIdx]);
            leftHtml += sideRow('del', dels[i].oldIdx + 1, cd.oldHtml);
            rightHtml += sideRow('add', adds[i].newIdx + 1, cd.newHtml);
          } else if (i < dels.length) {
            leftHtml += sideRow('del', dels[i].oldIdx + 1, escapeHtml(oldLines[dels[i].oldIdx]));
            rightHtml += sideRow('empty', '', '');
          } else {
            leftHtml += sideRow('empty', '', '');
            rightHtml += sideRow('add', adds[i].newIdx + 1, escapeHtml(newLines[adds[i].newIdx]));
          }
        }
      }
    }

    leftHtml += '</table>';
    rightHtml += '</table>';

    diffBody.innerHTML =
      '<div class="diff-side">' +
        '<div class="diff-side__pane" id="sideLeft">' + leftHtml + '</div>' +
        '<div class="diff-side__pane" id="sideRight">' + rightHtml + '</div>' +
      '</div>';

    syncScroll();
  }

  function row(type, oldLn, newLn, sign, content) {
    return '<tr class="diff-line--' + type + '">' +
      '<td class="diff-table__ln">' + (oldLn || '') + '</td>' +
      '<td class="diff-table__ln">' + (newLn || '') + '</td>' +
      '<td class="diff-table__sign">' + sign + '</td>' +
      '<td class="diff-table__content">' + (content || '&nbsp;') + '</td>' +
    '</tr>';
  }

  function sideRow(type, ln, content) {
    if (type === 'empty') {
      return '<tr class="diff-line--ctx" style="opacity:0.3">' +
        '<td class="diff-table__ln"></td>' +
        '<td class="diff-table__content">&nbsp;</td>' +
      '</tr>';
    }
    return '<tr class="diff-line--' + type + '">' +
      '<td class="diff-table__ln">' + (ln || '') + '</td>' +
      '<td class="diff-table__content">' + (content || '&nbsp;') + '</td>' +
    '</tr>';
  }

  function mergeAdjacentOps(ops) {
    const groups = [];
    let cur = null;
    for (const op of ops) {
      const t = op.type === 'equal' ? 'equal' : 'change';
      if (cur && cur.type === t) {
        cur.ops.push(op);
      } else {
        cur = { type: t, ops: [op] };
        groups.push(cur);
      }
    }
    return groups;
  }

  function syncScroll() {
    const left = $('#sideLeft');
    const right = $('#sideRight');
    if (!left || !right) return;

    let syncing = false;
    function sync(source, target) {
      if (syncing) return;
      syncing = true;
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
      syncing = false;
    }
    left.addEventListener('scroll', () => sync(left, right));
    right.addEventListener('scroll', () => sync(right, left));
  }

  // --- Generate unified diff text ---

  function generateDiffText() {
    if (!lastDiff) return '';
    const { ops, oldLines, newLines } = lastDiff;
    const lines = [];
    lines.push('--- Original');
    lines.push('+++ Modified');
    for (const op of ops) {
      if (op.type === 'equal') {
        lines.push(' ' + oldLines[op.oldIdx]);
      } else if (op.type === 'del') {
        lines.push('-' + oldLines[op.oldIdx]);
      } else {
        lines.push('+' + newLines[op.newIdx]);
      }
    }
    return lines.join('\n');
  }

  // --- Counters ---

  function updateCounters() {
    const ol = originalInput.value ? originalInput.value.split('\n').length : 0;
    const ml = modifiedInput.value ? modifiedInput.value.split('\n').length : 0;
    origCounter.textContent = ol + ' lines';
    modCounter.textContent = ml + ' lines';
  }

  // --- Sample data ---

  const SAMPLE_ORIGINAL = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

function add(a, b) {
  return a + b;
}

// Main
const result = add(1, 2);
console.log(result);`;

  const SAMPLE_MODIFIED = `function greet(name, greeting = "Hello") {
  console.log(greeting + ", " + name + "!");
  return true;
}

function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Arguments must be numbers');
  }
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// Main
const result = add(1, 2);
const diff = subtract(5, 3);
console.log(result, diff);`;

  // --- Events ---

  btnCompare.addEventListener('click', () => {
    computeDiff();
    updateCounters();
  });

  btnClearAll.addEventListener('click', () => {
    originalInput.value = '';
    modifiedInput.value = '';
    renderEmpty();
    statsBar.style.display = 'none';
    lastDiff = null;
    updateCounters();
  });

  btnSwap.addEventListener('click', () => {
    const tmp = originalInput.value;
    originalInput.value = modifiedInput.value;
    modifiedInput.value = tmp;
    updateCounters();
    if (lastDiff) computeDiff();
  });

  btnCopyDiff.addEventListener('click', () => {
    const text = generateDiffText();
    if (text) {
      copyText(text);
    } else {
      showToast('No diff to copy', 'danger');
    }
  });

  btnSample.addEventListener('click', () => {
    originalInput.value = SAMPLE_ORIGINAL;
    modifiedInput.value = SAMPLE_MODIFIED;
    updateCounters();
    computeDiff();
  });

  // View mode buttons
  document.querySelectorAll('.diff-tab__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-tab__btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      viewMode = btn.dataset.mode;
      if (lastDiff) computeDiff();
    });
  });

  // Paste buttons
  $('#btnPasteOrig').addEventListener('click', async () => {
    try {
      originalInput.value = await navigator.clipboard.readText();
      updateCounters();
    } catch { showToast('Clipboard access denied', 'danger'); }
  });
  $('#btnPasteMod').addEventListener('click', async () => {
    try {
      modifiedInput.value = await navigator.clipboard.readText();
      updateCounters();
    } catch { showToast('Clipboard access denied', 'danger'); }
  });
  $('#btnCopyOrig').addEventListener('click', () => copyText(originalInput.value));
  $('#btnCopyMod').addEventListener('click', () => copyText(modifiedInput.value));

  // Auto-update counters on input
  originalInput.addEventListener('input', updateCounters);
  modifiedInput.addEventListener('input', updateCounters);

  // Keyboard shortcut: Ctrl+Enter to compare
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      computeDiff();
      updateCounters();
    }
  });

  // Init
  renderEmpty();
  updateCounters();
})();
