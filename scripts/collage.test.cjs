const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('remaining five collage references are real local WebP assets with lazy loading', () => {
  const root = path.join(__dirname, '..');
  const html = require('./helpers.cjs').renderPortfolio();
  const images = [...html.matchAll(/<img\b[^>]*src="(assets\/collage\/[^"]+)"[^>]*>/g)];
  assert.equal(images.length, 5);
  for (const [, source] of images) {
    const bytes = fs.readFileSync(path.join(root, 'public', source));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length < 800 * 1024, source);
  }
  for (const [tag] of images) {
    assert.match(tag, /loading="lazy"/);
    assert.match(tag, /decoding="async"/);
    assert.match(tag, /width="\d+"/);
    assert.match(tag, /height="\d+"/);
  }
  assert.ok(!html.includes('Image to be added'));
  assert.ok(!html.includes('collage-blank'));
});
