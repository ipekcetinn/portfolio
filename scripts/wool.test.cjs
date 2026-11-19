const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers.cjs');
const { YarnPhysics } = require('../src/lib/yarnPhysics.ts');
const { createYarnMaterial, sampleYarnAppearance } = require('../src/lib/yarnAppearance.ts');

function fixture() {
  const points = Array.from({ length: 100 }, (_, i) => ({ x: 110 + Math.sin(i * .17) * 12, y: i * 20 }));
  const model = new YarnPhysics(points, 390, 2000);
  return { model, material: createYarnMaterial(points) };
}

test('wool geometry is deterministic and never mutates physics state', () => {
  const { model, material } = fixture();
  const before = JSON.stringify(model.nodes);
  const range = { start: 10, end: 55 };
  const first = sampleYarnAppearance(model.nodes, range, material, 0, 390);
  const next = sampleYarnAppearance(model.nodes, range, material, 0, 390);
  assert.deepEqual(first, next);
  assert.equal(JSON.stringify(model.nodes), before);
  assert.ok(first.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  const radii = first.map(p => p.radius);
  assert.ok(Math.max(...radii) - Math.min(...radii) > .08);
  assert.ok(radii.every(radius => radius > 1.35 && radius < 1.8));
  const hairs = first.filter(p => p.hair);
  assert.ok(hairs.length > 10 && hairs.length < first.length * .2);
  assert.ok(hairs.every(p => p.hairLength <= 2.25));
});

test('scroll and local simulation window changes cannot reseed wool texture', () => {
  const { model, material } = fixture();
  const a = sampleYarnAppearance(model.nodes, { start: 10, end: 55 }, material, 0, 390);
  const b = sampleYarnAppearance(model.nodes, { start: 18, end: 64 }, material, 375, 390);
  const byMaterial = new Map(b.map(p => [p.material, p]));
  const shared = a.filter(p => p.material > 400 && p.material < 1000);
  assert.ok(shared.length > 100);
  for (const p of shared) {
    const q = byMaterial.get(p.material);
    assert.ok(q);
    assert.equal(q.x, p.x);
    assert.ok(Math.abs(q.y + 375 - p.y) < 1e-9);
    for (const key of ['radius', 'twist', 'hair', 'hairLength', 'hairAlong']) assert.equal(q[key], p[key]);
  }
});

test('material follows moving nodes instead of staying attached to the screen', () => {
  const { model, material } = fixture();
  const range = { start: 10, end: 55 };
  const before = sampleYarnAppearance(model.nodes, range, material, 0, 390);
  for (const node of model.nodes) { node.pos.x += 15; node.pos.y += 9; }
  const after = sampleYarnAppearance(model.nodes, range, material, 0, 390);
  before.forEach((p, i) => {
    const q = after[i];
    assert.ok(Math.abs(q.x - p.x - 15) < 1e-8);
    assert.ok(Math.abs(q.y - p.y - 9) < 1e-8);
    assert.equal(q.radius, p.radius);
    assert.equal(q.hair, p.hair);
    assert.equal(q.twist, p.twist);
  });
});

test('a right-angle physics corner renders as a gradual bend with anchored endpoints', () => {
  const points = [];
  for (let i = 0; i <= 20; i++) points.push({ x: 70, y: i * 20 });
  for (let i = 1; i <= 20; i++) points.push({ x: 70 + i * 20, y: 400 });
  const model = new YarnPhysics(points, 600, 800);
  const samples = sampleYarnAppearance(model.nodes, model.range, createYarnMaterial(points), 0, 600);
  let maxTurn = 0;
  for (let i = 1; i < samples.length - 1; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    const c = samples[i + 1];
    const incoming = Math.atan2(b.y - a.y, b.x - a.x);
    const outgoing = Math.atan2(c.y - b.y, c.x - b.x);
    const difference = outgoing - incoming;
    maxTurn = Math.max(maxTurn, Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference))));
  }
  assert.ok(maxTurn < 10 * Math.PI / 180, 'the turn must be distributed, with no abrupt visible corner');
  assert.equal(samples[0].x, points[0].x);
  assert.equal(samples[0].y, points[0].y);
  assert.equal(samples.at(-1).x, points.at(-1).x);
  assert.equal(samples.at(-1).y, points.at(-1).y);
});
