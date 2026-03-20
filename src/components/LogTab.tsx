import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

function effColor(eff: number): string {
  if (eff >= 4.5) return '#3fb950';
  if (eff >= 3.5) return '#d29922';
  return '#f0883e';
}

function effLabel(eff: number): string {
  if (eff >= 4.5) return 'Excellent';
  if (eff >= 3.5) return 'Good';
  return 'Average';
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

  const totalMi    = state.totalMilesDriven;
  const totalKwh   = state.totalKwhUsed;
  const avgEff     = totalKwh > 0 ? (totalMi / totalKwh).toFixed(2) : '—';
  const totalCredits = state.totalCreditsEarned ?? 0;

  // Best efficiency trip (completed trips with kWh used > 0)
  const completedTrips = state.log.filter(e => e.completed && e.kwhUsed > 0);
  const bestEntry = completedTrips.reduce<typeof state.log[0] | null>((best, e) => {
    if (!best) return e;
    return (e.distanceMi / e.kwhUsed) > (best.distanceMi / best.kwhUsed) ? e : best;
  }, null);
  const bestEff = bestEntry ? (bestEntry.distanceMi / bestEntry.kwhUsed) : null;

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
        <div>
          <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', marginBottom: 2 }}>Total Credits</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalCredits.toLocaleString()}</div>
        </div>
        {bestEff !== null && bestEntry && (
          <div>
            <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', marginBottom: 2 }}>Best Trip Eff.</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: effColor(bestEff) }}>
              {bestEff.toFixed(2)} <span style={{ fontSize: 12 }}>mi/kWh</span>
            </div>
            <div style={{ fontSize: 10, color: '#8b949e' }}>{bestEntry.routeName}</div>
          </div>
        )}
      </div>

      <div className="log-list">
        {state.log.map((entry, i) => {
          const eff = entry.kwhUsed > 0 ? entry.distanceMi / entry.kwhUsed : null;
          const color = eff !== null ? effColor(eff) : '#8b949e';

          return (
            <div
              key={`${entry.routeName}-${entry.distanceMi}-${i}`}
              className={`log-item ${entry.completed ? '' : 'failed'}`}
              style={{ borderLeft: `3px solid ${entry.completed ? '#3fb950' : '#f85149'}` }}
            >
              <div>
                <div className="log-route">{entry.routeName}</div>
                <div className="log-car">{entry.carName}</div>
              </div>
              <div className={`log-result ${entry.completed ? 'success' : 'fail'}`}>
                {entry.completed ? `+${entry.creditsEarned} cr` : 'FAILED'}
              </div>
              <div className="log-stats">
                {entry.distanceMi.toFixed(1)} mi · {entry.kwhUsed.toFixed(1)} kWh used
                {entry.kwhCharged > 0 && (
                  <span style={{ color: '#58a6ff' }}> · ⚡ {entry.kwhCharged.toFixed(1)} kWh charged</span>
                )}
                {eff !== null && (
                  <span>
                    {' · '}
                    <span style={{ color }}>{eff.toFixed(2)} mi/kWh</span>
                    <span style={{ fontSize: 10, marginLeft: 4, color }}>
                      {effLabel(eff)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
