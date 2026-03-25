// Status message display — replaces setStatus/clearStatus DOM manipulation

interface StatusBarProps {
  message: string;
  isError?: boolean;
}

export function StatusBar({ message, isError = false }: StatusBarProps) {
  return (
    <span id="status" className={isError ? 'error' : undefined}>
      {message}
    </span>
  );
}
