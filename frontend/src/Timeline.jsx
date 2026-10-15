import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Timeline({ data }) {
  if (!data || data.length === 0) return null;

  const formatted = data.map((d) => ({
    ...d,
    label: d.time.slice(11) + ':00',
  }));

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>Event volume over time</span>
        <div style={styles.legend}>
          <LegendDot color="var(--cyan)" label="all events" />
          <LegendDot color="var(--red)" label="failures" />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={formatted} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4fa3d1" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#4fa3d1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d64545" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#d64545" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#8b92a3', fontSize: 11 }} axisLine={{ stroke: '#2a2f3a' }} tickLine={false} />
          <YAxis tick={{ fill: '#8b92a3', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{ background: '#1b1f27', border: '1px solid #2a2f3a', borderRadius: 3, fontSize: 12 }}
            labelStyle={{ color: '#e8eaed' }}
          />
          <Area type="monotone" dataKey="total" stroke="#4fa3d1" fill="url(#totalGrad)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="failures" stroke="#d64545" fill="url(#failGrad)" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
      <span style={{ width: 6, height: 6, borderRadius: 1, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

const styles = {
  wrap: {
    background: 'var(--panel)',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--radius)',
    padding: '16px 18px 8px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 },
  legend: { display: 'flex', gap: 14 },
};
