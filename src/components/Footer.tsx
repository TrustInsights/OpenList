// Popup footer with the TrustInsights.ai link

/**
 * Renders the TrustInsights.ai link. The text and the campaign tag follow the manifest version.
 * @returns The footer element.
 */
export function Footer(): React.JSX.Element {
  const { version } = chrome.runtime.getManifest();
  const campaign = `openlist_${version.replaceAll('.', '_')}`;
  return (
    <div className="trust-insights-link">
      <a
        href={`https://www.trustinsights.ai?utm_source=openlist&utm_medium=referral&utm_campaign=${campaign}`}
        target="_blank"
        rel="noreferrer"
      >
        {`OpenList ${version} brought to you by TrustInsights.ai`}
      </a>
    </div>
  );
}
