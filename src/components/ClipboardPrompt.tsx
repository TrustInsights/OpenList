// Popup clipboard button: asks once for the optional permission that reads copied URLs

/** What the prompt needs from the popup. */
interface ClipboardPromptProps {
  onEnable: () => void;
  onDismiss?: () => void;
}

/**
 * Renders the "Turn on clipboard detection" button and, when a dismiss action exists, "Not now".
 * @param props - The enable action and the optional dismiss action.
 * @returns The prompt block.
 */
export function ClipboardPrompt({ onEnable, onDismiss }: ClipboardPromptProps): React.JSX.Element {
  return (
    <div className="clipboard-prompt">
      <p className="hint">Finds copied URLs and enables the copy shortcut. Nothing is sent.</p>
      <div className="prompt-buttons">
        <button type="button" className="btn-plain" onClick={onEnable}>
          Turn on clipboard detection
        </button>
        {onDismiss && (
          <button type="button" className="btn-plain" onClick={onDismiss}>
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
