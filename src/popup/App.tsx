// Popup root component: wires the state hooks to the components in the design layout order

import { ActionButtons } from '@/components/ActionButtons';
import { ClipboardPrompt } from '@/components/ClipboardPrompt';
import { DetailsPanel } from '@/components/DetailsPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Footer } from '@/components/Footer';
import { FormatSelect } from '@/components/FormatSelect';
import { SourceSelect } from '@/components/SourceSelect';
import { StatusLine } from '@/components/StatusLine';
import { UrlList } from '@/components/UrlList';
import { useDetails } from '@/hooks/useDetails';
import { useFormat } from '@/hooks/useFormat';
import { EMPTY_LIST_ERROR, useListActions } from '@/hooks/useListActions';
import { useSources } from '@/hooks/useSources';
import { useEffect, useState } from 'react';

/**
 * Renders the popup. One list holds the URLs. Open and Copy both work on that list.
 * The status line shows the newest message from a source change or from an action.
 * While Details is open, the clipboard button moves into it, so the popup stays within 600 px.
 * @returns The popup content.
 */
function PopupContent(): React.JSX.Element {
  const sources = useSources();
  const { format, changeFormat } = useFormat();
  const details = useDetails();
  const actions = useListActions({
    text: sources.text,
    setText: sources.setText,
    known: sources.known,
    format,
  });
  const [status, setStatus] = useState({ text: '', id: 'start' });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { notice, noticeSeq } = sources;
  const { status: actionStatus, statusSeq } = actions;

  // A new write counts even when its text equals the old text. The id names the write.
  useEffect(() => {
    setStatus({ text: notice, id: `notice-${noticeSeq}` });
  }, [notice, noticeSeq]);
  useEffect(() => {
    setStatus({ text: actionStatus, id: `action-${statusSeq}` });
  }, [actionStatus, statusSeq]);

  const open = (): void => {
    if (actions.running) return;
    void (async (): Promise<void> => {
      await actions.open();
      await details.refresh();
    })();
  };
  // The empty-list error goes away as soon as the user types.
  const typedSince = actions.error === EMPTY_LIST_ERROR && sources.text.trim() !== '';
  const error = typedSince ? null : actions.error;
  const emptyListError = error === EMPTY_LIST_ERROR;

  return (
    <main className="popup">
      <h1>OpenList</h1>
      <div className="list-area">
        <UrlList
          value={sources.text}
          onChange={sources.setText}
          invalid={emptyListError}
          describedBy={emptyListError ? 'list-error' : undefined}
          onOpen={open}
          readOnly={actions.running}
        />
        <SourceSelect
          options={sources.options}
          value={sources.source}
          onChange={sources.changeSource}
        />
      </div>
      {error !== null && <ErrorDisplay id="list-error" message={error} />}
      <ActionButtons
        openLabel={actions.openLabel}
        copyLabel={actions.copyLabel}
        onOpen={open}
        onCopy={() => void actions.copy()}
        disabled={actions.running}
        openDisabled={actions.allOpen}
      />
      <FormatSelect value={format} onChange={changeFormat} example={actions.example} />
      <StatusLine message={status.text} id={status.id} />
      {sources.clipboardPrompt === 'button' && !detailsOpen && (
        <ClipboardPrompt
          onEnable={() => void sources.enableClipboard()}
          onDismiss={sources.dismissPrompt}
        />
      )}
      <DetailsPanel
        totals={details.totals}
        openSince={details.openSince}
        onRefresh={() => void details.refresh()}
        onToggle={setDetailsOpen}
      >
        {(sources.clipboardPrompt === 'details' ||
          (sources.clipboardPrompt === 'button' && detailsOpen)) && (
          <ClipboardPrompt onEnable={() => void sources.enableClipboard()} />
        )}
      </DetailsPanel>
      <Footer />
    </main>
  );
}

/**
 * Wraps the popup content in the error boundary.
 * @returns The popup.
 */
export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <PopupContent />
    </ErrorBoundary>
  );
}
