(() => {
  'use strict';

  const $ = Utils.$;
  const escapeHtml = Utils.escapeHtml;
  const debounce = Utils.debounce;

  const patternInput = $('#regexInput');
  const testInput = $('#testInput');
  const replaceInput = $('#replaceInput');
  const backdrop = $('#highlightBackdrop');
  const errorBox = $('#regexError');
  const matchList = $('#matchList');
  const statMatches = $('#statMatches');
  const statGroups = $('#statGroups');
  const regexBar = $('#regexBar');
  const flagsDisplay = $('#flagsDisplay');
  const replaceOutput = $('#replaceOutput');
  const btnCopyReplace = $('#btnCopyReplace');

  const FLAGS = ['g', 'i', 'm', 's', 'u', 'y'];
  const flagBtns = {};
  FLAGS.forEach(f => { flagBtns[f] = $('#flag-' + f); });

  function getFlags() {
    return FLAGS.filter(f => flagBtns[f].classList.contains('flag-btn--active')).join('');
  }

  function buildRegex() {
    const src = patternInput.value;
    if (!src) return null;
    try {
      const re = new RegExp(src, getFlags());
      return re;
    } catch (e) {
      return { error: e.message };
    }
  }

  function updateFlagsDisplay() {
    flagsDisplay.textContent = getFlags() || ' ';
  }

  function showError(msg) {
    errorBox.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 10.5v.5"/></svg>' +
      '<span>' + escapeHtml(msg) + '</span>';
    errorBox.classList.add('regex-error--visible');
    regexBar.classList.add('regex-input__field-wrap--error');
  }

  function clearError() {
    errorBox.classList.remove('regex-error--visible');
    regexBar.classList.remove('regex-input__field-wrap--error');
  }

  function highlightMatches(text, matches) {
    if (!matches.length) {
      backdrop.innerHTML = escapeHtml(text);
      return;
    }

    let html = '';
    let lastIndex = 0;
    matches.forEach(m => {
      if (m.start > lastIndex) {
        html += escapeHtml(text.slice(lastIndex, m.start));
      }
      html += '<mark>' + escapeHtml(m.value) + '</mark>';
      lastIndex = m.end;
    });
    if (lastIndex < text.length) {
      html += escapeHtml(text.slice(lastIndex));
    }
    backdrop.innerHTML = html;
  }

  function renderMatches(matches) {
    if (!matches.length) {
      matchList.innerHTML = '<div class="match-list__empty">No matches found. Type a pattern and test string above.</div>';
      return;
    }
    matchList.innerHTML = matches.map((m, i) => {
      let groupsHtml = '';
      if (m.groups && m.groups.length) {
        groupsHtml = '<div class="match-item__groups">' +
          m.groups.map(g =>
            '<div class="match-item__group">' +
              '<span class="match-item__group-label">' + escapeHtml(g.name) + ':</span>' +
              '<span class="match-item__group-value">' + escapeHtml(g.value) + '</span>' +
            '</div>'
          ).join('') +
          '</div>';
      }
      return '<div class="match-item">' +
        '<span class="match-item__index">' + (i + 1) + '</span>' +
        '<div class="match-item__body">' +
          '<div class="match-item__value">' + escapeHtml(m.value) + '</div>' +
          '<div class="match-item__meta">Index ' + m.start + '–' + m.end + ' (length ' + m.value.length + ')</div>' +
          groupsHtml +
        '</div>' +
      '</div>';
    }).join('');
  }

  function updateReplace(re, text) {
    if (!re || !replaceInput) return;
    const rep = replaceInput.value;
    try {
      const result = text.replace(re, rep);
      replaceOutput.textContent = result;
    } catch {
      replaceOutput.textContent = text;
    }
  }

  function execute() {
    const text = testInput.value;
    const result = buildRegex();

    if (!patternInput.value) {
      clearError();
      backdrop.innerHTML = escapeHtml(text);
      statMatches.textContent = '0';
      statGroups.textContent = '0';
      renderMatches([]);
      replaceOutput.textContent = text;
      return;
    }

    if (result && result.error) {
      showError(result.error);
      backdrop.innerHTML = escapeHtml(text);
      statMatches.textContent = '0';
      statGroups.textContent = '0';
      renderMatches([]);
      replaceOutput.textContent = text;
      return;
    }

    clearError();

    if (!result || !text) {
      backdrop.innerHTML = escapeHtml(text);
      statMatches.textContent = '0';
      statGroups.textContent = '0';
      renderMatches([]);
      replaceOutput.textContent = text;
      return;
    }

    const matches = [];
    const isGlobal = result.flags.includes('g');
    const maxIter = 5000;

    if (isGlobal) {
      let m;
      let count = 0;
      result.lastIndex = 0;
      while ((m = result.exec(text)) !== null && count < maxIter) {
        const groups = [];
        if (m.groups) {
          for (const [name, val] of Object.entries(m.groups)) {
            groups.push({ name: name, value: val !== undefined ? val : '' });
          }
        }
        for (let gi = 1; gi < m.length; gi++) {
          const named = m.groups ? Object.values(m.groups).includes(m[gi]) : false;
          if (!named) {
            groups.push({ name: 'Group ' + gi, value: m[gi] !== undefined ? m[gi] : '' });
          }
        }
        matches.push({
          value: m[0],
          start: m.index,
          end: m.index + m[0].length,
          groups: groups
        });
        if (m[0].length === 0) {
          result.lastIndex++;
        }
        count++;
      }
    } else {
      const m = result.exec(text);
      if (m) {
        const groups = [];
        if (m.groups) {
          for (const [name, val] of Object.entries(m.groups)) {
            groups.push({ name: name, value: val !== undefined ? val : '' });
          }
        }
        for (let gi = 1; gi < m.length; gi++) {
          const named = m.groups ? Object.values(m.groups).includes(m[gi]) : false;
          if (!named) {
            groups.push({ name: 'Group ' + gi, value: m[gi] !== undefined ? m[gi] : '' });
          }
        }
        matches.push({
          value: m[0],
          start: m.index,
          end: m.index + m[0].length,
          groups: groups
        });
      }
    }

    const totalGroups = matches.reduce((sum, m) => sum + m.groups.length, 0);
    statMatches.textContent = matches.length;
    statGroups.textContent = totalGroups;

    highlightMatches(text, matches);
    renderMatches(matches);
    updateReplace(result, text);
  }

  const debouncedExecute = debounce(execute, 80);

  patternInput.addEventListener('input', debouncedExecute);
  testInput.addEventListener('input', () => {
    debouncedExecute();
    syncScroll();
  });
  replaceInput.addEventListener('input', () => {
    const re = buildRegex();
    if (re && !re.error) updateReplace(re, testInput.value);
  });

  testInput.addEventListener('scroll', syncScroll);
  function syncScroll() {
    backdrop.scrollTop = testInput.scrollTop;
    backdrop.scrollLeft = testInput.scrollLeft;
  }

  FLAGS.forEach(f => {
    flagBtns[f].addEventListener('click', () => {
      flagBtns[f].classList.toggle('flag-btn--active');
      flagBtns[f].setAttribute('aria-pressed',
        flagBtns[f].classList.contains('flag-btn--active'));
      updateFlagsDisplay();
      execute();
    });
  });

  // Presets
  const PRESETS = {
    'Email': { pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', flags: 'gi', test: 'Contact us at support@example.com or sales@company.org for inquiries.\nPersonal emails like john.doe+tag@gmail.com also work.' },
    'URL': { pattern: 'https?://[\\w\\-]+(\\.[\\w\\-]+)+[\\w\\-.,@?^=%&:/~+#]*', flags: 'gi', test: 'Visit https://www.example.com/path?q=search or http://api.service.io/v2/data for more info.\nDocs at https://docs.example.com/guide#section-1' },
    'IP Address': { pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b', flags: 'g', test: 'Server IPs: 192.168.1.1, 10.0.0.255, 172.16.0.1\nInvalid: 256.1.2.3, 192.168.1.999' },
    'Date': { pattern: '\\b\\d{4}[\\-/]\\d{2}[\\-/]\\d{2}\\b', flags: 'g', test: 'Released on 2024-03-15 and updated 2024/12/01.\nNext release: 2025-06-30.' },
    'Hex Color': { pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'gi', test: 'Colors: #FF5733, #0078D4, #fff, #a1b2c3\nInvalid: #xyz, #12345' },
    'Phone': { pattern: '\\+?\\d{1,3}[\\s\\-]?\\(?\\d{1,4}\\)?[\\s\\-]?\\d{1,4}[\\s\\-]?\\d{1,9}', flags: 'g', test: 'Call +1 (555) 123-4567 or +44 20 7946 0958.\nLocal: 010-1234-5678' },
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      const preset = PRESETS[key];
      if (!preset) return;
      patternInput.value = preset.pattern;
      testInput.value = preset.test;
      FLAGS.forEach(f => {
        const active = preset.flags.includes(f);
        flagBtns[f].classList.toggle('flag-btn--active', active);
        flagBtns[f].setAttribute('aria-pressed', active);
      });
      updateFlagsDisplay();
      execute();
    });
  });

  // Clear
  $('#btnClear').addEventListener('click', () => {
    patternInput.value = '';
    testInput.value = '';
    replaceInput.value = '';
    FLAGS.forEach(f => {
      const isG = f === 'g';
      flagBtns[f].classList.toggle('flag-btn--active', isG);
      flagBtns[f].setAttribute('aria-pressed', isG);
    });
    updateFlagsDisplay();
    execute();
    patternInput.focus();
  });

  // Copy
  btnCopyReplace.addEventListener('click', () => {
    Utils.copyText(replaceOutput.textContent);
  });

  // Reference toggle
  const refToggle = $('#refToggle');
  const refGrid = $('#refGrid');
  refToggle.addEventListener('click', () => {
    const open = refGrid.classList.toggle('ref-grid--open');
    refToggle.classList.toggle('ref-toggle--open', open);
    refToggle.setAttribute('aria-expanded', open);
  });

  // Reference row click → insert into pattern
  document.querySelectorAll('.ref-row').forEach(row => {
    row.addEventListener('click', () => {
      const token = row.dataset.token;
      if (!token) return;
      const start = patternInput.selectionStart;
      const end = patternInput.selectionEnd;
      const val = patternInput.value;
      patternInput.value = val.slice(0, start) + token + val.slice(end);
      patternInput.selectionStart = patternInput.selectionEnd = start + token.length;
      patternInput.focus();
      execute();
    });
  });

  // Init default flags
  flagBtns['g'].classList.add('flag-btn--active');
  flagBtns['g'].setAttribute('aria-pressed', 'true');

  execute();
})();
