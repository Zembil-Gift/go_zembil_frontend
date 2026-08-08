// Run: node --test src/lib/countryConfig.check.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PAYMENT_METHODS,
  getPaymentMethodsForCountry,
  getDefaultPaymentMethod,
  isPaymentMethodAvailable,
} from './countryConfig.ts';

test('unknown country offers every payment method', () => {
  // user?.country is "" for most signups (Google/Apple never supply it)
  assert.deepEqual(getPaymentMethodsForCountry(''), ALL_PAYMENT_METHODS);
  assert.deepEqual(getPaymentMethodsForCountry('Narnia'), ALL_PAYMENT_METHODS);
  assert.equal(isPaymentMethodAvailable('', 'telebirr'), true);
});

test('known countries stay narrowed', () => {
  assert.deepEqual(getPaymentMethodsForCountry('Ethiopia'), ['chapa', 'telebirr']);
  assert.deepEqual(getPaymentMethodsForCountry('United States'), ['stripe']);
  assert.equal(isPaymentMethodAvailable('United States', 'telebirr'), false);
});

test('unknown country still defaults to stripe', () => {
  // widest availability wins the preselect; user can switch
  assert.equal(getDefaultPaymentMethod(''), 'stripe');
  assert.equal(getDefaultPaymentMethod('Ethiopia'), 'chapa');
});
