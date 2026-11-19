const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderPortfolio } = require('./helpers.cjs');

test('rendered portfolio omits footer cat and rope while preserving hero cat', () => {
  const html = renderPortfolio();
  assert.doesNotMatch(html, /class="cat-yarn-scene|class="yarn-rope|assets\/cat-yarn\//);
  assert.match(html, /cat-transparent\.png/);
});
