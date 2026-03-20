import type { GameState, Action } from '../game/types';
import type { CarModel } from '../game/types';
import { CARS } from '../game/cars';
import { computeUpgradeStats } from '../game/physics';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
}

const USED_IDS = new Set([
  'nissan_leaf_2011', 'mitsubishi_imiev', 'smart_ed_2013', 'fiat_500e_2014',
  'bmw_i3_2014', 'vw_egolf_2015', 'chevy_spark_ev', 'chevy_bolt_2017',
  'nissan_leaf_40', 'kia_soul_ev',
]);

const usedCars    = CARS.filter(c =>  USED_IDS.has(c.id));
const modernCars  = CARS.filter(c => !USED_IDS.has(c.id));

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '8px 0 4px',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.5px', color: '#8b949e' }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: '#8b949e' }}>({count})</span>
      <div style={{ flex: 1, height: 1, background: '#30363d' }} />
    </div>
  );
}

function CarCard({ car, state, dispatch, batteryBonus }: {
  car: CarModel;
  state: GameState;
  dispatch: (a: Action) => void;
  batteryBonus: number;
}) {
  const owned    = state.ownedCars.includes(car.id);
  const selected = state.selectedCar === car.id;
  const canBuy   = !owned && state.credits >= car.price;
  const effBat   = owned ? car.batteryKwh + batteryBonus : car.batteryKwh;

  const canSell  = owned && state.ownedCars.length > 1 && !selected && car.price > 0;
  const sellPrice = Math.max(50, Math.round(car.price * 0.4));

  const estRange = Math.round(car.efficiencyMiKwh * effBat);

  let cls = 'car-card';
  if (selected) cls += ' selected';
  else if (owned) cls += ' owned';

  return (
    <div className={cls}>
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
          <span className="cs-val">
            {car.rangeEpa} mi
            {owned && (
              <span style={{ color: '#8b949e', fontSize: 11, marginLeft: 4 }}>
                (~{estRange} mi est.)
              </span>
            )}
          </span>
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
        <div className="car-stat-row">
          <span className="cs-label">Weight</span>
          <span className="cs-val">{car.weightLbs.toFixed(0)} lbs</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className={`car-price ${car.price === 0 ? 'free' : ''}`}>
          {car.price === 0 ? 'FREE' : `$${car.price.toLocaleString()}`}
        </span>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
          {canSell && !state.driving && (
            <button
              className="btn-danger"
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => dispatch({ type: 'SELL_CAR', carId: car.id })}
            >
              Sell (${sellPrice.toLocaleString()})
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
    </div>
  );
}

export default function CarsTab({ state, dispatch }: Props) {
  const { batteryBonus } = computeUpgradeStats(state.upgrades);

  const totalFleetValue = state.ownedCars.reduce((sum, id) => {
    const car = CARS.find(c => c.id === id);
    return sum + (car ? car.price : 0);
  }, 0);

  return (
    <div>
      <p className="section-title">
        Fleet — {state.ownedCars.length} owned · Value: ${totalFleetValue.toLocaleString()}
      </p>
      <div className="car-grid">
        <GroupHeader label="Used / Classic (2011–2019)" count={usedCars.length} />
        {usedCars.map(car => (
          <CarCard key={car.id} car={car} state={state} dispatch={dispatch} batteryBonus={batteryBonus} />
        ))}

        <GroupHeader label="New / Modern" count={modernCars.length} />
        {modernCars.map(car => (
          <CarCard key={car.id} car={car} state={state} dispatch={dispatch} batteryBonus={batteryBonus} />
        ))}
      </div>
    </div>
  );
}
