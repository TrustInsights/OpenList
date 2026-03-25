interface StatusBarProps {
  message: string;
}

/**
 * Displays the last operation status message.
 */
export function StatusBar({ message }: StatusBarProps) {
  return <span id="status">{message}</span>;
}
