const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers.cjs');
const { YarnPhysics, sampleYarnContour, segmentBlocked } = require('../src/lib/yarnPhysics.ts');
const { buildYarnPath } = require('../src/lib/yarnPath.ts');
const { mountYarnRope } = require('../src/lib/yarnRopeScene.ts');

function rope(height = 6000) {
  return new YarnPhysics(sampleYarnContour(buildYarnPath({ width: 390, height, gutter: 30, sections: [], obstacles: [] })), 390, height);
}

test('long-page sampling preserves endpoints and bounds active simulation work', () => {
  const model = rope(60000);
  assert.ok(model.nodes.length <= 1802);
  assert.equal(model.nodes[0].pos.y, 0);
  assert.ok(Math.abs(model.nodes.at(-1).pos.y - 59988) < .001);
  assert.ok(model.nodes.every((node, i) => Number.isFinite(node.pos.x) && (!i || node.rest.y >= model.nodes[i - 1].rest.y)));
  model.setWindow(20000, 20844);
  assert.ok(model.range.end - model.range.start < 80);
  const frozen = globalThis.structuredClone(model.nodes[10]);
  for (let i = 0; i < 30; i++) model.step();
  assert.deepEqual(model.nodes[10], frozen);
});

test('drag bends the rope, preserves anchors and dissipates release energy', () => {
  const model = rope();
  model.setWindow(0, 844);
  const first = { ...model.nodes[0].pos };
  const last = { ...model.nodes.at(-1).pos };
  const index = model.nearest({ x: 12, y: 400 }, 30);
  assert.ok(index > 0);
  const rest = { ...model.nodes[index].rest };
  assert.equal(model.grab(index, { x: rest.x + 120, y: rest.y + 20 }), true);
  for (let i = 0; i < 30; i++) model.step();
  assert.ok(model.nodes[index].pos.x > rest.x + 80);
  model.release();
  let early = 0;
  for (let i = 0; i < 30; i++) early = Math.max(early, model.step());
  let late = 0;
  for (let i = 0; i < 900; i++) late = model.step();
  assert.ok(early > .1);
  assert.ok(late < .025);
  assert.deepEqual(model.nodes[0].pos, first);
  assert.deepEqual(model.nodes.at(-1).pos, last);
  assert.ok(model.nodes.every(node => Number.isFinite(node.pos.x) && Number.isFinite(node.pos.y)));
});

test('empty and degenerate layouts remain finite; text regions are protected', () => {
  const empty = new YarnPhysics([], 390, 844);
  empty.setWindow(0, 844);
  empty.resetWindow();
  assert.equal(empty.step(), 0);
  const model = new YarnPhysics([{ x: 12, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 100 }], 390, 844);
  for (let i = 0; i < 100; i++) model.step(i % 2 ? 20 : 0);
  assert.ok(model.nodes.every(node => Number.isFinite(node.pos.x) && Number.isFinite(node.pos.y)));
  assert.equal(model.grab(0, { x: 50, y: 20 }), false);
  const boxes = [{ left: 40, top: 40, width: 20, height: 20 }];
  assert.equal(segmentBlocked({ x: 0, y: 50 }, { x: 100, y: 50 }, boxes), true);
  assert.equal(segmentBlocked({ x: 0, y: 10 }, { x: 100, y: 10 }, boxes), false);
});

