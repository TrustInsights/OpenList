// Popup status line: one polite live region for every result message

/** What the line needs from the popup. */
interface StatusLineProps {
  message: string;
  /** Changes on every new result, so a repeated message is announced again. */
  id: string;
}

/**
 * Renders the status line. The element is always in the page, so a screen reader announces each change.
 * The text node is keyed by the id, so a new result with the same words replaces the old node.
 * @param props - The message and the id of the result. An empty message leaves the element empty.
 * @returns The status paragraph.
 */
export function StatusLine({ message, id }: StatusLineProps): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/useSemanticElements: an explicit role on a paragraph is the most widely announced live region
    <p className="status" role="status">
      {message === '' ? null : <span key={id}>{message}</span>}
    </p>
  );
}
