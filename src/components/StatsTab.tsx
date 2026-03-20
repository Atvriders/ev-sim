import type { GameState } from '../game/types';
import { ACHIEVEMENTS } from '../game/achievements';
import { ROUTES } from '../game/routes';

interface Props { state: GameState; }

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

const routeNameMap: Record<string, string> = Object.fromEntries(
  ROUTES.map(r => [r.id, r.name])
);

const difficultyColor: Record<string, string> = {
  Easy:   '#3fb950',
  Medium: '#e3b341',
  Hard:   '#f78166',
  Expert: '#d2a8ff',
};

export default function StatsTab({ state }: Props) {
  const avgEfficiency =
    state.totalKwhUsed > 0
      ? (state.totalMilesDriven / state.totalKwhUsed).toFixed(2)
      : null;

  const achievements    = state.achievements ?? [];
  const unlockedCount   = achievements.length;
  const totalCount      = ACHIEVEMENTS.length;

  const bestTimeEntries = Object.entries(state.bestTimes ?? {});
  const hasBests = bestTimeEntries.length > 0;

  return (
    <div style={{ padding: '20px 0', maxWidth: 860, margin: '0 auto' }}>

      {/* ── Lifetime Stats ─────────────────────────────────────────────── */}
      <Section title="Lifetime Stats">
        <div style={styles.statGrid}>
          <StatChip label="Total Trips"      value={String(state.totalTrips)} />
          <StatChip label="Miles Driven"     value={`${state.totalMilesDriven.toFixed(0)} mi`} />
          <StatChip label="kWh Used"         value={`${state.totalKwhUsed.toFixed(1)} kWh`} />
          <StatChip label="kWh Charged"      value={`${state.totalKwhCharged.toFixed(1)} kWh`} />
          <StatChip label="Credits Earned"   value={`${(state.totalCreditsEarned ?? 0).toLocaleString()} cr`} />
          <StatChip
            label="Avg Efficiency"
            value={avgEfficiency ? `${avgEfficiency} mi/kWh` : '—'}
          />
          <StatChip label="Cars Owned"  value={String(state.ownedCars.length)} />
          <StatChip label="Upgrades"    value={String(state.upgrades.length)} />
        </div>
      </Section>

      {/* ── Route Bests ────────────────────────────────────────────────── */}
      {hasBests && (
        <Section title="Route Bests">
          <div style={styles.bestsGrid}>
            {bestTimeEntries.map(([routeId, bestSec]) => {
              const route   = ROUTES.find(r => r.id === routeId);
              const name    = routeNameMap[routeId] ?? routeId;
              const eff     = state.bestEfficiency[routeId];
              const diff    = route?.difficulty ?? 'Easy';
              return (
                <div key={routeId} style={styles.bestCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ ...styles.diffBadge, background: difficultyColor[diff] + '22', color: difficultyColor[diff] }}>
                      {diff}
                    </span>
                    <span style={styles.bestRouteName}>{name}</span>
                  </div>
                  <div style={styles.bestRow}>
                    <span style={styles.bestLabel}>Best Time</span>
                    <span style={styles.bestValue}>⏱ {formatTime(bestSec)}</span>
                  </div>
                  {eff != null && (
                    <div style={styles.bestRow}>
                      <span style={styles.bestLabel}>Best Efficiency</span>
                      <span style={styles.bestValue}>⚡ {eff.toFixed(2)} mi/kWh</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Achievements ───────────────────────────────────────────────── */}
      <Section
        title="Achievements"
        subtitle={`${unlockedCount} / ${totalCount} unlocked`}
        subtitleColor={unlockedCount === totalCount ? '#3fb950' : '#8b949e'}
      >
        <div style={styles.achieveGrid}>
          {ACHIEVEMENTS.map(a => {
            const unlocked = achievements.includes(a.id);
            return (
              <div
                key={a.id}
                style={unlocked ? styles.achieveCardUnlocked : styles.achieveCardLocked}
              >
                {/* lock overlay */}
                {!unlocked && (
                  <div style={styles.lockOverlay}>🔒</div>
                )}
                {/* glow ring on unlocked */}
                {unlocked && (
                  <div style={styles.glowRing} />
                )}
                <div style={styles.achieveIcon}>{a.icon}</div>
                <div style={styles.achieveName}>{a.name}</div>
                <div style={styles.achieveDesc}>{a.desc}</div>
                {unlocked && (
                  <div style={styles.achieveUnlockedBadge}>Unlocked</div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function Section({
  title,
  subtitle,
  subtitleColor = '#8b949e',
  children,
}: {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {subtitle && (
          <span style={{ ...styles.sectionSubtitle, color: subtitleColor }}>
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statChip}>
      <div style={styles.statChipValue}>{value}</div>
      <div style={styles.statChipLabel}>{label}</div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    display:        'flex',
    alignItems:     'baseline',
    gap:            12,
    marginBottom:   14,
    borderBottom:   '1px solid var(--border)',
    paddingBottom:  8,
  },
  sectionTitle: {
    margin:     0,
    fontSize:   15,
    fontWeight: 600,
    color:      '#e6edf3',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize:   13,
    fontWeight: 500,
  },

  /* stat chips */
  statGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap:                 10,
  },
  statChip: {
    background:   'var(--surface)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding:      '12px 14px',
    textAlign:    'center',
  },
  statChipValue: {
    fontSize:   17,
    fontWeight: 700,
    color:      '#e6edf3',
    marginBottom: 3,
    fontVariantNumeric: 'tabular-nums',
  },
  statChipLabel: {
    fontSize:  11,
    color:     '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  /* route bests */
  bestsGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap:                 10,
  },
  bestCard: {
    background:   'var(--surface)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding:      '12px 14px',
  },
  bestRouteName: {
    fontSize:   13,
    fontWeight: 600,
    color:      '#e6edf3',
  },
  diffBadge: {
    fontSize:     10,
    fontWeight:   600,
    padding:      '2px 6px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    flexShrink:   0,
  },
  bestRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginTop:      5,
  },
  bestLabel: {
    fontSize: 12,
    color:    '#8b949e',
  },
  bestValue: {
    fontSize:   12,
    fontWeight: 600,
    color:      '#e6edf3',
    fontVariantNumeric: 'tabular-nums',
  },

  /* achievements */
  achieveGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap:                 10,
  },
  achieveCardUnlocked: {
    position:     'relative',
    background:   '#0d2a1a',
    border:       '1px solid #3fb950',
    borderRadius: 8,
    padding:      '16px 14px 12px',
    display:      'flex',
    flexDirection: 'column',
    alignItems:   'center',
    textAlign:    'center',
    gap:          4,
    overflow:     'hidden',
  },
  achieveCardLocked: {
    position:     'relative',
    background:   'var(--surface)',
    border:       '1px solid var(--border)',
    borderRadius: 8,
    padding:      '16px 14px 12px',
    display:      'flex',
    flexDirection: 'column',
    alignItems:   'center',
    textAlign:    'center',
    gap:          4,
    opacity:      0.55,
    overflow:     'hidden',
  },
  glowRing: {
    position:     'absolute',
    inset:        0,
    borderRadius: 8,
    boxShadow:    'inset 0 0 18px 2px rgba(63,185,80,0.18)',
    pointerEvents: 'none',
  },
  lockOverlay: {
    position:   'absolute',
    top:        6,
    right:      8,
    fontSize:   13,
    lineHeight: 1,
    opacity:    0.7,
  },
  achieveIcon: {
    fontSize:     32,
    lineHeight:   1,
    marginBottom: 6,
  },
  achieveName: {
    fontSize:   13,
    fontWeight: 700,
    color:      '#e6edf3',
  },
  achieveDesc: {
    fontSize:  11,
    color:     '#8b949e',
    lineHeight: 1.4,
    marginTop:  2,
  },
  achieveUnlockedBadge: {
    marginTop:    6,
    fontSize:     10,
    fontWeight:   600,
    color:        '#3fb950',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
};
