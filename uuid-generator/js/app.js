(() => {
  'use strict';

  const { $, $$, showToast, copyText, downloadFile, COPY_SVG } = Utils;

  let currentVersion = 'v4';
  let bulkUUIDs = [];

  function getFormatOptions() {
    return {
      uppercase: $('#caseSelect').value === 'upper',
      hyphens: $('#hyphensSelect').value === 'hyphens',
    };
  }

  function initVersionToggle() {
    const btns = $$('.version-toggle__btn');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        currentVersion = btn.dataset.version;
        generateSingle();
      });
    });

    const group = btns[0].parentElement;
    group.addEventListener('keydown', e => {
      const arr = [...btns];
      const idx = arr.indexOf(document.activeElement);
      if (idx < 0) return;
      let next;
      if (e.key === 'ArrowRight') next = arr[(idx + 1) % arr.length];
      else if (e.key === 'ArrowLeft') next = arr[(idx - 1 + arr.length) % arr.length];
      if (next) {
        e.preventDefault();
        next.focus();
        next.click();
      }
    });
  }

  function generateSingle() {
    const el = $('#singleUUID');
    el.textContent = UUID.generate(currentVersion, getFormatOptions());
  }

  async function generateBulk() {
    const count = Math.max(1, Math.min(10000, parseInt($('#bulkCount').value) || 10));
    $('#bulkCount').value = count;

    const container = $('#bulkResults');
    const bulkBox = $('#bulkContainer');
    if (bulkBox) bulkBox.classList.remove('bulk--empty');
    const empty = $('#bulkEmpty');
    if (empty) empty.remove();
    container.innerHTML = '';
    $('#bulkActions').style.display = 'none';
    $('#bulkCountLabel').textContent = `Generating ${count} UUIDs...`;

    bulkUUIDs = await UUID.generateBulk(currentVersion, count, getFormatOptions());

    const displayCount = Math.min(bulkUUIDs.length, 1000);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < displayCount; i++) {
      const chip = document.createElement('div');
      chip.className = 'uuid-chip';
      chip.innerHTML = `<span>${bulkUUIDs[i]}</span><button class="uuid-chip__copy" title="Copy" aria-label="Copy UUID">${COPY_SVG}</button>`;
      chip.querySelector('.uuid-chip__copy').addEventListener('click', e => {
        e.stopPropagation();
        copyText(bulkUUIDs[i]);
      });
      chip.addEventListener('click', () => copyText(bulkUUIDs[i]));
      fragment.appendChild(chip);
    }

    container.appendChild(fragment);

    const label = bulkUUIDs.length > displayCount
      ? `Showing ${displayCount} of ${bulkUUIDs.length} generated UUIDs. Use Copy All or Download for the complete set.`
      : `${bulkUUIDs.length} UUIDs generated`;
    $('#bulkCountLabel').textContent = label;
    $('#bulkActions').style.display = 'flex';
  }

  function onFormatChange() {
    generateSingle();
    if (bulkUUIDs.length > 0) {
      generateBulk();
    }
  }

  function init() {
    initVersionToggle();
    generateSingle();

    $('#btnGenerate').addEventListener('click', generateSingle);
    $('#btnCopy').addEventListener('click', () => copyText($('#singleUUID').textContent));
    $('#btnBulkGenerate').addEventListener('click', generateBulk);
    $('#btnCopyAll').addEventListener('click', () => {
      copyText(bulkUUIDs.join('\n'));
    });
    $('#btnDownload').addEventListener('click', () => {
      downloadFile(bulkUUIDs.join('\n'), `uuids-${currentVersion}-${bulkUUIDs.length}.txt`, 'text/plain');
    });
    $('#caseSelect').addEventListener('change', onFormatChange);
    $('#hyphensSelect').addEventListener('change', onFormatChange);

    $('#bulkCount').addEventListener('keydown', e => {
      if (e.key === 'Enter') generateBulk();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
