// The minimap: a small 2D canvas, north-up, showing the road grid, the buildings, the
// beach and sea, the player's arrow, police blips, traffic dots and the mission marker.
import { CITY } from './config.js';

export function createMinimap(canvas, city) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / (CITY.bound * 2 + 20);
  const ox = size / 2;
  const oy = size / 2;

  function X(x) {
    return ox + x * scale;
  }
  function Y(z) {
    return oy + z * scale;
  }

  function draw(state) {
    ctx.fillStyle = '#1b2a33';
    ctx.fillRect(0, 0, size, size);
    // Sea and beach (south edge).
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(0, Y(222), size, size - Y(222));
    ctx.fillStyle = '#e8d8a8';
    ctx.fillRect(0, Y(216), size, Y(222) - Y(216));
    // Roads.
    ctx.strokeStyle = '#3a3f46';
    ctx.lineWidth = Math.max(2, 14 * scale);
    for (const s of CITY.streets) {
      ctx.beginPath();
      ctx.moveTo(X(-CITY.bound), Y(s));
      ctx.lineTo(X(CITY.bound), Y(s));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(s), Y(-CITY.bound));
      ctx.lineTo(X(s), Y(CITY.bound));
      ctx.stroke();
    }
    // Buildings.
    ctx.fillStyle = '#8a7a5a';
    for (const b of city.buildings) {
      ctx.fillRect(X(b.x - b.hx), Y(b.z - b.hz), b.hx * 2 * scale, b.hz * 2 * scale);
    }
    // Casino (gold) and safehouse (green).
    const L = city.landmarks;
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(X(L.casino.x - 20), Y(L.casino.z - 16), 40 * scale, 32 * scale);
    ctx.fillStyle = '#7fb069';
    ctx.fillRect(X(L.safehouse.x - 9), Y(L.safehouse.z - 8), 18 * scale, 16 * scale);
    // Mission marker: pulsing yellow diamond.
    if (state.markers.length > 0) {
      const m = state.markers[0];
      const pulse = 3 + Math.sin(state.time * 4) * 1.5;
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(X(m.x), Y(m.z), pulse + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Traffic dots.
    ctx.fillStyle = '#b8c0cc';
    for (const car of state.cars) {
      if (!car.active || car.kind !== 'traffic') continue;
      ctx.fillRect(X(car.x) - 1, Y(car.z) - 1, 2, 2);
    }
    // Police blips.
    ctx.fillStyle = '#4d8ef7';
    for (const car of state.cars) {
      if (!car.active || car.kind !== 'police') continue;
      ctx.beginPath();
      ctx.arc(X(car.x), Y(car.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player: a green arrow, rotated to face the way they face.
    // Facing (sin a, cos a) on the map needs a rotation of PI - a (canvas y runs down).
    const p = state.player;
    ctx.save();
    ctx.translate(X(p.x), Y(p.z));
    ctx.rotate(Math.PI - p.angle);
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return { draw };
}
