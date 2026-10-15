import { useState, useRef, useEffect } from 'react';
import { askQuestion } from './api';

const SUGGESTIONS = [
  'Which IP made the most failed attempts?',
  'Were any usernames tried that don\u2019t look real?',
  'Summarize what happened in plain English',
];

export default function ChatPanel({ enabled }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(question) {
    if (!question.trim() || sending) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setSending(true);
    try {
      const res = await askQuestion(question);
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: `Error: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Ask the logs</span>
      </div>

      <div ref={scrollRef} style={styles.thread}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              {enabled
                ? 'Ask a question in plain English \u2014 answers are grounded in the parsed log data.'
                : 'Upload a log file to start asking questions.'}
            </p>
            {enabled && (
              <div style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} style={styles.suggestionBtn} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={m.role === 'user' ? styles.userMsg : styles.assistantMsg}>
            {m.text}
          </div>
        ))}
        {sending && <div style={styles.assistantMsg}><span style={styles.typing}>thinking…</span></div>}
      </div>

      <form
        style={styles.inputRow}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={enabled ? 'Ask about this log…' : 'Upload a log first'}
          disabled={!enabled}
        />
        <button type="submit" style={styles.sendBtn} disabled={!enabled || sending}>
          Send
        </button>
      </form>
    </aside>
  );
}

const styles = {
  panel: {
    width: 300,
    flexShrink: 0,
    borderLeft: '1px solid var(--hairline)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: { padding: '18px 18px 12px', borderBottom: '1px solid var(--hairline)' },
  title: { fontSize: 13, fontWeight: 500 },
  thread: { flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  emptyState: { display: 'flex', flexDirection: 'column', gap: 12 },
  emptyText: { fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 },
  suggestions: { display: 'flex', flexDirection: 'column', gap: 6 },
  suggestionBtn: {
    textAlign: 'left',
    background: 'var(--panel)',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--radius)',
    padding: '8px 10px',
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  userMsg: {
    alignSelf: 'flex-end',
    background: 'var(--cyan)',
    color: 'var(--ink)',
    padding: '8px 11px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    maxWidth: '90%',
  },
  assistantMsg: {
    alignSelf: 'flex-start',
    background: 'var(--panel)',
    border: '1px solid var(--hairline)',
    padding: '8px 11px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    maxWidth: '95%',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  typing: { color: 'var(--text-dim)', fontStyle: 'italic' },
  inputRow: { display: 'flex', gap: 6, padding: 14, borderTop: '1px solid var(--hairline)' },
  input: {
    flex: 1,
    background: 'var(--panel)',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--radius)',
    padding: '8px 10px',
    color: 'var(--text)',
    fontSize: 13,
  },
  sendBtn: {
    background: 'var(--panel-raised)',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--radius)',
    padding: '8px 14px',
    color: 'var(--text)',
    fontSize: 13,
  },
};
