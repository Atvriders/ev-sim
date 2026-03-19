import type { GameState, Action } from '../game/types';
import { CARS } from '../game/cars';
import { computeUpgradeStats } from '../game/physics';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
}

export default function CarsTab({ state, dispatch }: Props) {
  const { batteryBonus } = computeUpgradeStats(state.upgrades);

  return (
    <div>
      <p className="section-title">Fleet — {state.ownedCars.length} owned</p>
      <div className="car-grid">
        {CARS.map(car => {
          const owned    = state.ownedCars.includes(car.id);
          const selected = state.selectedCar === car.id;
          const canBuy   = !owned && state.credits >= car.price;
          const effBat   = owned ? car.batteryKwh + batteryBonus : car.batteryKwh;

          let cls = 'car-card';
          if (selected) cls += ' selected';
          else if (owned) cls += ' owned';

          return (
            <div key={car.id} className={cls}>
              <div className="car-card-header">
                <span className="car-emoji">{car.emoji}</span>
                <div>
                  <div className="car-brand">{car.brand}</div>
                  <div className="car-name">{car.name}</div>
                </div>
              </div>

              <div className="car-stats">
                <div className="car-stat-row">
                  <span className="cs-label">Range</span>
                  <span className="cs-val">{car.rangeEpa} mi</span>
                </div>
                <div className="car-stat-row">
                  <span className="cs-label">Efficiency</span>
                  <span className="cs-val">{car.efficiencyMiKwh.toFixed(2)} mi/kWh</span>
                </div>
                <div className="car-stat-row">
                  <span className="cs-label">Battery</span>
                  <span className="cs-val">{effBat.toFixed(1)} kWh</span>
                </div>
                <div className="car-stat-row">
                  <span className="cs-label">0–60</span>
                  <span className="cs-val">{car.zeroToSixty}s</span>
                </div>
                <div className="car-stat-row">
                  <span className="cs-label">Max Charge</span>
                  <span className="cs-val">{car.maxChargeKw} kW</span>
                </div>
                <div className="car-stat-row">
                  <span className="cs-label">Drag Cd</span>
                  <span className="cs-val">{car.dragCd}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`car-price ${car.price === 0 ? 'free' : ''}`}>
                  {car.price === 0 ? 'FREE' : `${car.price.toLocaleString()} cr`}
                </span>

                {selected && (
                  <span style={{ color: '#58a6ff', fontWeight: 700, fontSize: 13 }}>Selected</span>
                )}
                {owned && !selected && (
                  <button
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '4px 12px' }}
                    onClick={() => dispatch({ type: 'SELECT_CAR', carId: car.id })}
                  >
                    Select
                  </button>
                )}
                {!owned && (
                  <button
                    className="btn-success"
                    style={{ fontSize: 12, padding: '4px 12px' }}
                    disabled={!canBuy}
                    onClick={() => dispatch({ type: 'BUY_CAR', carId: car.id })}
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
