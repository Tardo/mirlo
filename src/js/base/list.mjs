// @flow strict

/**
 * Item data of a rendered list node.
 * @typedef {Object} ListEntry
 * @private
 */
export type ListEntry = {
  prop: string,
  key: unknown,
  item: unknown,
  index: number,
  node: HTMLElement,
  targets: {[string]: Array<Element>},
  vals: {[string]: unknown},
};

/** Relation 'item node' -> 'entry'. Used to resolve events of delegated nodes. */
const entry_registry: WeakMap<Node, ListEntry> = new WeakMap();

/**
 * Check the definition of a list bind.
 * @param {string} prop - The state property.
 * @param {Object} bind - The bind definition.
 * @throws Will throw an error if the definition is not valid.
 * @private
 */
export function validateListBind(prop: string, bind: MirloComponentBind) {
  const each = bind.each;
  if (!each) {
    return;
  }
  if (typeof bind.selectorAll === 'string' || (typeof bind.id !== 'string' && typeof bind.selector !== 'string')) {
    throw new Error(`List '${prop}': use 'id' or 'selector' to define the container.`);
  }
  if (typeof each.template !== 'string' || !each.template) {
    throw new Error(`List '${prop}': 'each.template' is required.`);
  }
  if (typeof each.key !== 'string' && typeof each.key !== 'function') {
    throw new Error(`List '${prop}': 'each.key' is required.`);
  }
  const item_binds = each.binds ?? {};
  Object.keys(item_binds).forEach(field => {
    // $FlowFixMe[invalid-computed-prop]
    if (item_binds[field].id !== undefined) {
      throw new Error(`List '${prop}': 'id' is not allowed in item binds (${field}), the ids would be duplicated.`);
    }
  });
}

/**
 * Apply a value to a node.
 * @param {HTMLElement} node - The node.
 * @param {string|undefined} attr - The attribute name. 'html' for innerHTML, '.name' for a DOM property.
 * @param {*} value - The value.
 * @private
 */
function applyValue(node: Element, attr: string | void, value: unknown): void {
  if (attr === undefined || attr === '') {
    node.textContent = value === null || value === undefined ? '' : String(value);
  } else if (attr === 'html') {
    node.innerHTML = value === null || value === undefined ? '' : String(value);
  } else if (attr.startsWith('.')) {
    // $FlowFixMe[prop-missing]
    node[attr.slice(1)] = value;
  } else if (value === null || value === undefined || value === false) {
    node.removeAttribute(attr);
  } else {
    node.setAttribute(attr, value === true ? '' : String(value));
  }
}

/**
 * Longest increasing subsequence of the non-negative values.
 * The nodes of this subsequence are already in order, so only the rest must be moved.
 * @param {Array<number>} seq - The sequence. Negative values are ignored.
 * @returns {Set<number>} The positions (in 'seq') that belong to the subsequence.
 * @private
 */
function longestIncreasing(seq: Array<number>): Set<number> {
  const tails: Array<number> = [];
  const prev: Array<number> = new Array(seq.length);
  for (let i = 0; i < seq.length; ++i) {
    const val = seq[i];
    if (val < 0) {
      continue;
    }
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (seq[tails[mid]] < val) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    prev[i] = lo > 0 ? tails[lo - 1] : -1;
    tails[lo] = i;
  }
  const res: Set<number> = new Set();
  for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = prev[i]) {
    res.add(i);
  }
  return res;
}

/**
 * Get the list item that owns a node.
 * @param {Node} node - The node or any of its descendants.
 * @returns {ListEntry|null}
 * @private
 */
export function findListEntry(node: Node | null): ListEntry | null {
  for (let cur = node; cur; cur = cur.parentNode) {
    const entry = entry_registry.get(cur);
    if (entry) {
      return entry;
    }
  }
  return null;
}

/**
 * Renders an array of items in a container using a keyed diff:
 * the nodes are reused, patched only when a bound value changes
 * and moved only when the order requires it.
 * @private
 */
export class ListRenderer {
  container: HTMLElement;
  #prop: string;
  #template: HTMLElement;
  #each: MirloComponentList;
  #keyFn: (item: unknown, index: number) => unknown;
  #entries: Map<unknown, ListEntry> = new Map();
  #keys: Array<unknown> | null = null;

  constructor(prop: string, container: HTMLElement, each: MirloComponentList, template: HTMLTemplateElement) {
    if (template.content.children.length !== 1) {
      throw new Error(`List '${prop}': the item template must have exactly one root element.`);
    }
    this.#prop = prop;
    this.container = container;
    this.#each = each;
    // $FlowFixMe[incompatible-type]
    this.#template = template.content.firstElementChild;
    const key = each.key;
    // $FlowFixMe[incompatible-use]
    this.#keyFn = typeof key === 'function' ? key : item => item?.[key];
  }

