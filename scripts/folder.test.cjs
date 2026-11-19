const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function mount({ open = false, reduced = false } = {}) {
  const effects = [], cleanups = [], frames = new Map(), observers = [], changes = [], selections = [], drops = [];
  const windowEvents = new Map(), documentEvents = new Map(), preferenceEvents = new Map();
  let clock = 0, serial = 0;
  class Node {
    constructor(props = {}, parent = null) {
      this.parentElement = parent; this.props = props; this.dataset = {}; this.events = new Map();
      this.offsetWidth = 224; this.offsetHeight = 196; this.offsetLeft = 0; this.offsetTop = 0;
      this.style = { setProperty(name, value) { this[name] = value; } };
      this.attrs = new Map(Object.entries(props));
    }
    contains(target) { for (let n = target; n; n = n.parentElement) if (n === this) return true; return false; }
    closest(selector) {
      if (selector === '[data-folder-item]') return this.attrs.has('data-folder-item') ? this : this.parentElement?.closest(selector) ?? null;
      return null;
    }
    getBoundingClientRect() { return { left: 100, top: 100, width: 224, height: 196, right: 324, bottom: 296 }; }
    setAttribute(name, value) { this.attrs.set(name, value); }
    getAttribute(name) { return this.attrs.get(name); }
    removeAttribute(name) { this.attrs.delete(name); }
    addEventListener(name, fn) { this.events.set(name, fn); }
    removeEventListener(name) { this.events.delete(name); }
    setPointerCapture() {}
  }
  const hooks = { ...React,
    useState(value) { let current = value; return [current, next => { current = typeof next === 'function' ? next(current) : next; }]; },
    useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn,
    useEffect: fn => effects.push(fn), useLayoutEffect: fn => effects.push(fn),
  };
  const preference = { matches: reduced, addEventListener: (name, fn) => preferenceEvents.set(name, fn), removeEventListener: name => preferenceEvents.delete(name) };
  const document = {
    hidden: false, body: null,
    createElement: () => ({ getContext: () => ({ clearRect() {}, fillRect() {}, getImageData: () => ({ data: [200, 175, 137, 255] }) }) }),
    addEventListener: (name, fn) => documentEvents.set(name, fn),
    removeEventListener: name => documentEvents.delete(name),
  };
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; };
  const mod = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/effects/Folder.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: mod.exports, module: mod, Node, HTMLElement: Node, IntersectionObserver,
    document, performance: { now: () => clock }, requestAnimationFrame, cancelAnimationFrame: id => frames.delete(id),
    window: { matchMedia: () => preference, innerWidth: 1000, innerHeight: 800,
      addEventListener: (name, fn) => windowEvents.set(name, fn), removeEventListener: name => windowEvents.delete(name) },
    getComputedStyle: () => ({ overflowX: 'visible', overflowY: 'visible' }),
    require: name => name === 'react' ? hooks : name.endsWith('.css') ? {} : require(name),
  });
  const tree = mod.exports.default({
    label: 'Training', variant: 'matte', mode: 'flap', open, intro: false, draggable: true, zoomOnClick: true,
    items: [{ title: 'HTTP', description: 'February 2026' }, { title: 'Python', description: 'August 2025' }, { title: 'Front-end', description: 'February 2025' }],
    onOpenChange: value => changes.push(value), onItemClick: (_, i) => selections.push(i), onItemDrop: (_, i, inside) => drops.push({ i, inside }),
  });
  const nodes = [], paperElements = [];
  let stage;
  function bind(element, parent = null) {
    if (!element || typeof element !== 'object') return;
    const node = new Node(element.props, parent);
    nodes.push(node);
    if (element.props?.className === 'folder-stage') stage = element;
    if (element.props?.['data-folder-item'] !== undefined) paperElements.push({ element, node });
    const ref = element.props?.ref;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
    const children = element.props?.children;
    (Array.isArray(children) ? children : [children]).flat(Infinity).forEach(child => bind(child, node));
  }
  bind(tree);
  effects.forEach(effect => cleanups.push(effect()));
  const root = nodes[0];
  function tick() {
    clock += 1000 / 60;
    const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(clock));
  }
  function settle() { let count = 0; while (frames.size && count++ < 900) tick(); assert.equal(frames.size, 0, 'spring must settle'); }
  const pointer = (node, x, y, type = 'pointermove') => ({
    target: node, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', button: 0, type, preventDefault() {},
  });
  return { tree, stage, root, paperElements, nodes, frames, observers, changes, selections, drops,
    document, documentEvents, windowEvents, preference, preferenceEvents, pointer, tick, settle,
    dispose() { cleanups.reverse().forEach(fn => fn?.()); } };
}

