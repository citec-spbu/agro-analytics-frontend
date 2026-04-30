import test from "node:test";
import assert from "node:assert/strict";

import {
  haFmt,
  sowingsCountWord,
  truncateCultureAxisLabel,
  yieldFmt,
} from "../src/utils/analyticsFormatters.js";

const numberCases = [
  [null, "—"],
  [undefined, "—"],
  [0, "0.00"],
  [1, "1.00"],
  [1.2, "1.20"],
  [1.234, "1.23"],
  [1.235, "1.24"],
  [-5.678, "-5.68"],
  ["10.5", "10.50"],
  [99999.999, "100000.00"],
];

for (const [index, [input, expected]] of numberCases.entries()) {
  test(`matrix haFmt/yieldFmt case #${index + 1}`, () => {
    assert.equal(haFmt(input), expected);
    assert.equal(yieldFmt(input), expected);
  });
}

const pluralCases = [
  [0, "посевов"],
  [1, "посев"],
  [2, "посева"],
  [3, "посева"],
  [4, "посева"],
  [5, "посевов"],
  [11, "посевов"],
  [21, "посев"],
  [24, "посева"],
  [101, "посев"],
];

for (const [index, [input, expected]] of pluralCases.entries()) {
  test(`matrix plural case #${index + 1}`, () => {
    assert.equal(sowingsCountWord(input), expected);
  });
}

const truncateCases = [
  ["Пшеница", 20, "Пшеница"],
  ["Очень длинное название культуры", 10, "Очень дли…"],
  ["Кукуруза", 8, "Кукуруза"],
  ["abcdefghij", 5, "abcd…"],
  ["abcdef", 6, "abcdef"],
];

for (const [index, [value, maxLen, expected]] of truncateCases.entries()) {
  test(`matrix truncate case #${index + 1}`, () => {
    assert.equal(truncateCultureAxisLabel(value, maxLen), expected);
  });
}
