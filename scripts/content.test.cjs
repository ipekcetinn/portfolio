const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderPortfolio } = require('./helpers.cjs');
const html = renderPortfolio();

test('English CV content retains all requested sections and working anchor targets', () => {
  assert.match(html, /<html lang="en">/);
  for (const id of ['about-title','experience-title','education-title','skills-title','training-title','projects-title','contact-title']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  assert.ok(!/>(?:Eğitim|Projeler|İletişim|Yukarı|Görsel eklenecek)</.test(html));
});

test('contact has approved URLs and no phone or PDF download', () => {
  for (const href of ['mailto:ipekcetin05@gmail.com','https://github.com/ipekcetinn','https://www.linkedin.com/in/ipekcetin/']) {
    assert.ok(html.includes('href="' + href + '"'), href);
  }
  assert.ok(!/href=["']tel:/i.test(html));
  assert.ok(!/(?:\+90|0?5\d{2})[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/.test(html.replace(/<[^>]*>/g, ' ')));
  assert.ok(!/href=["'][^"']*\.pdf(?:[?#][^"']*)?["']/i.test(html));
  const ignored = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8').split(/\r?\n/);
  assert.ok(ignored.includes('/cv.pdf'));
  assert.ok(!fs.existsSync(path.join(__dirname, '../public/cv.pdf')));
  const config = fs.readFileSync(path.join(__dirname, '../vite.config.ts'), 'utf8');
  assert.ok(config.includes('**/cv.pdf'));
});

test('projects remain empty and training records preserve distinct dates', () => {
  assert.ok(html.includes('00 ENTRIES'));
  assert.equal((html.match(/class="training-entry"/g) || []).length, 3);
  for (const date of ['2026-02','2025-08','2025-02']) {
    assert.ok(html.toLowerCase().includes('datetime="' + date + '"'));
  }
  assert.ok(html.toLowerCase().includes('datetime="2026-07-12"'));
  assert.ok(html.includes('2023 — 2027 / EXPECTED'));
  assert.ok(!html.includes('94.56/100'));
  assert.ok(!/High School|Adana Anatolian|2019 — 2023/.test(html));
  assert.equal((html.match(/class="academic-entry"/g) || []).length, 1);
  const descriptions = [...html.matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/g)]
    .map(match => match[1].replace(/<[^>]*>/g, ' ')).join(' ');
  assert.ok(!/\b(?:I|I'm|I've|I'll|I'd|my|mine|me|myself)\b/i.test(descriptions));
});
