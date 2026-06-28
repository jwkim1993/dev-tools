var JSONFormatter = (() => {
  'use strict';

  function validate(str) {
    if (!str.trim()) return { valid: false, error: { message: 'Empty input', line: 1, column: 1 } };
    try {
      JSON.parse(str);
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: parseError(e, str) };
    }
  }

  function parseError(e, str) {
    const msg = e.message;
    let line = 1, column = 1;

    const posMatch = msg.match(/at position (\d+)/);
    const lcMatch = msg.match(/at line (\d+) column (\d+)/);

    if (lcMatch) {
      line = parseInt(lcMatch[1], 10);
      column = parseInt(lcMatch[2], 10);
    } else if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const before = str.substring(0, pos);
      line = (before.match(/\n/g) || []).length + 1;
      const lastNewline = before.lastIndexOf('\n');
      column = pos - lastNewline;
    } else {
      // V8 v12+ / Node 22+: "Unexpected token 'x', ..."context"... is not valid JSON"
      const tokenMatch = msg.match(/Unexpected token '(.)'/);
      if (tokenMatch && str) {
        const ch = tokenMatch[1];
        const badStr = msg.match(/,\s*"?\.{3}([\s\S]*?)\.{3}"?\s*is not valid/);
        if (badStr) {
          const snippet = badStr[1];
          const idx = str.indexOf(snippet);
          if (idx >= 0) {
            const realIdx = str.indexOf(ch, idx);
            if (realIdx >= 0) {
              const before = str.substring(0, realIdx);
              line = (before.match(/\n/g) || []).length + 1;
              const lastNewline = before.lastIndexOf('\n');
              column = realIdx - lastNewline;
            }
          }
        } else {
          const idx = str.indexOf(ch);
          if (idx >= 0) {
            const before = str.substring(0, idx);
            line = (before.match(/\n/g) || []).length + 1;
            const lastNewline = before.lastIndexOf('\n');
            column = idx - lastNewline;
          }
        }
      }
    }

    const cleanMsg = msg
      .replace(/^JSON\.parse:\s*/, '')
      .replace(/\s*at position \d+.*$/, '')
      .replace(/\s*at line \d+ column \d+.*$/, '')
      .replace(/,\s*"?\.{3}[\s\S]*?"?\s*is not valid JSON$/, '');

    return { message: cleanMsg, line, column };
  }

  function format(str, options = {}) {
    const indent = options.indent !== undefined ? options.indent : 2;
    const sortKeys = options.sortKeys || false;
    try {
      let obj = JSON.parse(str);
      if (sortKeys) obj = sortKeysDeep(obj);
      const result = JSON.stringify(obj, null, indent);
      return { result, error: null };
    } catch (e) {
      return { result: null, error: parseError(e, str) };
    }
  }

  function minify(str) {
    try {
      const obj = JSON.parse(str);
      return { result: JSON.stringify(obj), error: null };
    } catch (e) {
      return { result: null, error: parseError(e, str) };
    }
  }

  function getStats(str) {
    try {
      const obj = JSON.parse(str);
      const stats = {
        size: new Blob([str]).size,
        depth: 0,
        keyCount: 0,
        valueCount: 0,
        types: { string: 0, number: 0, boolean: 0, null: 0, object: 0, array: 0 }
      };
      walk(obj, 0, stats);
      return stats;
    } catch {
      return null;
    }
  }

  function walk(value, depth, stats) {
    if (depth > stats.depth) stats.depth = depth;
    if (value === null) {
      stats.types.null++;
      stats.valueCount++;
    } else if (Array.isArray(value)) {
      stats.types.array++;
      stats.valueCount++;
      value.forEach(item => walk(item, depth + 1, stats));
    } else if (typeof value === 'object') {
      stats.types.object++;
      stats.valueCount++;
      const keys = Object.keys(value);
      stats.keyCount += keys.length;
      keys.forEach(k => walk(value[k], depth + 1, stats));
    } else {
      stats.types[typeof value]++;
      stats.valueCount++;
    }
  }

  function syntaxHighlight(json) {
    return json.replace(/("(?:\\.|[^"\\])*")\s*:/g, '<span class="sh-key">$1</span>:')
      .replace(/:(\s*)("(?:\\.|[^"\\])*")/g, ':$1<span class="sh-string">$2</span>')
      .replace(/:(\s*)(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ':$1<span class="sh-number">$2</span>')
      .replace(/:(\s*)(true|false)/g, ':$1<span class="sh-boolean">$2</span>')
      .replace(/:(\s*)(null)/g, ':$1<span class="sh-null">$2</span>')
      .replace(/^(\s*"(?:\\.|[^"\\])*")(?!\s*:)/gm, '<span class="sh-string">$1</span>')
      .replace(/^(\s*)(-?\d+\.?\d*(?:[eE][+-]?\d+)?)(,?)$/gm, '$1<span class="sh-number">$2</span>$3')
      .replace(/^(\s*)(true|false)(,?)$/gm, '$1<span class="sh-boolean">$2</span>$3')
      .replace(/^(\s*)(null)(,?)$/gm, '$1<span class="sh-null">$2</span>$3');
  }

  function sortKeysDeep(obj) {
    if (Array.isArray(obj)) return obj.map(sortKeysDeep);
    if (obj !== null && typeof obj === 'object') {
      const sorted = {};
      Object.keys(obj).sort().forEach(k => { sorted[k] = sortKeysDeep(obj[k]); });
      return sorted;
    }
    return obj;
  }

  return { validate, format, minify, getStats, syntaxHighlight, sortKeysDeep };
})();
