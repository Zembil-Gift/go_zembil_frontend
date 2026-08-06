// Run: node --test src/utils/cdnImage.check.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cdnImage, cdnSrcSet } from './cdnImage.ts';

const CDN = 'https://img.gogerami.com';

test('rewrites CDN urls through the resize endpoint', () => {
  assert.equal(
    cdnImage(`${CDN}/products/12/abc.jpg`, 300),
    `${CDN}/cdn-cgi/image/width=300,quality=80,format=auto/products/12/abc.jpg`
  );
});

test('leaves non-CDN urls alone', () => {
  // local dev, placeholders and presigned delivery urls must pass through untouched
  assert.equal(cdnImage('/placeholder-product.jpg', 300), '/placeholder-product.jpg');
  assert.equal(
    cdnImage('http://localhost:8080/api/images/products/files/12/abc.jpg', 300),
    'http://localhost:8080/api/images/products/files/12/abc.jpg'
  );
  const presigned = 'https://acct.r2.cloudflarestorage.com/deliveries/5/x.png?X-Amz-Signature=abc';
  assert.equal(cdnImage(presigned, 300), presigned);
});

test('does not double-wrap an already transformed url', () => {
  const once = cdnImage(`${CDN}/products/12/abc.jpg`, 300);
  assert.equal(cdnImage(once, 600), once);
});

test('handles empty input', () => {
  assert.equal(cdnImage('', 300), '');
});

test('srcSet emits one candidate per width', () => {
  assert.equal(
    cdnSrcSet(`${CDN}/products/12/abc.jpg`, [200, 400]),
    `${CDN}/cdn-cgi/image/width=200,quality=80,format=auto/products/12/abc.jpg 200w, ` +
    `${CDN}/cdn-cgi/image/width=400,quality=80,format=auto/products/12/abc.jpg 400w`
  );
});

test('srcSet returns undefined off-CDN so the attribute is omitted', () => {
  assert.equal(cdnSrcSet('/placeholder-product.jpg', [200]), undefined);
});
