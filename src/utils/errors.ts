// Error utility helpers

/**
 * Extracts a string message from an unknown caught value.
 * Use in catch blocks where the error type is unknown.
 * @param err - The caught value
 * @returns A human-readable error string
 */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
