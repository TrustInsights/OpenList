// Formatting utilities for display values

/**
 * Formats a duration in milliseconds into a human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted string e.g. "2h 30m", "5m 10s", "42s"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) return `${hours}h ${totalMinutes % 60}m`;
  if (totalMinutes > 0) return `${totalMinutes}m ${totalSeconds % 60}s`;
  return `${totalSeconds}s`;
}
