const timestampFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatTimestamp(epochMs: number): string {
  return timestampFormat.format(epochMs);
}
