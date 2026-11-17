// Popup action row: the filled Open button and the plain Copy button

/** What the buttons need from the popup. */
interface ActionButtonsProps {
  openLabel: string;
  copyLabel: string;
  onOpen: () => void;
  onCopy: () => void;
  disabled: boolean;
  /** True when every URL is already open, so Open has nothing to do. */
  openDisabled: boolean;
}

/**
 * Renders Open and Copy in a fixed order. Open is filled. Copy is plain.
 * @param props - The two labels, the two actions, the disabled state, and whether Open has nothing to open.
 * @returns The row of two buttons.
 */
export function ActionButtons({
  openLabel,
  copyLabel,
  onOpen,
  onCopy,
  disabled,
  openDisabled,
}: ActionButtonsProps): React.JSX.Element {
  return (
    <div className="actions">
      <button
        type="button"
        className="btn-open"
        disabled={disabled || openDisabled}
        onClick={onOpen}
      >
        {openLabel}
      </button>
      <button type="button" className="btn-copy" disabled={disabled} onClick={onCopy}>
        {copyLabel}
      </button>
    </div>
  );
}
