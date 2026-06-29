(() => {
  'use strict';

  const { $, showToast, copyText, debounce } = Utils;

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const FIELD_DEFS = [
    { name: 'Minute', min: 0, max: 59 },
    { name: 'Hour', min: 0, max: 23 },
    { name: 'Day of Month', min: 1, max: 31 },
    { name: 'Month', min: 1, max: 12 },
    { name: 'Day of Week', min: 0, max: 6 },
  ];

  const PRESETS = [
    { expr: '* * * * *', label: 'Every minute' },
    { expr: '*/5 * * * *', label: 'Every 5 minutes' },
    { expr: '*/15 * * * *', label: 'Every 15 minutes' },
    { expr: '*/30 * * * *', label: 'Every 30 minutes' },
    { expr: '0 * * * *', label: 'Every hour' },
    { expr: '0 */2 * * *', label: 'Every 2 hours' },
    { expr: '0 */6 * * *', label: 'Every 6 hours' },
    { expr: '0 */12 * * *', label: 'Every 12 hours' },
    { expr: '0 0 * * *', label: 'Every day at midnight' },
    { expr: '0 9 * * *', label: 'Every day at 9:00 AM' },
    { expr: '0 9 * * 1-5', label: 'Weekdays at 9:00 AM' },
    { expr: '0 0 * * 0', label: 'Every Sunday at midnight' },
    { expr: '0 0 1 * *', label: '1st of every month' },
    { expr: '0 0 1 1 *', label: 'Every January 1st' },
    { expr: '30 4 * * *', label: 'Every day at 4:30 AM' },
    { expr: '0 22 * * 1-5', label: 'Weekdays at 10:00 PM' },
  ];

  // --- CRON PARSER ---

  function parseField(field, min, max) {
    const values = new Set();
    const parts = field.split(',');
    for (const part of parts) {
      if (part === '*') {
        for (let i = min; i <= max; i++) values.add(i);
      } else if (part.includes('/')) {
        const [range, stepStr] = part.split('/');
        const step = parseInt(stepStr, 10);
        if (isNaN(step) || step <= 0) throw new Error(`Invalid step value: ${stepStr}`);
        let start = min, end = max;
        if (range !== '*') {
          if (range.includes('-')) {
            [start, end] = range.split('-').map(Number);
          } else {
            start = parseInt(range, 10);
          }
        }
        if (isNaN(start) || isNaN(end)) throw new Error(`Invalid range: ${range}`);
        for (let i = start; i <= end; i += step) values.add(i);
      } else if (part.includes('-')) {
        const [s, e] = part.split('-').map(Number);
        if (isNaN(s) || isNaN(e)) throw new Error(`Invalid range: ${part}`);
        const lo = Math.min(s, e), hi = Math.max(s, e);
        for (let i = lo; i <= hi; i++) values.add(i);
      } else {
        const val = parseInt(part, 10);
        if (isNaN(val)) throw new Error(`Invalid value: ${part}`);
        values.add(val);
      }
    }
    for (const v of values) {
      if (v < min || v > max) throw new Error(`Value ${v} out of range (${min}-${max})`);
    }
    return [...values].sort((a, b) => a - b);
  }

  function parseCron(expr) {
    const trimmed = expr.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Expected 5 fields, got ${parts.length}. Format: minute hour day-of-month month day-of-week`);
    }
    return {
      raw: parts,
      minutes: parseField(parts[0], 0, 59),
      hours: parseField(parts[1], 0, 23),
      daysOfMonth: parseField(parts[2], 1, 31),
      months: parseField(parts[3], 1, 12),
      daysOfWeek: parseField(parts[4], 0, 6),
    };
  }

  // --- DESCRIPTION GENERATOR ---

  function describeField(values, min, max, names) {
    if (values.length === (max - min + 1)) return null;
    if (names) {
      return values.map(v => names[v]).join(', ');
    }
    if (values.length === 1) return String(values[0]);
    const ranges = [];
    let i = 0;
    while (i < values.length) {
      let j = i;
      while (j < values.length - 1 && values[j + 1] === values[j] + 1) j++;
      if (j - i >= 2) {
        ranges.push(`${values[i]}-${values[j]}`);
      } else {
        for (let k = i; k <= j; k++) ranges.push(String(values[k]));
      }
      i = j + 1;
    }
    return ranges.join(', ');
  }

  function describeCron(parsed) {
    const { minutes, hours, daysOfMonth, months, daysOfWeek } = parsed;

    const allMin = minutes.length === 60;
    const allHr = hours.length === 24;
    const allDom = daysOfMonth.length === 31;
    const allMon = months.length === 12;
    const allDow = daysOfWeek.length === 7;

    const parts = [];

    if (allMin && allHr && allDom && allMon && allDow) {
      return 'Every minute';
    }

    if (minutes.length === 1 && minutes[0] === 0 && allHr && allDom && allMon && allDow) {
      return 'Every hour, at minute 0';
    }

    if (!allMin) {
      if (minutes.length === 1) {
        parts.push(`at minute ${minutes[0]}`);
      } else {
        const step = checkStep(minutes, 0, 59);
        if (step) {
          parts.push(`every ${step} minutes`);
        } else {
          parts.push(`at minutes ${describeField(minutes, 0, 59)}`);
        }
      }
    }

    if (!allHr) {
      if (hours.length === 1) {
        const h = hours[0];
        const ampm = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
        if (minutes.length === 1) {
          const m = String(minutes[0]).padStart(2, '0');
          const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
          const ap = h < 12 ? 'AM' : 'PM';
          parts.length = 0;
          parts.push(`at ${hr}:${m} ${ap}`);
        } else {
          parts.push(`during the ${ampm.replace(':00', '')} hour`);
        }
      } else {
        const step = checkStep(hours, 0, 23);
        if (step) {
          parts.push(`every ${step} hours`);
        } else {
          parts.push(`at hours ${describeField(hours, 0, 23)}`);
        }
      }
    }

    if (!allDow) {
      if (daysOfWeek.length === 5 && daysOfWeek[0] === 1 && daysOfWeek[4] === 5) {
        parts.push('on weekdays');
      } else if (daysOfWeek.length === 2 && daysOfWeek[0] === 0 && daysOfWeek[1] === 6) {
        parts.push('on weekends');
      } else {
        parts.push(`on ${describeField(daysOfWeek, 0, 6, DAYS)}`);
      }
    }

    if (!allDom) {
      parts.push(`on day ${describeField(daysOfMonth, 1, 31)} of the month`);
    }

    if (!allMon) {
      parts.push(`in ${describeField(months, 1, 12, MONTHS)}`);
    }

    if (parts.length === 0) return 'Every minute';

    let desc = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    for (let i = 1; i < parts.length; i++) {
      desc += ', ' + parts[i];
    }
    return desc;
  }

  function checkStep(values, min, max) {
    if (values.length < 2) return null;
    const step = values[1] - values[0];
    if (step <= 1) return null;
    if (values[0] !== min) return null;
    for (let i = 2; i < values.length; i++) {
      if (values[i] - values[i - 1] !== step) return null;
    }
    const expected = Math.floor((max - min) / step) + 1;
    if (values.length !== expected) return null;
    return step;
  }

  function describeFieldMeaning(fieldStr, fieldIndex) {
    if (fieldStr === '*') return 'Every value';
    const def = FIELD_DEFS[fieldIndex];
    try {
      const values = parseField(fieldStr, def.min, def.max);
      if (fieldIndex === 4) {
        return values.map(v => DAYS_SHORT[v]).join(', ');
      }
      if (fieldIndex === 3) {
        return values.map(v => MONTHS_SHORT[v]).join(', ');
      }
      if (fieldStr.includes('/')) return `Every ${fieldStr.split('/')[1]} (from ${values[0]})`;
      if (values.length === 1) return String(values[0]);
      return values.join(', ');
    } catch {
      return 'Invalid';
    }
  }

  // --- NEXT EXECUTION CALCULATOR ---

  function getNextExecutions(parsed, count, fromDate) {
    const results = [];
    const d = new Date(fromDate || Date.now());
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);

    const maxIter = 525960;
    let iter = 0;

    while (results.length < count && iter < maxIter) {
      iter++;
      if (!parsed.months.includes(d.getMonth() + 1)) {
        d.setMonth(d.getMonth() + 1, 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      if (!parsed.daysOfMonth.includes(d.getDate()) || !parsed.daysOfWeek.includes(d.getDay())) {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      if (!parsed.hours.includes(d.getHours())) {
        d.setHours(d.getHours() + 1, 0, 0, 0);
        continue;
      }
      if (!parsed.minutes.includes(d.getMinutes())) {
        d.setMinutes(d.getMinutes() + 1, 0, 0);
        continue;
      }
      results.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    }
    return results;
  }

  function formatDateTime(date) {
    const days = DAYS_SHORT;
    const pad = n => String(n).padStart(2, '0');
    return `${days[date.getDay()]} ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function relativeTime(date) {
    const now = Date.now();
    const diff = date.getTime() - now;
    if (diff < 0) return 'past';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'less than a minute';
    if (mins < 60) return `in ${mins} minute${mins === 1 ? '' : 's'}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) {
      const rm = mins % 60;
      return rm > 0 ? `in ${hrs}h ${rm}m` : `in ${hrs} hour${hrs === 1 ? '' : 's'}`;
    }
    const d = Math.floor(hrs / 24);
    const rh = hrs % 24;
    return rh > 0 ? `in ${d}d ${rh}h` : `in ${d} day${d === 1 ? '' : 's'}`;
  }

  // --- MODE SWITCHING ---

  const tabBtns = document.querySelectorAll('.cron-tab__btn');
  const parseSection = $('#parseSection');
  const buildSection = $('#buildSection');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const mode = btn.dataset.mode;
      parseSection.style.display = mode === 'parse' ? '' : 'none';
      buildSection.style.display = mode === 'build' ? '' : 'none';
    });
  });

  // --- PARSE MODE ---

  const cronInput = $('#cronInput');
  const parseError = $('#parseError');
  const parseResult = $('#parseResult');
  const descText = $('#descText');
  const fieldsGrid = $('#fieldsGrid');
  const nextList = $('#nextList');
  const presetsGrid = $('#presetsGrid');
  const btnCopy = $('#btnCopy');
  const btnClear = $('#btnClear');

  function renderPresets() {
    presetsGrid.innerHTML = PRESETS.map(p =>
      `<button class="cron-preset" data-expr="${p.expr}">
        <span class="cron-preset__expr">${p.expr}</span>
        <span class="cron-preset__label">${p.label}</span>
      </button>`
    ).join('');

    presetsGrid.addEventListener('click', e => {
      const btn = e.target.closest('.cron-preset');
      if (!btn) return;
      cronInput.value = btn.dataset.expr;
      handleParse();
    });
  }

  function handleParse() {
    const val = cronInput.value.trim();
    if (!val) {
      parseError.style.display = 'none';
      parseResult.style.display = 'none';
      return;
    }
    try {
      const parsed = parseCron(val);
      parseError.style.display = 'none';
      parseResult.style.display = '';

      descText.textContent = describeCron(parsed);

      fieldsGrid.innerHTML = parsed.raw.map((f, i) =>
        `<div class="cron-field">
          <div class="cron-field__value">${Utils.escapeHtml(f)}</div>
          <div class="cron-field__name">${FIELD_DEFS[i].name}</div>
          <div class="cron-field__meaning">${describeFieldMeaning(f, i)}</div>
        </div>`
      ).join('');

      const execs = getNextExecutions(parsed, 10);
      nextList.innerHTML = execs.map(d =>
        `<li class="cron-next__item">
          <span class="cron-next__time">${formatDateTime(d)}</span>
          <span class="cron-next__relative">${relativeTime(d)}</span>
        </li>`
      ).join('');
      if (execs.length === 0) {
        nextList.innerHTML = '<li class="cron-next__item"><span class="cron-next__time">No executions found within the next year</span></li>';
      }
    } catch (err) {
      parseError.textContent = err.message;
      parseError.style.display = '';
      parseResult.style.display = 'none';
    }
  }

  cronInput.addEventListener('input', debounce(handleParse, 200));

  btnCopy.addEventListener('click', () => {
    const val = cronInput.value.trim();
    if (val) copyText(val);
  });

  btnClear.addEventListener('click', () => {
    cronInput.value = '';
    parseError.style.display = 'none';
    parseResult.style.display = 'none';
  });

  renderPresets();

  // --- BUILD MODE ---

  const builderFields = [
    { id: 'minute', label: 'Minute', min: 0, max: 59 },
    { id: 'hour', label: 'Hour', min: 0, max: 23 },
    { id: 'dom', label: 'Day of Month', min: 1, max: 31 },
    { id: 'month', label: 'Month', min: 1, max: 12, names: MONTHS_SHORT.slice(1) },
    { id: 'dow', label: 'Day of Week', min: 0, max: 6, names: DAYS_SHORT },
  ];

  const builderState = builderFields.map(() => ({ type: 'every', values: [], step: '', rangeStart: '', rangeEnd: '' }));

  const builderBody = $('#builderBody');
  const buildOutput = $('#buildOutput');
  const buildDesc = $('#buildDesc');
  const buildNextList = $('#buildNextList');
  const btnBuildCopy = $('#btnBuildCopy');
  const btnBuildParse = $('#btnBuildParse');

  function renderBuilder() {
    builderBody.innerHTML = builderFields.map((field, idx) => {
      const state = builderState[idx];
      const count = field.max - field.min + 1;
      let valGrid = '';
      if (count <= 31) {
        valGrid = '<div class="cron-val-grid">';
        for (let v = field.min; v <= field.max; v++) {
          const label = field.names ? field.names[v - field.min] : String(v);
          const sel = state.values.includes(v) ? ' cron-val-grid__item--selected' : '';
          valGrid += `<button class="cron-val-grid__item${sel}" data-field="${idx}" data-val="${v}" type="button">${label}</button>`;
        }
        valGrid += '</div>';
      }

      let detail = '';
      if (state.type === 'every') {
        detail = `<div class="cron-builder-card__summary">All values (${field.min}-${field.max})</div>`;
      } else if (state.type === 'specific') {
        detail = valGrid;
      } else if (state.type === 'range') {
        detail = `<div class="cron-range-row">
          <span class="cron-range-row__label">From</span>
          <input class="cron-range-row__input" type="number" min="${field.min}" max="${field.max}" value="${state.rangeStart || field.min}" data-field="${idx}" data-prop="rangeStart">
          <span class="cron-range-row__label">to</span>
          <input class="cron-range-row__input" type="number" min="${field.min}" max="${field.max}" value="${state.rangeEnd || field.max}" data-field="${idx}" data-prop="rangeEnd">
        </div>`;
      } else if (state.type === 'step') {
        detail = `<div class="cron-range-row">
          <span class="cron-range-row__label">Every</span>
          <input class="cron-range-row__input" type="number" min="1" max="${field.max}" value="${state.step || 1}" data-field="${idx}" data-prop="step">
          <span class="cron-range-row__label">${field.label.toLowerCase()}(s)</span>
        </div>`;
      }

      return `
        <div class="cron-builder-card">
          <div class="cron-builder-card__head">
            <span class="cron-builder-card__name">${field.label}</span>
            <span class="cron-builder-card__range">${field.min}-${field.max}</span>
          </div>
          <div class="cron-builder-card__body">
            <div class="cron-builder-type">
              <button class="cron-builder-type__btn${state.type === 'every' ? ' cron-builder-type__btn--active' : ''}" data-field="${idx}" data-type="every" type="button">Every</button>
              <button class="cron-builder-type__btn${state.type === 'specific' ? ' cron-builder-type__btn--active' : ''}" data-field="${idx}" data-type="specific" type="button">Specific</button>
              <button class="cron-builder-type__btn${state.type === 'range' ? ' cron-builder-type__btn--active' : ''}" data-field="${idx}" data-type="range" type="button">Range</button>
              <button class="cron-builder-type__btn${state.type === 'step' ? ' cron-builder-type__btn--active' : ''}" data-field="${idx}" data-type="step" type="button">Step</button>
            </div>
            ${detail}
          </div>
        </div>`;
    }).join('');
  }

  function buildExpression() {
    const parts = builderFields.map((field, idx) => {
      const state = builderState[idx];
      switch (state.type) {
        case 'every': return '*';
        case 'specific': {
          if (state.values.length === 0) return '*';
          return state.values.sort((a, b) => a - b).join(',');
        }
        case 'range': {
          const s = parseInt(state.rangeStart, 10) || field.min;
          const e = parseInt(state.rangeEnd, 10) || field.max;
          return `${s}-${e}`;
        }
        case 'step': {
          const st = parseInt(state.step, 10) || 1;
          return `*/${st}`;
        }
        default: return '*';
      }
    });
    return parts.join(' ');
  }

  function updateBuildOutput() {
    const expr = buildExpression();
    buildOutput.textContent = expr;
    try {
      const parsed = parseCron(expr);
      buildDesc.textContent = describeCron(parsed);
      const execs = getNextExecutions(parsed, 5);
      buildNextList.innerHTML = execs.map(d =>
        `<li class="cron-next__item">
          <span class="cron-next__time">${formatDateTime(d)}</span>
          <span class="cron-next__relative">${relativeTime(d)}</span>
        </li>`
      ).join('');
    } catch (err) {
      buildDesc.textContent = err.message;
      buildNextList.innerHTML = '';
    }
  }

  builderBody.addEventListener('click', e => {
    const typeBtn = e.target.closest('.cron-builder-type__btn');
    if (typeBtn) {
      const idx = parseInt(typeBtn.dataset.field, 10);
      builderState[idx].type = typeBtn.dataset.type;
      renderBuilder();
      updateBuildOutput();
      return;
    }
    const valBtn = e.target.closest('.cron-val-grid__item');
    if (valBtn) {
      const idx = parseInt(valBtn.dataset.field, 10);
      const val = parseInt(valBtn.dataset.val, 10);
      const arr = builderState[idx].values;
      const pos = arr.indexOf(val);
      if (pos >= 0) arr.splice(pos, 1);
      else arr.push(val);
      valBtn.classList.toggle('cron-val-grid__item--selected');
      updateBuildOutput();
    }
  });

  builderBody.addEventListener('input', e => {
    const input = e.target.closest('.cron-range-row__input');
    if (!input) return;
    const idx = parseInt(input.dataset.field, 10);
    const prop = input.dataset.prop;
    builderState[idx][prop] = input.value;
    updateBuildOutput();
  });

  btnBuildCopy.addEventListener('click', () => {
    const expr = buildExpression();
    copyText(expr);
  });

  btnBuildParse.addEventListener('click', () => {
    const expr = buildExpression();
    cronInput.value = expr;
    tabBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
    tabBtns[0].setAttribute('aria-pressed', 'true');
    parseSection.style.display = '';
    buildSection.style.display = 'none';
    handleParse();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  renderBuilder();
  updateBuildOutput();
})();
