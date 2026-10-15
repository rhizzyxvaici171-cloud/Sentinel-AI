const SEVERITY_COLOR = {
  critical: 'var(--red)',
  high: 'var(--amber)',
  medium: 'var(--cyan)',
  low: 'var(--text-dim)',
};

export default function AnomalyList({ result, analyzing }) {
  if (analyzing) {
    return (
      <div style={styles.empty}>
        <span className="mono" style={styles.emptyText}>SentinelAI is reviewing the aggregate statistics…</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyText}>Upload a log and run the AI scan to see findings here.</span>
      </div>
    );
  }

  return (
    <div>
      <p style={styles.summary}>{result.summary}</p>
      {result.anomalies.length === 0 ? (
        <div style={styles.empty}>
          <span style={styles.emptyText}>No anomalies flagged in this log.</span>
        </div>
      ) : (
        <div style={styles.list}>
          {result.anomalies.map((a, i) => (
            <div key={i} style={{ ...styles.card, borderLeftColor: SEVERITY_COLOR[a.severity] || 'var(--text-dim)' }}>
              <div style={styles.cardTop}>
                <span style={{ ...styles.severity, color: SEVERITY_COLOR[a.severity] || 'var(--text-dim)' }}>
                  {a.severity}
                </span>
                <span style={styles.cardTitle}>{a.title}</span>
              </div>
              <p style={styles.cardDesc}>{a.description}</p>
              {a.source_ip && <span className="mono" style={styles.ip}>{a.source_ip}</span>}
              {a.recommended_action && (
                <div style={styles.action}>
                  <span style={styles.actionLabel}>Recommended:</span> {a.recommended_action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  summary: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    background: 'var(--panel)',
    border: '1px solid var(--hairline)',
    borderLeft: '3px solid var(--text-dim)',
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
  },
  cardTop: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 },
  severity: { fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' },
  cardTitle: { fontSize: 13.5, fontWeight: 500 },
  cardDesc: { fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 },
  ip: { fontSize: 11.5, color: 'var(--cyan)', background: 'var(--panel-raised)', padding: '2px 6px', borderRadius: 2 },
  action: { fontSize: 12, color: 'var(--text-muted)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hairline)' },
  actionLabel: { color: 'var(--text-dim)' },
  empty: {
    border: '1px dashed var(--hairline)',
    borderRadius: 'var(--radius)',
    padding: '28px 16px',
    textAlign: 'center',
  },
  emptyText: { fontSize: 12.5, color: 'var(--text-dim)' },
};
