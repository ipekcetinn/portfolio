const { animationCode } = require('./helpers.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

function setup(reduced = false) {
  class Element {}
  const values = new Map();
  const classes = new Set();
  const panelValues = new Map();
  const frames = new Map();
  const listeners = new Map();
  let nextFrame = 1;
  let timestamp = 0;
  let writes = 0;
  let preferenceChange;
  const panel = Object.assign(new Element(), {
    offsetHeight: 1000,
    offsetWidth: 1600,
    style: {
      setProperty: (key, value) => panelValues.set(key, value),
      removeProperty: (key) => panelValues.delete(key),
    },
  });
  const stage = {
    offsetHeight: 1800,
    getBoundingClientRect: () => ({ top: -browser.scrollY }),
    querySelector: () => panel,
    classList: { toggle: (name, active) => active ? classes.add(name) : classes.delete(name), remove: (name) => classes.delete(name) },
  };
  const spiral = {
    style: {
      setProperty: (key, value) => { values.set(key, value); writes++; },
      removeProperty: (key) => values.delete(key),
    },
  };
  const preference = {
    matches: reduced,
    addEventListener: (name, callback) => { preferenceChange = callback; },
    removeEventListener: () => { preferenceChange = undefined; },
  };
  const browser = {
    scrollY: 0,
    matchMedia: () => preference,
    requestAnimationFrame: (callback) => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
    addEventListener: (name, callback, options) => listeners.set(name, { callback, options }),
    removeEventListener: (name) => listeners.delete(name),
  };
  const elements = { 'hero-stage': stage, 'hero-spiral': spiral, year: {} };
  const context = { window: browser, document: { getElementById: (id) => elements[id] }, HTMLElement: Element };
  vm.runInNewContext(animationCode(), context);
  function flush(elapsed = 1000 / 60) {
    timestamp += elapsed;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(timestamp));
  }
  function settle() {
    for (let i = 0; frames.size && i < 200; i++) flush();
    assert.equal(frames.size, 0, 'settling loop must terminate');
  }
  function scroll(y, finish = true) {
    browser.scrollY = y;
    listeners.get('scroll')?.callback();
    flush();
    if (finish) settle();
  }
  return {
    values, panelValues, frames, listeners, classes, stage, panel, browser, flush, scroll, settle,
    dispose: () => context.disposeAnimations(),
    hasPreferenceListener: () => Boolean(preferenceChange),
    writes: () => writes,
    preference: (matches) => { preference.matches = matches; preferenceChange(); },
    angle: () => values.get('--spiral-rotation'),
  };
}

test('rotation is driven by scroll, reverses, and stops after the background disappears', () => {
  const env = setup();
  env.flush();
  assert.equal(env.angle(), '0deg');
  assert.equal(env.frames.size, 0, 'no autonomous animation loop');
  env.scroll(400);
  assert.equal(env.angle(), '75deg');
  env.scroll(800);
  assert.equal(env.angle(), '150deg');
  env.scroll(1100);
  assert.equal(env.angle(), '206.25deg');
  assert.equal(env.panelValues.get('--spiral-opacity'), '0');
  const writes = env.writes();
  env.scroll(2400);
  assert.equal(env.writes(), writes, 'no repeated style writes below hero');
  env.scroll(200);
  assert.equal(env.angle(), '37.5deg');
  env.scroll(-50);
  assert.equal(env.angle(), '0deg', 'overscroll clamps at zero');
});

test('scroll listener is passive and events share one animation frame', () => {
  const env = setup();
  env.flush();
  assert.equal(env.listeners.get('scroll').options.passive, true);
  env.browser.scrollY = 400;
  for (let i = 0; i < 20; i++) env.listeners.get('scroll').callback();
  assert.equal(env.frames.size, 1);
  env.flush();
  assert.ok(parseFloat(env.angle()) > 0 && parseFloat(env.angle()) < 75);
  env.settle();
  assert.equal(env.angle(), '75deg');
});

test('reduced motion removes pinning, listeners, pending work and rotation', () => {
  const initial = setup(true);
  assert.equal(initial.classes.size, 0);
  assert.equal(initial.listeners.has('scroll'), false);
  assert.equal(initial.frames.size, 0);
  const env = setup();
  env.scroll(400);
  env.listeners.get('scroll').callback();
  env.preference(true);
  assert.equal(env.frames.size, 0);
  assert.equal(env.angle(), undefined);
  assert.equal(env.classes.size, 0);
  assert.equal(env.listeners.has('scroll'), false);
  env.preference(false);
  env.flush();
  assert.equal(env.angle(), '75deg');
  assert.ok(env.classes.has('is-scroll-driven'));
});

