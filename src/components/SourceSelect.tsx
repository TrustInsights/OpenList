// Popup "From" control: a native select that picks where the list comes from

import type { SourceId } from '@/schemas/settings';

/** What the control needs from the popup. */
interface SourceSelectProps {
  options: ReadonlyArray<{ id: SourceId; label: string }>;
  value: SourceId;
  onChange: (id: SourceId) => void;
}

/**
 * Renders the "From" label and select. A value that is not an option is ignored.
 * @param props - The options with their labels, the chosen id, and the change handler.
 * @returns The labelled select.
 */
export function SourceSelect({ options, value, onChange }: SourceSelectProps): React.JSX.Element {
  return (
    <div className="source">
      <label htmlFor="source">From</label>
      <select
        id="source"
        value={value}
        onChange={(event) => {
          const match = options.find((option) => option.id === event.target.value);
          if (match) onChange(match.id);
        }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
