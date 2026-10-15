const fullFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const compactFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatTimestamp(epochMs: number): string {
  return fullFormat.format(epochMs);
}

export function formatCompactTimestamp(epochMs: number): string {
  return compactFormat.format(epochMs);
}
