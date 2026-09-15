// Run: node --test src/lib/seo.check.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  absoluteUrl,
  clampDescription,
  productJsonLd,
  slugToLabel,
  withBrand,
} from './seo.ts';

test('withBrand does not double-brand a title that already carries it', () => {
  assert.equal(withBrand('Coffee Set'), 'Coffee Set | goGerami');
  // seo-routes.json titles already end in the brand; passing one through twice
  // must not produce "... | goGerami | goGerami".
  const branded = 'Shop Ethiopian Gifts Online | goGerami';
  assert.equal(withBrand(branded), branded);
});

test('clampDescription cuts on a word boundary and marks the cut', () => {
  const short = 'A short description.';
  assert.equal(clampDescription(short), short);

  const long = 'word '.repeat(60).trim();
  const out = clampDescription(long);
  assert.ok(out.length <= 160, `got ${out.length}`);
  assert.ok(out.endsWith('…'));
  assert.ok(!out.includes('  '));
  // must not end mid-word
  assert.ok(/(\w|…)$/.test(out));
});

test('clampDescription collapses whitespace', () => {
  assert.equal(clampDescription('a\n\n  b\tc'), 'a b c');
});

test('clampDescription falls back to a hard cut when there is no space to cut on', () => {
  const out = clampDescription('x'.repeat(300));
  assert.equal(out.length, 160);
  assert.ok(out.endsWith('…'));
});

test('absoluteUrl passes absolute urls through and prefixes relative ones', () => {
  assert.equal(absoluteUrl('/shop'), 'https://gogerami.com/shop');
  assert.equal(absoluteUrl('shop'), 'https://gogerami.com/shop');
  const cdn = 'https://img.gogerami.com/products/1/a.jpg';
  assert.equal(absoluteUrl(cdn), cdn);
});

test('slugToLabel title-cases a slug', () => {
  assert.equal(slugToLabel('coffee-gift-sets'), 'Coffee Gift Sets');
  assert.equal(slugToLabel('mothers_day'), 'Mothers Day');
});

// The one that actually costs money if it breaks: an Offer with a price but no
// currency (or the wrong currency) advertises a price no visitor is shown.
test('productJsonLd emits offers only when price AND currency are both present', () => {
  const base = { name: 'Coffee Set', path: '/product/1' };

  assert.equal(productJsonLd(base).offers, undefined);
  assert.equal(productJsonLd({ ...base, price: 100 }).offers, undefined);
  assert.equal(productJsonLd({ ...base, currency: 'ETB' }).offers, undefined);

  const offers = productJsonLd({ ...base, price: 100, currency: 'ETB', inStock: true })
    .offers as Record<string, unknown>;
  assert.equal(offers.price, '100');
  assert.equal(offers.priceCurrency, 'ETB');
  assert.equal(offers.availability, 'https://schema.org/InStock');
});

test('productJsonLd marks out-of-stock and omits an empty rating', () => {
  const node = productJsonLd({
    name: 'X',
    path: '/product/2',
    price: 5,
    currency: 'USD',
    inStock: false,
  });
  assert.equal(
    (node.offers as Record<string, unknown>).availability,
    'https://schema.org/OutOfStock'
  );
  // a rating with no reviews behind it is a structured-data violation
  assert.equal(node.aggregateRating, undefined);
});

test('productJsonLd absolutises every image and drops empty ones', () => {
  const node = productJsonLd({
    name: 'X',
    path: '/product/3',
    image: ['/a.jpg', '', 'https://img.gogerami.com/b.jpg'],
  });
  assert.deepEqual(node.image, [
    'https://gogerami.com/a.jpg',
    'https://img.gogerami.com/b.jpg',
  ]);
});
