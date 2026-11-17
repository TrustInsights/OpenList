// Popup "Copy as" control: a native select with three groups and a one-line example

import { FORMAT_GROUPS, type Format, FormatSchema } from '@/schemas/settings';

/** What the control needs from the popup. */
interface FormatSelectProps {
  value: Format;
  onChange: (format: Format) => void;
  example: string;
}

/**
 * Renders the "Copy as" label and select, and the example line that the select points to.
 * A value that is not a format is ignored.
 * @param props - The chosen format, the change handler, and the first item in this format.
 * @returns The labelled select and the example paragraph.
 */
export function FormatSelect({ value, onChange, example }: FormatSelectProps): React.JSX.Element {
  return (
    <>
      <div className="format">
        <label htmlFor="format">Copy as</label>
        <select
          id="format"
          value={value}
          aria-describedby="format-example"
          onChange={(event) => {
            const parsed = FormatSchema.safeParse(event.target.value);
            if (parsed.success) onChange(parsed.data);
          }}
        >
          {FORMAT_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.formats.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <p className="example" id="format-example">
        {example === '' ? '' : `Example: ${example}`}
      </p>
    </>
  );
}
