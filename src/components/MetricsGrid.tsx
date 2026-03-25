interface MetricsGridProps {
  successRate: string;
  tabsOpened: number;
  tabsFailed: number;
  uptime: string;
}

interface MetricItemProps {
  label: string;
  value: string | number;
}

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}

export function MetricsGrid({ successRate, tabsOpened, tabsFailed, uptime }: MetricsGridProps) {
  return (
    <div className="metrics-grid">
      <MetricItem label="Success Rate" value={`${successRate}%`} />
      <MetricItem label="Tabs Opened" value={tabsOpened} />
      <MetricItem label="Errors" value={tabsFailed} />
      <MetricItem label="Uptime" value={uptime} />
    </div>
  );
}
