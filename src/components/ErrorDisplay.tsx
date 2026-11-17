// Error message and detail list for the popup

const MAX_VISIBLE_ERRORS = 3;

interface ErrorDisplayProps {
  message: string;
  details?: string[];
  id?: string;
}

/**
 * Renders an error message and up to 3 detail lines.
 * The block has role="alert", so a screen reader announces it when it appears.
 * @param props - The message, the optional detail lines, and the optional element id
 * @returns The error block element
 */
export function ErrorDisplay({ message, details = [], id }: ErrorDisplayProps): React.JSX.Element {
  const visible = details.slice(0, MAX_VISIBLE_ERRORS);
  const overflow = details.length - MAX_VISIBLE_ERRORS;

  return (
    <div className="error-container" role="alert" id={id}>
      <p className="error-message">{message}</p>
      {details.length > 0 && (
        <ul className="error-details">
          {visible.map((d, i) => (
            <li key={`${i}-${d}`}>{d}</li>
          ))}
          {overflow > 0 && <li>...and {overflow} more errors</li>}
        </ul>
      )}
    </div>
  );
}
