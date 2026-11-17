// Text helpers shared by the popup hooks

/**
 * Writes a count with its noun.
 * @param count - The count.
 * @param noun - The singular noun.
 * @returns For example "1 URL" or "2 URLs".
 */
export function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
