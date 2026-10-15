import { useState } from 'react';
import Sidebar from './Sidebar';
import Timeline from './Timeline';
import AnomalyList from './AnomalyList';
import ChatPanel from './ChatPanel';
import { uploadLog, runAnalysis } from './api';

export default function App() {
  const [filename, setFilename] = useState(null);
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [uploadState, setUploadState] = useState('idle'); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function handleUpload(file) {
    setUploadState('loading');
    setErrorMsg('');
    setAnalysis(null);
    try {
      const res = await uploadLog(file);
      setFilename(res.filename);
      setSummary(res.summary);
      setTimeline(res.timeline);
      setUploadState('idle');
    } catch (e) {
      setErrorMsg(e.message);
      setUploadState('error');
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await runAnalysis();
      setAnalysis(res);
    } catch (e) {
      setAnalysis({ summary: `Analysis failed: ${e.message}`, anomalies: [] });
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div style={styles.shell}>
      <Sidebar
        onUpload={handleUpload}
        filename={filename}
        summary={summary}
        loading={uploadState === 'loading'}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />

      <main style={styles.main}>
        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

        {!summary ? (
          <div style={styles.landingEmpty}>
            <p style={styles.landingText}>
              Upload an auth log or CSV to see event volume, flagged anomalies, and ask questions about what happened.
            </p>
          </div>
        ) : (
          <>
            <Timeline data={timeline} />
            <div style={styles.anomalySection}>
              <div style={styles.sectionHeader}>Findings</div>
              <AnomalyList result={analysis} analyzing={analyzing} />
            </div>
          </>
        )}
      </main>

      <ChatPanel enabled={!!summary} />
    </div>
  );
}

const styles = {
  shell: { display: 'flex', height: '100vh', overflow: 'hidden' },
  main: { flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 },
  sectionHeader: { fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 12 },
  anomalySection: { flex: 1 },
  errorBanner: {
    background: 'rgba(214,69,69,0.1)',
    border: '1px solid rgba(214,69,69,0.35)',
    color: 'var(--red)',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    fontSize: 13,
  },
  landingEmpty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed var(--hairline)',
    borderRadius: 'var(--radius)',
  },
  landingText: { color: 'var(--text-dim)', fontSize: 13.5, maxWidth: 360, textAlign: 'center', lineHeight: 1.6 },
};