test('viewport changes recalculate the sticky scroll distance', () => {
  const env = setup();
  env.scroll(400);
  env.stage.offsetHeight = 2160;
  env.panel.offsetHeight = 1200;
  env.listeners.get('resize').callback();
  env.flush();
  env.settle();
  assert.equal(env.angle(), '62.5deg');
});

test('background size uses the viewport diagonal to avoid excessive upscaling', () => {
  const env = setup();
  env.flush();
  assert.equal(env.values.get('--spiral-size'), '1889px');
  env.panel.offsetWidth = 390;
  env.panel.offsetHeight = 844;
  env.stage.offsetHeight = 1182;
  env.listeners.get('resize').callback();
  env.flush();
  assert.equal(env.values.get('--spiral-size'), '932px');
});
test('foreground fades and rises gently with scroll, then restores on reverse scroll', () => {
  const env = setup();
  env.flush();
  assert.equal(env.panelValues.get('--hero-fade'), '0');
  assert.equal(env.panelValues.get('--hero-title-y'), '0px');
  assert.equal(env.panelValues.get('--hero-cat-y'), '0px');
  env.scroll(400);
  const firstFade = Number(env.panelValues.get('--hero-fade'));
  assert.ok(firstFade > 0 && firstFade < 1);
  assert.ok(parseFloat(env.panelValues.get('--hero-title-y')) < 0);
  assert.ok(parseFloat(env.panelValues.get('--hero-cat-y')) < 0);
  env.scroll(800);
  const releaseFade = Number(env.panelValues.get('--hero-fade'));
  assert.ok(releaseFade > firstFade && releaseFade < 1, 'fade continues while next section enters');
  env.scroll(1250);
  assert.equal(env.panelValues.get('--hero-fade'), '1');
  assert.equal(env.panelValues.get('--hero-title-y'), '-44px');
  assert.equal(env.panelValues.get('--hero-cat-y'), '-25px');
  assert.equal(env.frames.size, 0, 'no background easing loop');
  env.scroll(400);
  assert.equal(Number(env.panelValues.get('--hero-fade')), firstFade);
  env.scroll(0);
  assert.equal(env.panelValues.get('--hero-fade'), '0');
  assert.equal(env.panelValues.get('--hero-cat-y'), '0px');
});

test('reduced motion clears all foreground animation styles', () => {
  const env = setup();
  env.scroll(400);
  assert.ok(Number(env.panelValues.get('--hero-fade')) > 0);
  env.preference(true);
  assert.equal(env.panelValues.size, 0);
  assert.equal(env.frames.size, 0);
  assert.equal(env.listeners.has('scroll'), false);
  env.preference(false);
  env.flush();
  assert.ok(Number(env.panelValues.get('--hero-fade')) > 0);
});

test('mobile foreground travel stays proportional and small', () => {
  const env = setup();
  env.panel.offsetWidth = 390;
  env.panel.offsetHeight = 844;
  env.stage.offsetHeight = 1182;
  env.flush();
  env.scroll(844 * 2);
  assert.equal(env.panelValues.get('--hero-fade'), '1');
  assert.ok(Math.abs(parseFloat(env.panelValues.get('--hero-title-y'))) < 38);
  assert.ok(Math.abs(parseFloat(env.panelValues.get('--hero-cat-y'))) < 22);
});
test('spiral background fades across a broad scroll range and returns on reverse scroll', () => {
  const env = setup();
  env.flush();
  assert.equal(env.panelValues.get('--spiral-opacity'), '1');
  env.scroll(400);
  const middle = Number(env.panelValues.get('--spiral-opacity'));
  assert.ok(middle > 0 && middle < 1);
  env.scroll(800);
  const later = Number(env.panelValues.get('--spiral-opacity'));
  assert.ok(later > 0 && later < middle, 'fade continues after sticky release');
  env.scroll(1100);
  assert.equal(env.panelValues.get('--spiral-opacity'), '0');
  assert.equal(env.frames.size, 0);
  env.scroll(400);
  assert.equal(Number(env.panelValues.get('--spiral-opacity')), middle);
  env.scroll(-20);
  assert.equal(env.panelValues.get('--spiral-opacity'), '1');
});

