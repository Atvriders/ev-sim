import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

export default function LogTab({ state }: Props) {
  if (state.log.length === 0) {
    return (
      <div>
        <p className="section-title">Trip Log</p>
        <p style={{ color: '#8b949e', textAlign: 'center', padding: 20 }}>
          No trips yet. Start driving!
        </p>
      </div>
    );
  }

  const totalMi  = state.totalMilesDriven;
  const totalKwh = state.totalKwhUsed;
  const avgEff   = totalKwh > 0 ? (totalMi / totalKwh).toFixed(2) : '—';

  return (
    <div>
      <p className="section-title">Trip Log</p>

      {/* Summary */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 12,
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', marginBottom: 2 }}>Trips</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{state.totalTrips}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', marginBottom: 2 }}>Miles Driven</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalMi.toFixed(1)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', marginBottom: 2 }}>kWh Used</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalKwh.toFixed(1)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', marginBottom: 2 }}>Avg Efficiency</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{avgEff} <span style={{ fontSize: 12 }}>mi/kWh</span></div>
        </div>
      </div>

      <div className="log-list">
        {state.log.map((entry, i) => (
          <div key={i} className={`log-item ${entry.completed ? '' : 'failed'}`}>
            <div>
              <div className="log-route">{entry.routeName}</div>
              <div className="log-car">{entry.carName}</div>
            </div>
            <div className={`log-result ${entry.completed ? 'success' : 'fail'}`}>
              {entry.completed ? `+${entry.creditsEarned} cr` : 'FAILED'}
            </div>
            <div className="log-stats">
              {entry.distanceMi.toFixed(1)} mi · {entry.kwhUsed.toFixed(1)} kWh used
              {entry.kwhCharged > 0 ? ` · ${entry.kwhCharged.toFixed(1)} kWh charged` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
