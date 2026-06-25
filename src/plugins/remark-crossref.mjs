/**
 * remark-crossref — Quarto-style cross-references for Astro/MDX.
 *
 * Authoring (uses remark-directive container syntax):
 *
 *   :::fig{#fig-growth}
 *   ![](/figs/growth.svg)
 *   Projected weekly views, compounding.
 *   :::
 *
 *   :::tbl{#tbl-stats}
 *   | metric | value |
 *   | ------ | ----- |
 *   | mean   | 305   |
 *   Summary statistics.
 *   :::
 *
 *   :::eqn{#eq-model}
 *   $$ v_t = v_0 (1+g)^t $$
 *   :::
 *
 * Then reference them in prose with @fig-growth / @tbl-stats / @eq-model.
 * The plugin auto-numbers each kind in document order, prepends
 * "Figure N: " / "Table N: " captions, tags equations with (N), and turns
 * every @ref into a hyperlink showing the right number — including forward
 * references. This is the Quarto feature with no turnkey Astro equivalent.
 */

const KIND = { fig: 'Figure', tbl: 'Table', eqn: 'Equation' };
const REF_RE = /@(fig|tbl|eq)-[A-Za-z0-9_-]+/g;

function walk(node, fn) {
  fn(node);
  if (node.children) for (const c of node.children) walk(c, fn);
}

function findLast(children, type) {
  for (let i = children.length - 1; i >= 0; i--) if (children[i].type === type) return children[i];
  return null;
}
function findDeep(node, type) {
  let found = null;
  walk(node, (n) => { if (!found && n.type === type) found = n; });
  return found;
}

export default function remarkCrossref() {
  return (tree) => {
    const counters = { fig: 0, tbl: 0, eqn: 0 };
    const registry = {}; // id -> { kindKey, num }

    // ---- pass 1: number every labeled definition, in document order ----
    walk(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      const name = node.name; // 'fig' | 'tbl' | 'eqn'
      if (!(name in counters)) return;
      const id = node.attributes && node.attributes.id;
      const num = ++counters[name];
      const refKey = name === 'eqn' ? 'eq' : name;
      if (id) registry[id] = { name, num, refKey };

      node.data = node.data || {};
      node.data.hProperties = { ...(node.data.hProperties || {}), id: id || undefined, class: `xref x-${name}` };

      if (name === 'eqn') {
        node.data.hName = 'div';
        const math = findDeep(node, 'math');
        if (math) math.value = `${math.value}\n\\tag{${num}}`;
        return;
      }

      // fig / tbl: caption is the last paragraph in the block
      node.data.hName = name === 'fig' ? 'figure' : 'div';
      const caption = findLast(node.children, 'paragraph');
      if (caption) {
        caption.data = caption.data || {};
        caption.data.hName = name === 'fig' ? 'figcaption' : 'div';
        caption.data.hProperties = { class: 'xref-caption' };
        caption.children.unshift({
          type: 'strong',
          data: { hProperties: { class: 'xref-label' } },
          children: [{ type: 'text', value: `${KIND[name]} ${num}. ` }],
        });
      }
    });

    // ---- pass 2: resolve @ref tokens in text into numbered links ----
    walk(tree, (node) => {
      if (!node.children) return;
      const out = [];
      let changed = false;
      for (const child of node.children) {
        if (child.type !== 'text' || !REF_RE.test(child.value)) { out.push(child); continue; }
        REF_RE.lastIndex = 0;
        let last = 0; let m;
        while ((m = REF_RE.exec(child.value)) !== null) {
          const token = m[0];          // "@fig-growth"
          const id = token.slice(1);    // "fig-growth"
          if (m.index > last) out.push({ type: 'text', value: child.value.slice(last, m.index) });
          const hit = registry[id];
          if (hit) {
            const label = hit.name === 'eqn' ? `(${hit.num})` : `${KIND[hit.name]} ${hit.num}`;
            out.push({
              type: 'link', url: `#${id}`,
              data: { hProperties: { class: 'xref-link' } },
              children: [{ type: 'text', value: label }],
            });
          } else {
            out.push({ type: 'text', value: token });
          }
          last = m.index + token.length;
        }
        if (last < child.value.length) out.push({ type: 'text', value: child.value.slice(last) });
        changed = true;
      }
      if (changed) node.children = out;
    });
  };
}