  /**
   * Render the items. Nothing is changed in the DOM if the items are not valid.
   * @param {Array} items - The items.
   * @throws Will throw an error if an item has no key or the key is duplicated.
   */
  render(items: ReadonlyArray<unknown>): void {
    const container = this.container;
    const entries = this.#entries;
    const old_keys = this.#keys;
    const new_keys: Array<unknown> = new Array(items.length);
    const seen: Set<unknown> = new Set();
    for (let i = 0; i < items.length; ++i) {
      const key = this.#keyFn(items[i], i);
      if (key === undefined || key === null) {
        throw new Error(`List '${this.#prop}': the item at position ${i} has no key.`);
      }
      if (seen.has(key)) {
        throw new Error(`List '${this.#prop}': duplicated key '${String(key)}'.`);
      }
      seen.add(key);
      new_keys[i] = key;
    }

    // Remove the vanished nodes
    let old_kept: Array<unknown> = [];
    if (old_keys === null || items.length === 0) {
      container.textContent = '';
      entries.clear();
    } else {
      old_kept = old_keys.filter(key => seen.has(key));
      if (old_kept.length === 0) {
        container.textContent = '';
        entries.clear();
      } else if (old_kept.length !== old_keys.length) {
        old_keys.forEach(key => {
          if (!seen.has(key)) {
            // $FlowFixMe[incompatible-use]
            entries.get(key).node.remove();
            entries.delete(key);
          }
        });
      }
    }

    // Create or patch
    const nodes: Array<HTMLElement> = new Array(items.length);
    for (let i = 0; i < items.length; ++i) {
      let entry = entries.get(new_keys[i]);
      if (entry) {
        entry.item = items[i];
        entry.index = i;
      } else {
        entry = this.#create(new_keys[i], items[i], i);
      }
      this.#patch(entry);
      nodes[i] = entry.node;
    }

    // Order: trim the common edges, only the middle needs work.
    let start = 0;
    while (start < old_kept.length && start < new_keys.length && old_kept[start] === new_keys[start]) {
      ++start;
    }
    let old_end = old_kept.length;
    let new_end = new_keys.length;
    while (old_end > start && new_end > start && old_kept[old_end - 1] === new_keys[new_end - 1]) {
      --old_end;
      --new_end;
    }
    let anchor: HTMLElement | null = new_end < new_keys.length ? nodes[new_end] : null;
    if (old_end === start) {
      // Only insertions: one DOM operation for all of them
      if (new_end > start) {
        const frag = document.createDocumentFragment();
        frag.append(...nodes.slice(start, new_end));
        container.insertBefore(frag, anchor);
      }
    } else if (new_end > start) {
      const old_pos: Map<unknown, number> = new Map();
      for (let i = start; i < old_end; ++i) {
        old_pos.set(old_kept[i], i);
      }
      const sources = [];
      for (let i = start; i < new_end; ++i) {
        sources.push(old_pos.get(new_keys[i]) ?? -1);
      }
      const stable = longestIncreasing(sources);
      for (let i = new_end - 1; i >= start; --i) {
        if (!stable.has(i - start)) {
          container.insertBefore(nodes[i], anchor);
        }
        anchor = nodes[i];
      }
    }
    this.#keys = new_keys;
  }

  #create(key: unknown, item: unknown, index: number): ListEntry {
    // $FlowFixMe[incompatible-type]
    const node: HTMLElement = this.#template.cloneNode(true);
    const targets: {[string]: Array<Element>} = {};
    const item_binds = this.#each.binds ?? {};
    Object.keys(item_binds).forEach(field => {
      // $FlowFixMe[invalid-computed-prop]
      const bind: MirloListItemBind = item_binds[field];
      if (typeof bind.selector === 'string') {
        const target = node.querySelector(bind.selector);
        targets[field] = target ? [target] : [];
      } else if (typeof bind.selectorAll === 'string') {
        targets[field] = Array.from(node.querySelectorAll(bind.selectorAll));
      } else {
        targets[field] = [node];
      }
    });
    const entry: ListEntry = {prop: this.#prop, key, item, index, node, targets, vals: {}};
    entry_registry.set(node, entry);
    this.#entries.set(key, entry);
    return entry;
  }

  /**
   * Update the nodes of an item, only the values that changed.
   * A snapshot is compared instead of the item itself, so in-place mutations are detected.
   */
  #patch(entry: ListEntry) {
    const binds = this.#each.binds;
    if (!binds) {
      return;
    }
    for (const field of Object.keys(binds)) {
      // $FlowFixMe[incompatible-use]
      const val = field === '$item' ? entry.item : field === '$index' ? entry.index : entry.item?.[field];
      if (Object.hasOwn(entry.vals, field) && Object.is(entry.vals[field], val)) {
        continue;
      }
      entry.vals[field] = val;
      for (const target of entry.targets[field]) {
        applyValue(target, binds[field].attribute, val);
      }
    }
  }
}
