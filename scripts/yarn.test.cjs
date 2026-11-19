require('./helpers.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildYarnPath } = require('../src/lib/yarnPath.ts');

function fixture(width = 1280, gutter = 90) {
  const sections = [];
  let top = 1000;
  for (const height of [580, 620, 450, 480, 750, 560, 530]) {
    sections.push({ left: gutter, top, width: width - gutter * 2, height });
    top += height;
  }
  const obstacles = sections.map(section => ({ ...section, top: section.top + 52, height: section.height - 104 }));
  return { width, height: top + 100, gutter, sections, obstacles };
}

function sample(d) {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  let x = numbers[0];
  let y = numbers[1];
  const points = [[x, y]];
  for (let i = 2; i < numbers.length; i += 6) {
    const [ax, ay, bx, by, ex, ey] = numbers.slice(i, i + 6);
    for (let j = 1; j <= 120; j++) {
      const t = j / 120;
      const u = 1 - t;
      points.push([u ** 3 * x + 3 * u ** 2 * t * ax + 3 * u * t ** 2 * bx + t ** 3 * ex,
        u ** 3 * y + 3 * u ** 2 * t * ay + 3 * u * t ** 2 * by + t ** 3 * ey]);
    }
    x = ex;
    y = ey;
  }
  return points;
}

test('one open yarn path stays continuous from page top to footer without crossing text', () => {
  const layout = fixture();
  const d = buildYarnPath(layout);
  assert.equal((d.match(/M/g) || []).length, 1, 'one continuous stroke');
  assert.ok(!/[LZ]/.test(d), 'soft curves with no straight technical connectors or closed loops');
  const points = sample(d);
  assert.equal(points[0][1], 0);
  assert.equal(points.at(-1)[1], layout.height - 12);
  for (const [x, y] of points) {
    assert.ok(x >= 0 && x <= layout.width && y >= 0 && y <= layout.height);
    assert.ok(!layout.obstacles.some(box => x > box.left && x < box.left + box.width && y > box.top && y < box.top + box.height));
  }
  assert.ok(Math.max(...points.map(([x]) => x)) - Math.min(...points.map(([x]) => x)) > 15, 'irregular curves have visible lateral movement');
});

test('mobile yarn stays within narrow gutters and crosses only in content gaps', () => {
  for (const width of [320, 375, 430, 768]) {
    const layout = fixture(width, 20);
    for (const [x, y] of sample(buildYarnPath(layout))) {
      assert.ok(x >= 0 && x <= width);
      assert.ok(!layout.obstacles.some(box => x > box.left && x < box.left + box.width && y > box.top && y < box.top + box.height));
    }
  }
});

test('yarn adapts when projects or other content increases the page height', () => {
  const before = fixture();
  const after = fixture();
  after.sections[4].height += 500;
  after.obstacles[4].height += 500;
  for (let i = 5; i < after.sections.length; i++) {
    after.sections[i].top += 500;
    after.obstacles[i].top += 500;
  }
  after.height += 500;
  assert.notEqual(buildYarnPath(before), buildYarnPath(after));
  const points = sample(buildYarnPath(after));
  assert.equal(points.at(-1)[1], after.height - 12);
  for (const [x, y] of points) {
    assert.ok(!after.obstacles.some(box => x > box.left && x < box.left + box.width && y > box.top && y < box.top + box.height));
  }
});

test('yarn skips a side change if there is no safe crossing gap', () => {
  const layout = fixture(375, 20);
  layout.obstacles = [{ left: 20, top: 1000, width: 335, height: layout.height - 1000 }];
  for (const [x, y] of sample(buildYarnPath(layout))) {
    if (y > 1000) assert.ok(x < 20);
  }
});

test('organic rope has no horizontal crossbars and continuous tangents at joins', () => {
  for (const width of [320, 430, 1280, 1920]) {
    const layout = fixture(width, width < 800 ? 20 : 110);
    const values = buildYarnPath(layout).match(/-?\d+(?:\.\d+)?/g).map(Number);
    let start = { x: values[0], y: values[1] };
    let previousTangent = null;
    const heights = [];
    for (let i = 2; i < values.length; i += 6) {
      const [ax, ay, bx, by, x, y] = values.slice(i, i + 6);
      assert.ok(ay > start.y && by > ay && y > by, 'every part must keep descending');
      const incoming = { x: ax - start.x, y: ay - start.y };
      const outgoing = { x: x - bx, y: y - by };
      if (previousTangent) {
        const cross = previousTangent.x * incoming.y - previousTangent.y * incoming.x;
        assert.ok(Math.abs(cross) < .001, 'tangent direction must remain continuous');
      }
      assert.ok(Math.abs(x - start.x) < (y - start.y) * .65, 'no page-wide sideways connectors');
      heights.push(y - start.y);
      previousTangent = outgoing;
      start = { x, y };
    }
    assert.ok(Math.max(...heights.slice(0, -1)) - Math.min(...heights.slice(0, -1)) > 60, 'curves must not repeat at one interval');
  }
});

test('physics particles start on the organic route rather than an old grid', () => {
  const { sampleYarnContour, YarnPhysics } = require('../src/lib/yarnPhysics.ts');
  const layout = fixture();
  const particles = sampleYarnContour(buildYarnPath(layout));
  const model = new YarnPhysics(particles, layout.width, layout.height, layout.obstacles);
  let leftward = false;
  let rightward = false;
  for (let i = 1; i < model.nodes.length; i++) {
    const a = model.nodes[i - 1].rest;
    const b = model.nodes[i].rest;
    assert.ok(b.y > a.y);
    assert.ok(Math.abs(b.x - a.x) < (b.y - a.y) * .95);
    leftward ||= b.x - a.x < -.25;
    rightward ||= b.x - a.x > .25;
  }
  assert.ok(leftward && rightward, 'the rest shape must naturally bend both ways');
});
