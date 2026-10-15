export default function Sidebar({ onUpload, filename, summary, loading, onAnalyze, analyzing }) {
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) onUpload(file);
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <span style={styles.brandMark}>◆</span>
        <span style={styles.brandName}>SentinelAI</span>
      </div>
      <p style={styles.brandSub}>Log intelligence for security operations</p>

      <label style={styles.uploadBox}>
        <input type="file" accept=".log,.txt,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
        {loading ? 'Parsing…' : filename ? 'Replace log file' : 'Upload a log file'}
        <span style={styles.uploadHint}>auth.log or .csv</span>
      </label>

      {filename && (
        <div style={styles.fileTag}>
          <span className="mono" style={styles.fileTagText}>{filename}</span>
        </div>
      )}

      {summary && (
        <>
          <div style={styles.sectionLabel}>Telemetry</div>
          <div style={styles.statGrid}>
            <Stat label="Total events" value={summary.total_events} />
            <Stat label="Unique IPs" value={summary.unique_ips} />
            <Stat label="Unique users" value={summary.unique_users} />
            <Stat
              label="Failed logins"
              value={(summary.event_counts.auth_failure || 0) + (summary.event_counts.invalid_user || 0)}
              accent="amber"
            />
          </div>

          {summary.brute_force_candidates.length > 0 && (
            <div style={styles.warningBox}>
              <div style={styles.warningTitle}>{summary.brute_force_candidates.length} IP(s) show brute-force volume</div>
              <div style={styles.warningList}>
                {summary.brute_force_candidates.slice(0, 5).map((ip) => (
                  <div key={ip} className="mono" style={styles.warningItem}>{ip}</div>
                ))}
              </div>
            </div>
          )}

          <button
            style={{ ...styles.analyzeBtn, opacity: analyzing ? 0.6 : 1 }}
            onClick={onAnalyze}
            disabled={analyzing}
          >
            {analyzing ? 'Asking Sentinel-AI…' : 'Run AI anomaly scan'}
          </button>
        </>
      )}
    </aside>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={styles.stat}>
      <div style={{ ...styles.statValue, color: accent === 'amber' ? 'var(--amber)' : 'var(--text)' }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 260,
    flexShrink: 0,
    borderRight: '1px solid var(--hairline)',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflowY: 'auto',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandMark: { color: 'var(--cyan)', fontSize: 14 },
  brandName: { fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' },
  brandSub: { color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2, marginBottom: 24, lineHeight: 1.4 },
  uploadBox: {
    border: '1px dashed var(--hairline)',
    borderRadius: 'var(--radius)',
    padding: '14px 12px',
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    background: 'var(--panel)',
  },
  uploadHint: { color: 'var(--text-dim)', fontSize: 11 },
  fileTag: {
    marginTop: 10,
    padding: '6px 8px',
    background: 'var(--panel-raised)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  fileTagText: { fontSize: 11.5, color: 'var(--cyan)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' },
  sectionLabel: { fontSize: 11.5, color: 'var(--text-dim)', marginTop: 28, marginBottom: 10, fontWeight: 500 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  stat: { background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius)', padding: '10px 12px' },
  statValue: { fontSize: 20, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' },
  statLabel: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  warningBox: {
    marginTop: 16,
    padding: '10px 12px',
    background: 'rgba(232,163,61,0.08)',
    border: '1px solid rgba(232,163,61,0.3)',
    borderLeft: '3px solid var(--amber)',
    borderRadius: 'var(--radius)',
  },
  warningTitle: { fontSize: 12, color: 'var(--amber)', fontWeight: 500, marginBottom: 6 },
  warningList: { display: 'flex', flexDirection: 'column', gap: 2 },
  warningItem: { fontSize: 11.5, color: 'var(--text-muted)' },
  analyzeBtn: {
    marginTop: 20,
    background: 'var(--cyan)',
    color: 'var(--ink)',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
  },
};
