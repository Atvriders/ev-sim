import type { GameState, Action } from '../game/types';
import { UPGRADES } from '../game/upgrades';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
}

function pct(val: number): string {
  return `${(val * 100).toFixed(0)}%`;
}

export default function UpgradesTab({ state, dispatch }: Props) {
  return (
    <div>
      <p className="section-title">Upgrades — {state.upgrades.length} / {UPGRADES.length} installed</p>
      <div className="upgrade-grid">
        {UPGRADES.map(upg => {
          const owned   = state.upgrades.includes(upg.id);
          const canBuy  = !owned && state.credits >= upg.price;

          return (
            <div key={upg.id} className={`upgrade-card ${owned ? 'owned' : ''}`}>
              <div className="upgrade-header">
                <span className="upgrade-name">{upg.name}</span>
                <span className="upgrade-price">{upg.price.toLocaleString()} cr</span>
              </div>
              <div className="upgrade-desc">{upg.desc}</div>

              <div className="upgrade-bonuses">
                {upg.efficiencyBonus > 0 && (
                  <span className="bonus-tag efficiency">
                    −{pct(upg.efficiencyBonus)} consumption
                  </span>
                )}
                {upg.efficiencyBonus < 0 && (
                  <span className="bonus-tag negative">
                    +{pct(-upg.efficiencyBonus)} consumption
                  </span>
                )}
                {upg.regenBonus > 0 && (
                  <span className="bonus-tag regen">
                    +{pct(upg.regenBonus)} regen
                  </span>
                )}
                {upg.batteryBonus > 0 && (
                  <span className="bonus-tag battery">
                    +{upg.batteryBonus} kWh
                  </span>
                )}
                {upg.freeKw > 0 && (
                  <span className="bonus-tag solar">
                    +{upg.freeKw} kW free
                  </span>
                )}
              </div>

              {owned ? (
                <span style={{ color: '#3fb950', fontWeight: 700, fontSize: 13 }}>✓ Installed</span>
              ) : (
                <button
                  className="btn-success"
                  style={{ fontSize: 13, padding: '6px 14px' }}
                  disabled={!canBuy}
                  onClick={() => dispatch({ type: 'BUY_UPGRADE', upgradeId: upg.id })}
                >
                  {canBuy ? 'Install' : `Need ${(upg.price - state.credits).toLocaleString()} more cr`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
