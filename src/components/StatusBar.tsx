interface StatusBarProps {
  message: string;
}

export function StatusBar({ message }: StatusBarProps) {
  return <span id="status">{message}</span>;
}
