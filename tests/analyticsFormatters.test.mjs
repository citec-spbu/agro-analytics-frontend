import test from 'node:test';
import assert from 'node:assert/strict';

import {
  haFmt,
  sowingsCountWord,
  truncateCultureAxisLabel,
  yieldFmt,
} from '../src/utils/analyticsFormatters.js';

test('haFmt/yieldFmt return dash for empty values and fixed decimals for numbers', () => {
  assert.equal(haFmt(null), '—');
  assert.equal(yieldFmt(undefined), '—');
  assert.equal(haFmt(12), '12.00');
  assert.equal(yieldFmt(7.236), '7.24');
});

test('sowingsCountWord returns correct russian plural forms', () => {
  assert.equal(sowingsCountWord(1), 'посев');
  assert.equal(sowingsCountWord(2), 'посева');
  assert.equal(sowingsCountWord(5), 'посевов');
  assert.equal(sowingsCountWord(11), 'посевов');
  assert.equal(sowingsCountWord(24), 'посева');
});

test('truncateCultureAxisLabel keeps short labels and truncates long labels', () => {
  assert.equal(truncateCultureAxisLabel('Пшеница', 20), 'Пшеница');
  const long = 'Очень длинное название культуры для оси диаграммы';
  const truncated = truncateCultureAxisLabel(long, 14);
  assert.equal(truncated.length, 14);
  assert.equal(truncated.endsWith('…'), true);
});
