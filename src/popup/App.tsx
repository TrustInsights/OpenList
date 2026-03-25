import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Footer } from '@/components/Footer';
import { MetricsGrid } from '@/components/MetricsGrid';
import { StatusBar } from '@/components/StatusBar';
import { useMetrics } from '@/hooks/useMetrics';
import { useOpenUrls } from '@/hooks/useOpenUrls';
import { GetCurrentTabUrlsMessageSchema } from '@/schemas/messages';
import { useEffect, useRef, useState } from 'react';

function PopupContent() {
  const [urlText, setUrlText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isLoading, result, error, openUrls } = useOpenUrls();
  const metrics = useMetrics();

  useEffect(() => {
    textareaRef.current?.focus();
    chrome.runtime
      .sendMessage(GetCurrentTabUrlsMessageSchema.parse({ action: 'getCurrentTabUrls' }))
      .then((urls: unknown) => {
        if (Array.isArray(urls) && urls.length > 0) {
          setUrlText((urls as string[]).join('\n'));
        }
      })
      .catch(() => {
        // Silently ignore — textarea stays empty
      });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      void openUrls(urlText);
    }
  };

  const statusMessage = result
    ? `Opened ${result.successful} tab${result.successful !== 1 ? 's' : ''} (${result.failed} failed, ${result.skipped} skipped) in ${(result.totalTime / 1000).toFixed(1)}s`
    : '';

  return (
    <>
      <textarea
        id="list"
        ref={textareaRef}
        value={urlText}
        onChange={(e) => setUrlText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste URLs here, one per line. Will also convert text to search queries."
        spellCheck={false}
      />
      <div className="button-container">
        <StatusBar message={statusMessage} />
        <button
          id="openButton"
          type="button"
          disabled={isLoading}
          title="Open these URLs in new tabs"
          onClick={() => void openUrls(urlText)}
        >
          Open URLs
        </button>
      </div>
      {error && <ErrorDisplay message={error} />}
      {result?.errors && result.errors.length > 0 && (
        <ErrorDisplay message="Some URLs failed to open" details={result.errors} />
      )}
      <div id="metrics" aria-live="polite">
        {metrics.error ? (
          <div className="metrics-error">Unable to load metrics</div>
        ) : (
          <MetricsGrid
            successRate={metrics.successRate}
            tabsOpened={metrics.tabsOpened}
            tabsFailed={metrics.tabsFailed}
            uptime={metrics.uptime}
          />
        )}
      </div>
      <Footer />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <PopupContent />
    </ErrorBoundary>
  );
}
