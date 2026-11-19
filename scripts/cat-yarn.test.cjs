const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('./helpers.cjs');
const { mountCatYarnScene } = require('../src/lib/catYarnScene.ts');
const { buildYarnPath } = require('../src/lib/yarnPath.ts');
const { sampleYarnContour, YarnPhysics } = require('../src/lib/yarnPhysics.ts');

function setup(reduced = false, loaded = true) {
  const saved = {};
  const events = () => ({
    listeners: new Map(),
    addEventListener(name, fn) { this.listeners.set(name, fn); },
    removeEventListener(name) { this.listeners.delete(name); },
    fire(name, event = {}) { this.listeners.get(name)?.(event); },
  });
  const image = { complete: loaded, naturalWidth: loaded ? 1254 : 0 };
  const scene = { ...events(), querySelectorAll: () => [image] };
  const trigger = { ...events(), disabled: false, attrs: new Map([['aria-label', 'Play with yarn']]),
    getAttribute(name) { return this.attrs.get(name); },
    setAttribute(name, value) { this.attrs.set(name, value); } };
  const motion = { ...events(), matches: reduced };
  const timers = new Map();
  let nextTimer = 0;
  const win = { matchMedia: () => motion,
    setTimeout(fn, delay) { timers.set(++nextTimer, { fn, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); } };
  const doc = { ...events(), hidden: false };
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const animations = [];
  const element = name => ({
    animate(keyframes, options) {
      let resolve;
      let reject;
      const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
      const animation = { name, keyframes, options, finished, resolve,
        cancelled: false, cancel() { this.cancelled = true; reject(new Error('cancelled')); } };
      animations.push(animation);
      return animation;
    },
  });
  for (const [name, value] of Object.entries({ window: win, document: doc, IntersectionObserver: Observer })) {
    saved[name] = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const cleanup = mountCatYarnScene(scene, trigger, element('paw'), element('ball'));
  return { scene, trigger, motion, image, timers, doc, animations, observers,
    visible(ratio = 1) { observers[0].callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]); },
    runTimer() { const [id, timer] = [...timers][0]; timers.delete(id); timer.fn(); return timer.delay; },
    async finish() { animations.filter(a => !a.cancelled).forEach(a => a.resolve()); await Promise.resolve(); await Promise.resolve(); },
    close() { cleanup(); for (const [name, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    } },
  };
}

test('scene waits, reaches, touches, retracts, then rests for different idle intervals', async () => {
  const h = setup();
  try {
    assert.equal(h.timers.size, 0);
    h.visible();
    assert.equal([...h.timers.values()][0].delay, 4200);
    h.runTimer();
    assert.deepEqual(h.animations.map(a => a.name), ['paw', 'ball']);
    const [paw, ball] = h.animations;
    assert.ok(ball.keyframes.filter(f => f.offset <= .43).every(f => f.transform === 'rotate(0deg)'));
    assert.equal(paw.keyframes.at(-1).transform, 'rotate(0deg)');
    assert.equal(ball.keyframes.at(-1).transform, 'rotate(0deg)');
    h.trigger.fire('click');
    assert.equal(h.animations.length, 2, 'gestures cannot pile up');
    await h.finish();
    const firstDelay = [...h.timers.values()][0].delay;
    assert.ok(firstDelay >= 6000);
    h.runTimer();
    await h.finish();
    const secondDelay = [...h.timers.values()][0].delay;
    assert.notEqual(firstDelay, secondDelay);
  } finally { h.close(); }
});

test('mouse hover, touch click and native button activation share one controlled gesture', () => {
  const h = setup();
  try {
    h.visible();
    h.trigger.fire('pointerenter', { pointerType: 'touch' });
    assert.equal(h.animations.length, 0);
    h.trigger.fire('click');
    assert.equal(h.animations.length, 2);
    h.visible(0);
    h.visible(1);
    h.trigger.fire('pointerenter', { pointerType: 'mouse' });
    assert.equal(h.animations.length, 4);
    assert.equal(h.timers.size, 0);
  } finally { h.close(); }
});

test('offscreen, hidden tabs, reduced motion and unmount release all animations and timers', () => {
  const h = setup();
  try {
    h.visible(.1);
    assert.equal(h.timers.size, 0);
    h.visible();
    h.trigger.fire('click');
    h.visible(0);
    assert.ok(h.animations.every(a => a.cancelled));
    assert.equal(h.timers.size, 0);
    h.visible();
    h.trigger.fire('click');
    h.doc.hidden = true;
    h.doc.fire('visibilitychange');
    assert.ok(h.animations.every(a => a.cancelled));
    assert.equal(h.timers.size, 0);
    h.doc.hidden = false;
    h.doc.fire('visibilitychange');
    h.motion.matches = true;
    h.motion.fire('change');
    assert.equal(h.trigger.disabled, true);
    h.trigger.fire('click');
    assert.equal(h.timers.size, 0);
    h.motion.matches = false;
    h.motion.fire('change');
    assert.equal(h.trigger.disabled, false);
    assert.equal(h.timers.size, 1);
  } finally { h.close(); }
  assert.equal(h.timers.size, 0);
  assert.equal(h.trigger.listeners.size, 0);
  assert.equal(h.scene.listeners.size, 0);
  assert.equal(h.motion.listeners.size, 0);
  assert.equal(h.doc.listeners.size, 0);
  assert.ok(h.observers.every(observer => observer.disconnected));
});

test('lazy-loaded artwork is ready before a gesture is scheduled', () => {
  const h = setup(false, false);
  try {
    h.visible();
    assert.equal(h.timers.size, 0);
    h.trigger.fire('click');
    assert.equal(h.animations.length, 0);
    h.image.complete = true;
    h.image.naturalWidth = 1254;
    h.scene.fire('load');
    assert.equal(h.timers.size, 1);
  } finally { h.close(); }
});

test('responsive rope endpoint remains pinned to the yarn connection, not the document edge', () => {
  for (const width of [320, 390, 1280]) {
    const endAnchor = { x: width * .27, y: 6250 };
    const points = sampleYarnContour(buildYarnPath({ width, height: 6400, gutter: 35,
      sections: [], obstacles: [], endAnchor }));
    assert.ok(Math.hypot(points.at(-1).x - endAnchor.x, points.at(-1).y - endAnchor.y) < .02);
    const model = new YarnPhysics(points, width, 6400);
    model.setWindow(5600, 6400);
    for (let i = 0; i < 100; i++) model.step();
    assert.ok(Math.hypot(model.nodes.at(-1).pos.x - endAnchor.x, model.nodes.at(-1).pos.y - endAnchor.y) < .02);
  }
});

test('all three image layers are actual local PNG files', () => {
  for (const file of ['cat-body.png', 'cat-paw.png', 'yarn-ball.png']) {
    const bytes = fs.readFileSync(path.join(__dirname, '../public/assets/cat-yarn', file));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(bytes.readUInt32BE(16) > 1000);
  }
});
