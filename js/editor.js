var Editor = (() => {
  'use strict';

  let textarea, gutter, editorEl;
  let inputCallback = null;
  let cursorCallback = null;

  function init(textareaId, gutterId, editorId) {
    textarea = document.getElementById(textareaId);
    gutter = document.getElementById(gutterId);
    editorEl = document.getElementById(editorId);
    if (!textarea || !gutter) return;

    textarea.addEventListener('input', onInput);
    textarea.addEventListener('scroll', syncScroll);
    textarea.addEventListener('click', onCursorMove);
    textarea.addEventListener('keyup', onCursorMove);
    textarea.addEventListener('focus', onCursorMove);

    setupDragDrop();
    updateLineNumbers();
  }

  function getValue() {
    return textarea ? textarea.value : '';
  }

  function setValue(str) {
    if (!textarea) return;
    textarea.value = str;
    updateLineNumbers();
    if (inputCallback) inputCallback(str);
  }

  function onInputChange(callback) {
    inputCallback = callback;
  }

  function onCursorChange(callback) {
    cursorCallback = callback;
  }

  function onInput() {
    updateLineNumbers();
    if (inputCallback) inputCallback(textarea.value);
  }

  function onCursorMove() {
    if (!cursorCallback || !textarea) return;
    cursorCallback(getCursorPosition());
  }

  function updateLineNumbers() {
    if (!textarea || !gutter) return;
    const lines = textarea.value.split('\n').length;
    const currentCount = gutter.children.length;

    if (lines === currentCount) return;

    if (lines > currentCount) {
      const frag = document.createDocumentFragment();
      for (let i = currentCount + 1; i <= lines; i++) {
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

  function syncScroll() {
    if (gutter && textarea) {
      gutter.scrollTop = textarea.scrollTop;
    }
  }

  function markError(line, message) {
    clearError();
    if (!gutter) return;
    const lineEl = gutter.children[line - 1];
    if (lineEl) {
      lineEl.classList.add('editor__gutter-line--error');
      lineEl.title = message || '';
    }
  }

  function clearError() {
    if (!gutter) return;
    const errors = gutter.querySelectorAll('.editor__gutter-line--error');
    errors.forEach(el => {
      el.classList.remove('editor__gutter-line--error');
      el.title = '';
    });
  }

  function getCursorPosition() {
    if (!textarea) return { line: 1, column: 1 };
    const pos = textarea.selectionStart;
    const before = textarea.value.substring(0, pos);
    const line = (before.match(/\n/g) || []).length + 1;
    const lastNewline = before.lastIndexOf('\n');
    const column = pos - lastNewline;
    return { line, column };
  }

  function scrollToLine(lineNum) {
    if (!textarea) return;
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
    textarea.scrollTop = (lineNum - 1) * lineHeight;
  }

  function setupDragDrop() {
    if (!editorEl) return;
    let dragCounter = 0;

    editorEl.addEventListener('dragenter', e => {
      e.preventDefault();
      dragCounter++;
      editorEl.classList.add('editor--dragover');
    });

    editorEl.addEventListener('dragleave', e => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) editorEl.classList.remove('editor--dragover');
    });

    editorEl.addEventListener('dragover', e => {
      e.preventDefault();
    });

    editorEl.addEventListener('drop', e => {
      e.preventDefault();
      dragCounter = 0;
      editorEl.classList.remove('editor--dragover');
      const file = e.dataTransfer.files[0];
      if (file) {
        Utils.readFile(file).then(text => setValue(text)).catch(() => {
          Utils.showToast('Failed to read file', 'danger');
        });
      }
    });
  }

  function setupFileUpload(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) {
        Utils.readFile(file).then(text => setValue(text)).catch(() => {
          Utils.showToast('Failed to read file', 'danger');
        });
        input.value = '';
      }
    });
  }

  function clear() {
    if (!textarea) return;
    textarea.value = '';
    updateLineNumbers();
    clearError();
  }

  return {
    init, getValue, setValue, onInputChange, onCursorChange,
    markError, clearError, getCursorPosition, scrollToLine,
    setupFileUpload, clear
  };
})();
