// Error display component — replaces showError() DOM manipulation

const MAX_VISIBLE_ERRORS = 3;

interface ErrorDisplayProps {
  message: string;
  details?: string[];
}

export function ErrorDisplay({ message, details = [] }: ErrorDisplayProps) {
  const visible = details.slice(0, MAX_VISIBLE_ERRORS);
  const overflow = details.length - MAX_VISIBLE_ERRORS;

  return (
    <div className="error-container">
      <p className="error-message">{message}</p>
      {details.length > 0 && (
        <ul className="error-details">
          {visible.map((d) => (
            <li key={d}>{d}</li>
          ))}
          {overflow > 0 && <li>...and {overflow} more errors</li>}
        </ul>
      )}
    </div>
  );
}
