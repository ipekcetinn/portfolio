const { animationCode } = require('./helpers.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

function setup(reduced = false) {
  const events = new Map();
  const frames = new Map();
  const classes = new Set();
  const preferences = [];
  let nextFrame = 1;
  let writes = 0;
  class Element {
    constructor(top) {
      this.top = top;
      this.values = new Map();
      this.style = {
        setProperty: (key, value) => { this.values.set(key, value); writes++; },
        removeProperty: (key) => this.values.delete(key),
      };
    }
    getBoundingClientRect() { return { top: this.top - browser.scrollY + (parseFloat(this.values.get('--reveal-y')) || 0) }; }
  }
  const items = [new Element(1400), new Element(2000)];
  const surface = {
    querySelectorAll: () => items,
    classList: {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
    },
  };
  const browser = {
    scrollY: 0,
    innerHeight: 800,
    matchMedia: () => {
      const preference = { matches: reduced, addEventListener: (name, callback) => { preference.change = callback; }, removeEventListener: () => { preference.change = undefined; } };
      preferences.push(preference);
      return preference;
    },
    requestAnimationFrame: (callback) => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
    addEventListener: (name, callback, options) => events.set(name, { callback, options }),
    removeEventListener: (name) => events.delete(name),
  };
  const context = {
    window: browser,
    document: { getElementById: (id) => id === 'about' ? surface : null },
    HTMLElement: Element,
  };
  vm.runInNewContext(animationCode(), context);
  function flush() {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback());
  }
  function scroll(y) {
    browser.scrollY = y;
    events.get('scroll')?.callback();
    flush();
  }
  return {
    items, events, frames, classes, browser, flush, scroll,
    dispose: () => context.disposeAnimations(),
    hasPreferenceListener: () => Boolean(preferences[0].change),
    writes: () => writes,
    motion: (matches) => {
      preferences[0].matches = matches;
      preferences[0].change();
    },
  };
}

test('editorial items reveal from position and reverse without a timed loop', () => {
  const env = setup();
  env.flush();
  assert.equal(env.items[0].values.get('--reveal-opacity'), '0');
  env.scroll(900);
  const middle = Number(env.items[0].values.get('--reveal-opacity'));
  assert.ok(middle > 0 && middle < 1);
  assert.ok(parseFloat(env.items[0].values.get('--reveal-y')) > 0);
  env.scroll(1200);
  assert.equal(env.items[0].values.get('--reveal-opacity'), '1');
  assert.equal(env.items[0].values.get('--reveal-y'), '0.00px');
  assert.equal(env.frames.size, 0);
  env.scroll(900);
  assert.equal(Number(env.items[0].values.get('--reveal-opacity')), middle);
  env.scroll(0);
  assert.equal(env.items[0].values.get('--reveal-opacity'), '0');
});

test('reduced motion leaves every item visible and clears scroll work', () => {
  const initial = setup(true);
  assert.equal(initial.frames.size, 0);
  assert.equal(initial.events.has('scroll'), false);
  assert.equal(initial.classes.has('reveal-ready'), false);
  const env = setup();
  env.scroll(900);
  env.motion(true);
  assert.equal(env.items[0].values.size, 0);
  assert.equal(env.classes.has('reveal-ready'), false);
  assert.equal(env.events.has('scroll'), false);
  env.motion(false);
  env.flush();
  assert.ok(Number(env.items[0].values.get('--reveal-opacity')) > 0);
});

test('reveal events coalesce, avoid idle writes and recalculate after mobile resize', () => {
  const env = setup();
  env.flush();
  assert.equal(env.events.get('scroll').options.passive, true);
  const writes = env.writes();
  for (let i = 0; i < 20; i++) env.events.get('scroll').callback();
  assert.equal(env.frames.size, 1);
  env.flush();
  assert.equal(env.writes(), writes);
  env.browser.innerHeight = 844;
  env.events.get('resize').callback();
  env.flush();
  env.scroll(950);
  assert.ok(Number(env.items[0].values.get('--reveal-opacity')) > 0);
});

test('repeated geometry measurements do not accumulate reveal transforms', () => {
  const env = setup();
  env.scroll(900);
  const initialOpacity = Number(env.items[0].values.get('--reveal-opacity'));
  for (let i = 0; i < 5; i++) {
    env.events.get('resize').callback();
    env.flush();
  }
  assert.ok(Math.abs(Number(env.items[0].values.get('--reveal-opacity')) - initialOpacity) <= .001);
  env.motion(true);
  env.motion(false);
  env.flush();
  assert.ok(Math.abs(Number(env.items[0].values.get('--reveal-opacity')) - initialOpacity) <= .001);
});
test('React unmount clears editorial reveal work and preference listeners', () => {
  const env = setup();
  env.scroll(900);
  env.events.get('scroll').callback();
  env.dispose();
  assert.equal(env.frames.size, 0);
  assert.equal(env.events.size, 0);
  assert.equal(env.hasPreferenceListener(), false);
  assert.equal(env.classes.size, 0);
  for (const item of env.items) assert.equal(item.values.size, 0);
});
