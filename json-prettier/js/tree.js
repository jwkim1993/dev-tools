var TreeView = (() => {
  'use strict';

  const MAX_NODES = 10000;
  let nodeCount = 0;

  const CHEVRON_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5l3.5 3.5-3.5 3.5"/></svg>';

  function render(container, data) {
    container.innerHTML = '';
    nodeCount = 0;

    if (nodeCount > MAX_NODES) {
      container.innerHTML = '<div class="tree-view__warning">JSON too large for tree view. Showing top levels only.</div>';
    }

    const root = buildNode(null, data, 0);
    if (root) container.appendChild(root);
  }

  function buildNode(key, value, depth) {
    nodeCount++;
    if (nodeCount > MAX_NODES) return null;

    const node = document.createElement('div');
    node.className = 'tree-node';
    node.style.paddingLeft = (depth * 20) + 'px';

    if (value === null) {
      node.innerHTML = formatLeaf(key, '<span class="sh-null">null</span>', 'null');
      return node;
    }

    if (Array.isArray(value)) {
      return buildContainerNode(node, key, value, depth, 'array');
    }

    if (typeof value === 'object') {
      return buildContainerNode(node, key, value, depth, 'object');
    }

    const typeClass = typeof value === 'string' ? 'sh-string' : typeof value === 'number' ? 'sh-number' : 'sh-boolean';
    const display = typeof value === 'string' ? '"' + Utils.escapeHtml(value) + '"' : String(value);
    node.innerHTML = formatLeaf(key, '<span class="' + typeClass + '">' + display + '</span>', typeof value);
    return node;
  }

  function buildContainerNode(node, key, value, depth, type) {
    const isArray = type === 'array';
    const entries = isArray ? value : Object.keys(value);
    const count = entries.length;
    const summary = isArray ? '[' + count + ' item' + (count !== 1 ? 's' : '') + ']' : '{' + count + ' key' + (count !== 1 ? 's' : '') + '}';
    const collapsed = depth > 2;

    const header = document.createElement('div');
    header.className = 'tree-node__header';
    header.innerHTML =
      '<button class="tree-node__toggle" aria-label="Toggle">' + CHEVRON_SVG + '</button>' +
      (key !== null ? '<span class="sh-key">"' + Utils.escapeHtml(String(key)) + '"</span><span class="tree-node__colon">: </span>' : '') +
      '<span class="tree-node__summary">' + summary + '</span>';

    node.appendChild(header);

    const children = document.createElement('div');
    children.className = 'tree-node__children';
    node.appendChild(children);

    if (collapsed) {
      node.classList.add('tree-node--collapsed');
      node.dataset.rendered = 'false';
    } else {
      renderChildren(children, value, depth, isArray);
      node.dataset.rendered = 'true';
    }

    header.querySelector('.tree-node__toggle').addEventListener('click', () => {
      const isCollapsed = node.classList.toggle('tree-node--collapsed');
      if (!isCollapsed && node.dataset.rendered === 'false') {
        renderChildren(children, value, depth, isArray);
        node.dataset.rendered = 'true';
      }
    });

    return node;
  }

  function renderChildren(container, value, depth, isArray) {
    const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);
    const frag = document.createDocumentFragment();
    for (const [k, v] of entries) {
      const child = buildNode(k, v, depth + 1);
      if (child) frag.appendChild(child);
    }
    container.appendChild(frag);
  }

  function formatLeaf(key, valueHtml, typeName) {
    const keyPart = key !== null ? '<span class="sh-key">"' + Utils.escapeHtml(String(key)) + '"</span><span class="tree-node__colon">: </span>' : '';
    return '<div class="tree-node__header tree-node__header--leaf">' +
      '<span class="tree-node__spacer"></span>' + keyPart + valueHtml +
      '<span class="tree-node__type badge badge--primary">' + typeName + '</span></div>';
  }

  function expandAll(container) {
    container.querySelectorAll('.tree-node--collapsed').forEach(node => {
      node.classList.remove('tree-node--collapsed');
      if (node.dataset.rendered === 'false') {
        node.dataset.rendered = 'true';
      }
    });
  }

  function collapseAll(container) {
    container.querySelectorAll('.tree-node').forEach(node => {
      if (node.querySelector('.tree-node__children')) {
        node.classList.add('tree-node--collapsed');
      }
    });
  }

  return { render, expandAll, collapseAll };
})();
