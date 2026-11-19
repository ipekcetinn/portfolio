const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function mount({ reduced = false } = {}) {
  const slots = [];
  const timers = new Map();
  const documentEvents = new Map();
  const motionEvents = new Map();
  const observers = [];
  const timelines = [];
  const media = { matches: reduced, addEventListener: (n, f) => motionEvents.set(n, f), removeEventListener: n => motionEvents.delete(n) };
  const document = { hidden: false, addEventListener: (n, f) => documentEvents.set(n, f), removeEventListener: n => documentEvents.delete(n) };
  let index = 0;
  let dirty = false;
  let now = 0;
  let serial = 0;
  let queued = [];
  let tree;
  const group = {};
  const setTimeout = (fn, delay = 0) => { timers.set(++serial, { fn, at: now + delay }); return serial; };
  const clearTimeout = id => timers.delete(id);
  const equal = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(value) {
      const key = index++;
      if (!slots[key]) slots[key] = { value };
      return [slots[key].value, next => {
        const value = typeof next === 'function' ? next(slots[key].value) : next;
        if (!Object.is(value, slots[key].value)) { slots[key].value = value; dirty = true; }
      }];
    },
    useRef(value) { const key = index++; if (!slots[key]) slots[key] = { current: value }; return slots[key]; },
    useMemo(fn, deps) {
      const key = index++;
      if (!slots[key] || !equal(slots[key].deps, deps)) slots[key] = { deps, value: fn() };
      return slots[key].value;
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const key = index++;
      if (!slots[key] || !equal(slots[key].deps, deps)) {
        const previous = slots[key];
        slots[key] = { deps, cleanup: previous?.cleanup };
        queued.push(() => { previous?.cleanup?.(); slots[key].cleanup = fn(); });
      }
    },
    useLayoutEffect(fn, deps) { hooks.useEffect(fn, deps); },
    useSyncExternalStore(subscribe, snapshot) {
      hooks.useEffect(() => subscribe(() => { dirty = true; }), [subscribe]);
      return snapshot();
    },
  };
  const gsap = {
    set() {}, to() { return { kill() {} }; }, killTweensOf() {},
    timeline() {
      const t = { killed: false, to() { return t; }, pause() {}, restart() {}, kill() { t.killed = true; } };
      timelines.push(t); return t;
    },
    delayedCall(seconds, fn) { const timer = setTimeout(fn, seconds * 1000); return { kill: () => clearTimeout(timer) }; },
  };
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(node) { this.node = node; }
    disconnect() { this.disconnected = true; }
  }
  class ResizeObserver {
    constructor() { this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const mod = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/effects/TextType.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: mod.exports, module: mod, document, setTimeout, clearTimeout, IntersectionObserver, ResizeObserver,
    window: { matchMedia: () => media, setTimeout, clearTimeout },
    require: name => name === 'react' ? hooks : name === 'gsap' ? { gsap } : name.endsWith('.css') ? {} : require(name),
  });
  function bind(node) {
    if (!node || typeof node !== 'object') return;
    if (node.props?.ref && typeof node.props.ref === 'object') {
      node.props.ref.current ??= { offsetLeft: 10, offsetTop: 0, closest: () => group };
    }
    const children = node.props?.children;
    (Array.isArray(children) ? children : [children]).flat(Infinity).forEach(bind);
  }
  function render() {
    let iterations = 0;
    do {
      dirty = false; index = 0; queued = [];
      tree = mod.exports.default({ text: 'Belsis', typingSpeed: 10, loop: false, startOnVisible: true, typeEffect: 'fade', cursorStyle: 'bar' });
      bind(tree); queued.forEach(effect => effect());
      assert.ok(iterations++ < 20, 'renders must settle');
    } while (dirty);
  }
  function plain(node) {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (!node || typeof node !== 'object') return '';
    const children = node.props?.children;
    return (Array.isArray(children) ? children : [children]).flat(Infinity).map(plain).join('');
  }
  function text(className) {
    function find(node) {
      if (!node || typeof node !== 'object') return undefined;
      if (node.props?.className === className) return plain(node).replace(/\u200B/g, '');
      const children = node.props?.children;
      for (const child of (Array.isArray(children) ? children : [children]).flat(Infinity)) {
        const result = find(child);
        if (result !== undefined) return result;
      }
    }
    return find(tree);
  }
  render();
  return {
    timers, timelines, observers, documentEvents, motionEvents, text,
    visible(value) { observers.find(o => o.callback).callback([{ isIntersecting: value }]); render(); },
    hidden(value) { document.hidden = value; documentEvents.get('visibilitychange')(); render(); },
    reduced(value) { media.matches = value; motionEvents.get('change')(); render(); },
    advance(ms) {
      const target = now + ms;
      let steps = 0;
      while (timers.size) {
        const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (timer.at > target) break;
        timers.delete(id); now = timer.at; timer.fn(); render();
        assert.ok(steps++ < 1000, 'typing must not spin');
      }
      now = target;
    },
    complete() { return tree.props['data-complete'] === ''; },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('TextType reserves full text and types once only after its section is visible', () => {
  const h = mount();
  try {
    assert.equal(h.text('text-type__layout'), 'Belsis');
    assert.equal(h.text('text-type__sr'), 'Belsis');
    assert.equal(h.text('text-type__content'), '');
    assert.equal(h.timers.size, 0);
    h.visible(true); h.advance(20);
    assert.equal(h.text('text-type__content'), 'Be');
    h.advance(100);
    assert.equal(h.text('text-type__content'), 'Belsis');
    assert.equal(h.complete(), true);
    assert.equal(h.timers.size, 0);
    h.advance(10000);
    assert.equal(h.text('text-type__content'), 'Belsis');
  } finally { h.dispose(); }
});

test('offscreen and hidden-tab typing pauses and resumes without restarting text', () => {
  const h = mount();
  try {
    h.visible(true); h.advance(20); h.visible(false);
    assert.equal(h.timers.size, 0);
    h.advance(1000);
    assert.equal(h.text('text-type__content'), 'Be');
    h.visible(true); h.advance(10); h.hidden(true);
    assert.equal(h.timers.size, 0);
    assert.equal(h.text('text-type__content'), 'Bel');
    h.hidden(false); h.advance(100);
    assert.equal(h.text('text-type__content'), 'Belsis');
  } finally { h.dispose(); }
});

test('reduced motion shows complete content immediately with no typing loop', () => {
  const h = mount({ reduced: true });
  try {
    assert.equal(h.text('text-type__content'), 'Belsis');
    assert.equal(h.timers.size, 0);
    h.visible(true);
    assert.equal(h.timers.size, 0);
  } finally { h.dispose(); }
});

test('TextType unmount removes timers, observers, subscriptions and cursor timelines', () => {
  const h = mount();
  h.visible(true); h.advance(20);
  assert.ok(h.timers.size > 0);
  h.dispose();
  assert.equal(h.timers.size, 0);
  assert.equal(h.documentEvents.size, 0);
  assert.equal(h.motionEvents.size, 0);
  assert.ok(h.observers.every(o => o.disconnected));
  assert.ok(h.timelines.every(t => t.killed));
});