test('full Folder API opens via click and keyboard with original document controls', () => {
  const h = mount();
  try {
    h.settle();
    assert.equal(h.stage.props['aria-expanded'], false);
    assert.ok(h.paperElements.every(p => p.element.props.tabIndex === -1));
    h.stage.props.onClick();
    assert.deepEqual(h.changes, [true]);
    let prevented = false;
    const target = {};
    h.stage.props.onKeyDown({ target, currentTarget: target, key: 'Enter', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.deepEqual(h.changes, [true, true]);
  } finally { h.dispose(); }
});

test('open Folder selects and zooms a paper, then Escape/outside closes it', () => {
  const h = mount({ open: true });
  try {
    h.settle();
    const paper = h.paperElements[1];
    const before = paper.node.style.transform;
    paper.element.props.onClick({ stopPropagation() {} });
    h.settle();
    assert.deepEqual(h.selections, [1]);
    assert.notEqual(paper.node.style.transform, before);
    h.documentEvents.get('keydown')({ key: 'Escape' });
    h.settle();
    h.documentEvents.get('keydown')({ key: 'Escape' });
    assert.deepEqual(h.changes, [false]);
    h.documentEvents.get('pointerdown')({ target: {} });
    assert.deepEqual(h.changes, [false, false]);
  } finally { h.dispose(); }
});

test('touch dragging can move a page out of the full Folder and settle it', () => {
  const h = mount({ open: true });
  try {
    h.settle();
    const node = h.paperElements[0].node;
    h.root.events.get('pointerdown')(h.pointer(node, 180, 150, 'pointerdown'));
    h.root.events.get('pointermove')(h.pointer(node, 520, 390));
    for (let i = 0; i < 20; i++) h.tick();
    h.windowEvents.get('pointerup')(h.pointer(node, 520, 390, 'pointerup'));
    h.settle();
    assert.equal(h.drops.length, 1);
    assert.equal(h.drops[0].i, 0);
    assert.equal(h.drops[0].inside, false);
  } finally { h.dispose(); }
});

test('hidden/offscreen Folder pauses and full cleanup removes pending work', () => {
  const h = mount({ open: true });
  h.root.events.get('pointermove')(h.pointer(h.root, 200, 180));
  h.document.hidden = true;
  h.documentEvents.get('visibilitychange')();
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.documentEvents.get('visibilitychange')();
  assert.ok(h.frames.size > 0);
  h.observers[0].callback([{ isIntersecting: false }]);
  assert.equal(h.frames.size, 0);
  h.dispose();
  assert.equal(h.frames.size, 0);
  assert.equal(h.windowEvents.size, 0);
  assert.equal(h.documentEvents.size, 0);
  assert.equal(h.preferenceEvents.size, 0);
  assert.ok(h.observers.every(observer => observer.disconnected));
});

test('reduced motion renders original Folder geometry without a continuous spring loop', () => {
  const h = mount({ open: true, reduced: true });
  try {
    h.tick(); h.tick();
    assert.equal(h.frames.size, 0);
    assert.ok(h.paperElements.every(p => p.node.style.transform.startsWith('matrix3d(')));
    h.preference.matches = false;
    h.preferenceEvents.get('change')();
    h.settle();
  } finally { h.dispose(); }
});
