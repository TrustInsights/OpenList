// Error message block for the popup

interface ErrorDisplayProps {
  message: string;
  id?: string;
}

/**
 * Renders an error message.
 * The block has role="alert", so a screen reader announces it when it appears.
 * @param props - The message and the optional element id
 * @returns The error block element
 */
export function ErrorDisplay({ message, id }: ErrorDisplayProps): React.JSX.Element {
  return (
    <div className="error-container" role="alert" id={id}>
      <p className="error-message">{message}</p>
    </div>
  );
}