test('background fade resets for reduced motion and scales to mobile viewport height', () => {
  const env = setup();
  env.panel.offsetWidth = 390;
  env.panel.offsetHeight = 844;
  env.stage.offsetHeight = 1182;
  env.flush();
  env.scroll(338);
  assert.ok(Number(env.panelValues.get('--spiral-opacity')) > 0);
  env.scroll(929);
  assert.equal(env.panelValues.get('--spiral-opacity'), '0');
  env.preference(true);
  assert.equal(env.panelValues.get('--spiral-opacity'), undefined);
  assert.equal(env.frames.size, 0);
  env.preference(false);
  env.flush();
  assert.equal(env.panelValues.get('--spiral-opacity'), '0');
  env.scroll(0);
  assert.equal(env.panelValues.get('--spiral-opacity'), '1');
});
test('React unmount cancels hero work and removes all listeners and inline animation state', () => {
  const env = setup();
  env.scroll(400);
  env.listeners.get('scroll').callback();
  assert.equal(env.frames.size, 1);
  env.dispose();
  assert.equal(env.frames.size, 0);
  assert.equal(env.listeners.size, 0);
  assert.equal(env.hasPreferenceListener(), false);
  assert.equal(env.classes.size, 0);
  assert.equal(env.panelValues.size, 0);
  assert.equal(env.values.size, 0);
});

test('spiral keeps rotating after sticky release until its fade finishes on desktop and mobile', () => {
  for (const [width, height, stageHeight] of [[1600, 1000, 1800], [390, 844, 1182]]) {
    const env = setup();
    env.panel.offsetWidth = width;
    env.panel.offsetHeight = height;
    env.stage.offsetHeight = stageHeight;
    env.flush();
    const release = stageHeight - height;
    const fadeEnd = Math.max(release, height * 1.1);
    env.scroll(release);
    const releaseAngle = parseFloat(env.angle());
    env.scroll((release + fadeEnd) / 2);
    const middleAngle = parseFloat(env.angle());
    assert.ok(middleAngle > releaseAngle, 'visible spiral continues to turn');
    assert.ok(Number(env.panelValues.get('--spiral-opacity')) > 0);
    env.scroll(fadeEnd);
    const finalAngle = env.angle();
    assert.ok(parseFloat(finalAngle) > middleAngle);
    assert.equal(env.panelValues.get('--spiral-opacity'), '0');
    env.scroll(fadeEnd + height);
    assert.equal(env.angle(), finalAngle, 'invisible spiral stops');
    env.scroll(release);
    assert.equal(parseFloat(env.angle()), releaseAngle, 'reverse scroll restores angle');
    assert.ok(Number(env.panelValues.get('--spiral-opacity')) > 0);
  }
});

test('spiral decelerates after scrolling stops, settles exactly and then stays idle', () => {
  const env = setup();
  env.flush();
  env.scroll(400, false);
  const first = parseFloat(env.angle());
  assert.ok(first > 0 && first < 75, 'scroll updates a target, not an instant rotation');
  const increments = [];
  let previous = first;
  for (let i = 0; i < 8; i++) {
    env.flush();
    const angle = parseFloat(env.angle());
    increments.push(angle - previous);
    assert.ok(angle > previous && angle < 75);
    previous = angle;
  }
  assert.ok(increments.every((value, i) => i === 0 || value < increments[i - 1]), 'motion slows progressively');
  env.settle();
  assert.equal(env.angle(), '75deg');
  const writes = env.writes();
  env.flush();
  assert.equal(env.writes(), writes);
});

test('spiral easing reverses toward the new target without overshoot', () => {
  const env = setup();
  env.flush();
  env.scroll(800, false);
  env.flush();
  const beforeReverse = parseFloat(env.angle());
  env.scroll(0, false);
  assert.ok(parseFloat(env.angle()) < beforeReverse);
  assert.ok(parseFloat(env.angle()) > 0);
  env.settle();
  assert.equal(env.angle(), '0deg');
});

test('rotation easing is consistent at 60 and 120 Hz', () => {
  const angles = [];
  for (const rate of [60, 120]) {
    const env = setup();
    env.flush();
    env.scroll(400, false);
    for (let i = 0; i < rate / 5; i++) env.flush(1000 / rate);
    angles.push(parseFloat(env.angle()));
    env.dispose();
  }
  assert.ok(Math.abs(angles[0] - angles[1]) < .02);
});
