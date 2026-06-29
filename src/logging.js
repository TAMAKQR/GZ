export function formatStatusSummary(items) {
  const counts = new Map();

  for (const item of items) {
    const status = item.status || 'NO_STATUS';
    counts.set(status, (counts.get(status) || 0) + 1);
  }

  if (counts.size === 0) return 'none';

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([status, count]) => `${status}:${count}`)
    .join(', ');
}
