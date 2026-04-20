export function haFmt(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toFixed(2);
}

export function yieldFmt(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toFixed(2);
}

export function sowingsCountWord(value) {
  const n = Math.abs(Math.trunc(Number(value))) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return 'посевов';
  if (n1 > 1 && n1 < 5) return 'посева';
  if (n1 === 1) return 'посев';
  return 'посевов';
}

export function truncateCultureAxisLabel(value, maxLen = 34) {
  const text = String(value);
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}