function harness(reduced = false) {
  const saved = {};
  const events = () => ({
    listeners: new Map(),
    addEventListener(name, fn, options) { this.listeners.set(name, { fn, options }); },
    removeEventListener(name) { this.listeners.delete(name); },
    fire(name, event = {}) { this.listeners.get(name)?.fn(event); },
  });
  const rect = (left, top, width, height) => ({ offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height, offsetParent: null });
  const root = { ...events(), ...rect(0, 0, 390, 6000), clientWidth: 390, querySelector: () => null, querySelectorAll: () => [] };
  const footer = { ...rect(0, 6000, 390, 80) };
  const layer = { clientWidth: 390, clientHeight: 844, attributes: new Map(), setAttribute(k, v) { this.attributes.set(k, v); }, removeAttribute(k) { this.attributes.delete(k); } };
  const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
  const canvas = { getContext: () => context };
  const hit = { ...events(), captured: null, attributes: new Map(), setAttribute(k, v) { this.attributes.set(k, v); }, removeAttribute(k) { this.attributes.delete(k); },
    setPointerCapture(id) { this.captured = id; }, hasPointerCapture(id) { return this.captured === id; }, releasePointerCapture() { this.captured = null; } };
  const preference = { ...events(), matches: reduced };
  const frames = new Map();
  let serial = 0;
  let now = 0;
  const win = { ...events(), scrollY: 0, devicePixelRatio: 3, matchMedia: () => preference,
    requestAnimationFrame(fn) { frames.set(++serial, fn); return serial; }, cancelAnimationFrame(id) { frames.delete(id); } };
  const doc = { ...events(), hidden: false, getElementById: () => root, querySelector: selector => selector === '.footer' ? footer : null, querySelectorAll: () => [],
    elementsFromPoint: () => [{ closest: () => null }] };
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  for (const [name, value] of Object.entries({ window: win, document: doc, ResizeObserver: Observer, MutationObserver: Observer })) {
    saved[name] = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const cleanup = mountYarnRope(layer, canvas, hit);
  const tick = () => {
    now += 1000 / 60;
    const queued = [...frames.values()];
    frames.clear();
    queued.forEach(fn => fn(now));
  };
  const settle = () => { let count = 0; while (frames.size && count++ < 1400) tick(); assert.equal(frames.size, 0, 'simulation must sleep'); };
  const pointer = (extra = {}) => ({ pointerId: 1, isPrimary: true, pointerType: 'touch', button: 0, clientX: 12, clientY: 400, cancelable: true, prevented: false, preventDefault() { this.prevented = true; }, ...extra });
  return { layer, canvas, hit, preference, frames, win, doc, observers, tick, settle, pointer,
    close() { cleanup(); for (const [name, descriptor] of Object.entries(saved)) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } } };
}

test('viewport canvas sleeps, touch capture releases and cleanup removes all work', () => {
  const h = harness();
  try {
    h.settle();
    assert.equal(h.canvas.width, 585);
    assert.equal(h.canvas.height, 1266);
    assert.ok(h.hit.attributes.get('d').length > 0);
    assert.equal(h.win.listeners.get('scroll').options.passive, true);
    const down = h.pointer();
    h.hit.fire('pointerdown', down);
    assert.equal(down.prevented, true);
    assert.equal(h.hit.captured, 1);
    h.hit.fire('pointermove', h.pointer({ clientX: 120 }));
    for (let i = 0; i < 20; i++) h.tick();
    h.hit.fire('pointerup', h.pointer());
    assert.equal(h.hit.captured, null);
    h.settle();
    h.win.scrollY = 800;
    h.win.fire('scroll');
    h.settle();
  } finally { h.close(); }
  assert.equal(h.frames.size, 0);
  assert.equal(h.hit.captured, null);
  assert.equal(h.hit.listeners.size, 0);
  assert.equal(h.win.listeners.size, 0);
  assert.ok(h.observers.every(observer => observer.disconnected));
});

test('links retain activation; failed pointer capture cannot leave a stuck drag', () => {
  const h = harness();
  try {
    h.settle();
    h.doc.elementsFromPoint = () => [{ closest: selector => selector === '.yarn-rope' ? null : {} }];
    const linkDown = h.pointer();
    h.hit.fire('pointerdown', linkDown);
    assert.equal(linkDown.prevented, false);
    assert.equal(h.hit.captured, null);
    h.doc.elementsFromPoint = () => [{ closest: () => null }];
    h.hit.setPointerCapture = () => { throw new Error('pointer no longer active'); };
    h.hit.fire('pointerdown', h.pointer());
    assert.equal(h.layer.attributes.has('data-dragging'), false);
    h.settle();
  } finally { h.close(); }
});

test('reduced motion and hidden tabs have no continuous animation loop', () => {
  const h = harness(true);
  try {
    h.tick();
    assert.equal(h.frames.size, 0);
    h.hit.fire('pointerdown', h.pointer());
    h.tick();
    assert.equal(h.frames.size, 0);
    h.hit.fire('pointerup', h.pointer());
    h.tick();
    assert.equal(h.frames.size, 0);
    h.preference.matches = false;
    h.preference.fire('change');
    h.tick();
    assert.ok(h.frames.size > 0);
    h.doc.hidden = true;
    h.doc.fire('visibilitychange');
    assert.equal(h.frames.size, 0);
    assert.equal(h.hit.captured, null);
  } finally { h.close(); }
});