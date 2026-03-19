import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { getRoute } from '../game/routes';
import { getCar } from '../game/cars';

interface Props {
  state: GameState;
}

const W = 800;
const H = 180;

export default function GameCanvas({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    const route = state.currentRoute ? getRoute(state.currentRoute) : null;
    if (!route || !state.driving) {
      // Idle screen
      ctx.fillStyle = '#161b22';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#8b949e';
      ctx.font = '15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Select a route to start driving', W / 2, H / 2);
      return;
    }

    const terrain = route.terrain;
    const distTotal = route.distanceMi;

    // Viewport: car is always at ~25% from left
    const carScreenX = W * 0.25;
    const miPerPx    = distTotal / (W * 2); // how many miles = 1 pixel
    const offsetMi   = state.positionMi - carScreenX * miPerPx;

    function miToX(mi: number) {
      return (mi - offsetMi) / miPerPx;
    }

    // Elevation scale
    const elevs = terrain.map(p => p.elevationFt);
    const minEl = Math.min(...elevs);
    const maxEl = Math.max(...elevs);
    const elRange = Math.max(maxEl - minEl, 100);
    const groundYTop = H * 0.35;
    const groundYBot = H * 0.80;

    function elToY(el: number) {
      const frac = 1 - (el - minEl) / elRange;
      return groundYTop + frac * (groundYBot - groundYTop);
    }

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, groundYTop);
    sky.addColorStop(0, '#0a1628');
    sky.addColorStop(1, '#1a3050');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Draw terrain road
    ctx.beginPath();
    let firstPt = true;
    for (let i = 0; i < terrain.length - 1; i++) {
      const pts = 20;
      for (let j = 0; j <= pts; j++) {
        const t = j / pts;
        const mi = terrain[i].distanceMi + t * (terrain[i+1].distanceMi - terrain[i].distanceMi);
        const el = terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        const x = miToX(mi);
        const y = elToY(el);
        if (firstPt) { ctx.moveTo(x, y); firstPt = false; }
        else ctx.lineTo(x, y);
      }
    }

    // Fill ground
    const lastTerrain = terrain[terrain.length - 1];
    const firstTerrain = terrain[0];
    ctx.lineTo(miToX(lastTerrain.distanceMi), H);
    ctx.lineTo(miToX(firstTerrain.distanceMi), H);
    ctx.closePath();

    const groundGrad = ctx.createLinearGradient(0, groundYTop, 0, H);
    groundGrad.addColorStop(0, '#2a3a2a');
    groundGrad.addColorStop(1, '#1a251a');
    ctx.fillStyle = groundGrad;
    ctx.fill();

    // Road line on top
    ctx.beginPath();
    firstPt = true;
    for (let i = 0; i < terrain.length - 1; i++) {
      const pts = 20;
      for (let j = 0; j <= pts; j++) {
        const t = j / pts;
        const mi = terrain[i].distanceMi + t * (terrain[i+1].distanceMi - terrain[i].distanceMi);
        const el = terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        const x = miToX(mi);
        const y = elToY(el);
        if (firstPt) { ctx.moveTo(x, y); firstPt = false; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Road center line (dashed)
    ctx.beginPath();
    firstPt = true;
    for (let i = 0; i < terrain.length - 1; i++) {
      const pts = 20;
      for (let j = 0; j <= pts; j++) {
        const t = j / pts;
        const mi = terrain[i].distanceMi + t * (terrain[i+1].distanceMi - terrain[i].distanceMi);
        const el = terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        const x = miToX(mi);
        const y = elToY(el) - 1;
        if (firstPt) { ctx.moveTo(x, y); firstPt = false; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = '#ffcc00aa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw chargers
    for (const charger of route.chargers) {
      const tpt = terrain.reduce((acc, pt) => {
        const di = Math.abs(pt.distanceMi - charger.positionMi);
        const da = Math.abs(acc.distanceMi - charger.positionMi);
        return di < da ? pt : acc;
      }, terrain[0]);
      const elAt = tpt.elevationFt;
      const cx2 = miToX(charger.positionMi);
      const cy2 = elToY(elAt) - 14;

      const isActive = state.chargingAtId === charger.id;

      // Pole
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2 + 14);
      ctx.lineTo(cx2, cy2);
      ctx.stroke();

      // Box
      ctx.fillStyle = isActive ? '#3fb950' : '#58a6ff';
      ctx.fillRect(cx2 - 6, cy2 - 10, 12, 10);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', cx2, cy2 - 2);
    }

    // Draw car
    const car = getCar(state.selectedCar);
    const carEl = (() => {
      // Interpolate elevation at current position
      for (let i = 0; i < terrain.length - 1; i++) {
        if (terrain[i].distanceMi <= state.positionMi && terrain[i+1].distanceMi >= state.positionMi) {
          const t = (state.positionMi - terrain[i].distanceMi) / (terrain[i+1].distanceMi - terrain[i].distanceMi);
          return terrain[i].elevationFt + t * (terrain[i+1].elevationFt - terrain[i].elevationFt);
        }
      }
      return terrain[0].elevationFt;
    })();

    // Grade for car tilt
    const grade = (() => {
      for (let i = 0; i < terrain.length - 1; i++) {
        if (terrain[i].distanceMi <= state.positionMi && terrain[i+1].distanceMi >= state.positionMi) {
          const dEl = terrain[i+1].elevationFt - terrain[i].elevationFt;
          const dMi = terrain[i+1].distanceMi  - terrain[i].distanceMi;
          return dMi > 0 ? dEl / (dMi * 5280) : 0; // ft/ft grade
        }
      }
      return 0;
    })();

    const carY = elToY(carEl) - 10;
    const tilt = Math.atan(grade) * 0.6; // subtle tilt

    ctx.save();
    ctx.translate(carScreenX, carY);
    ctx.rotate(-tilt);

    // Car body
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-18, -10, 36, 10, 3);
    ctx.fill();

    // Windshield / roof
    ctx.fillStyle = '#88ccff55';
    ctx.beginPath();
    ctx.roundRect(-10, -18, 20, 8, 2);
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#222';
    for (const wx of [-10, 10]) {
      ctx.beginPath();
      ctx.arc(wx, 1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Regen glow
    if (state.currentKw < -0.5) {
      ctx.shadowColor = '#3fb950';
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = '#3fb95040';
      ctx.beginPath();
      ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Progress bar at top
    const prog = Math.min(1, state.positionMi / distTotal);
    ctx.fillStyle = '#21262d';
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = '#58a6ff';
    ctx.fillRect(0, 0, W * prog, 4);

    // Position text
    ctx.fillStyle = '#e6edf3cc';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.positionMi.toFixed(1)} / ${distTotal} mi`, 6, 16);

  }, [state]);

  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="game-canvas"
      />
    </div>
  );
}
