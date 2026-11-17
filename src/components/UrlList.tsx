// Popup list: the labelled text box that holds the URLs, one per line

import { useEffect, useRef } from 'react';

/** What the list needs from the popup. */
interface UrlListProps {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  describedBy?: string;
  onOpen: () => void;
}

/**
 * Renders the label and the text box of the list.
 * The box takes focus on mount. The first text that arrives is selected, so a paste replaces it.
 * Text the user typed is never selected. Ctrl+Enter or Cmd+Enter runs Open.
 * @param props - The text, its change handler, the invalid state, the id of the error, and the Open action.
 * @returns The label and the text box, as siblings for the popup grid.
 */
export function UrlList({
  value,
  onChange,
  invalid,
  describedBy,
  onOpen,
}: UrlListProps): React.JSX.Element {
  const box = useRef<HTMLTextAreaElement>(null);
  const selected = useRef(false);
  const typed = useRef(false);

  useEffect(() => {
    box.current?.focus();
  }, []);

  useEffect(() => {
    if (selected.current || typed.current || value === '') return;
    box.current?.select();
    selected.current = true;
  }, [value]);

  return (
    <>
      <label className="list-label" htmlFor="list">
        URLs, one per line
      </label>
      <textarea
        id="list"
        className="list-box"
        ref={box}
        value={value}
        onChange={(event) => {
          typed.current = true;
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onOpen();
          }
        }}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        placeholder="Paste URLs here. Other text becomes a web search."
        spellCheck={false}
      />
    </>
  );
}
