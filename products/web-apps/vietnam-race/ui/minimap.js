/**
 * Vietnam Race - 2D Dynamic GPS Radar Minimap Module with Speed-Adaptive Zoom
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.VietnamRaceMinimap = {
  zoomFactor: 1.0,

  render(car) {
    const canvas = document.getElementById('minimapCanvas');
    if (!canvas || !car) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const radius = w / 2 - 2;

    ctx.clearRect(0, 0, w, h);

    // 1. Circular Clip for Radar
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
    ctx.clip();

    // Dark HUD Slate Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // 2. Camera Transform & Speed-Adaptive Dynamic Zoom (Up to 2x Zoom Out)
    const spdKmH = Math.abs(car.getSpeedKmH ? car.getSpeedKmH() : (car.speed * 3.6));
    const targetZoom = 1.0 + Math.min(1.0, spdKmH / 130.0);
    this.zoomFactor += (targetZoom - this.zoomFactor) * 0.06;

    // Base scale for enlarged 270px canvas:
    // At rest (zoom 1.0): 0.38 px/m (~350m radius)
    // At top speed / nitro (zoom 2.0): 0.19 px/m (~700m radius, 2x wider field of view)
    const scale = 0.38 / this.zoomFactor;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    const theta = car.yaw + Math.PI;
    ctx.rotate(theta);
    ctx.translate(-car.x * scale, -car.z * scale);

    // 3. Draw Real Curved Sông Sài Gòn
    if (window.VietnamRaceSaigonRiverCoords && window.VietnamRaceSaigonRiverCoords.length) {
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      window.VietnamRaceSaigonRiverCoords.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p[0] * scale, p[1] * scale);
        else ctx.lineTo(p[0] * scale, p[1] * scale);
      });
      ctx.closePath();
      ctx.fill();

      // Shoreline Accent
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 4. Draw Roads (Fast Viewport Radar Culling)
    const maxRadarDist = 420 * this.zoomFactor + 60;
    if (window.VietnamRaceMap && window.VietnamRaceMap.roads) {
      window.VietnamRaceMap.roads.forEach((rd) => {
        if (Math.abs(rd.midX - car.x) > maxRadarDist || Math.abs(rd.midZ - car.z) > maxRadarDist) return;
        const isPromenade = rd.name === 'Nguyễn Huệ';
        ctx.strokeStyle = isPromenade ? '#475569' : '#334155';
        ctx.lineWidth = Math.max(3, rd.w * scale);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rd.x1 * scale, rd.z1 * scale);
        ctx.lineTo(rd.x2 * scale, rd.z2 * scale);
        ctx.stroke();

        // Center Stripe
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rd.x1 * scale, rd.z1 * scale);
        ctx.lineTo(rd.x2 * scale, rd.z2 * scale);
        ctx.stroke();
      });
    }

    // 5. Draw City Block Colliders / Buildings
    if (window.VietnamRaceMap && window.VietnamRaceMap.colliders) {
      ctx.fillStyle = '#1e293b';
      window.VietnamRaceMap.colliders.forEach((c) => {
        ctx.beginPath();
        if (c.w && c.d) {
          ctx.rect((c.x - c.w / 2) * scale, (c.z - c.d / 2) * scale, c.w * scale, c.d * scale);
        } else {
          ctx.arc(c.x * scale, c.z * scale, (c.r || 10) * scale, 0, Math.PI * 2);
        }
        ctx.fill();
      });
    }

    // 6. Draw Landmark Pins with Names
    if (window.VietnamRaceMap && window.VietnamRaceMap.landmarks) {
      window.VietnamRaceMap.landmarks.forEach((lm) => {
        const lx = lm.x * scale;
        const lz = lm.z * scale;

        // Outer Glow
        ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.beginPath();
        ctx.arc(lx, lz, 9, 0, Math.PI * 2);
        ctx.fill();

        // Core Pin
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(lx, lz, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px Barlow, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name, lx, lz - 11);
      });
    }

    // 6.5 Draw Moving AI Traffic Dots on Minimap
    if (window.VietnamRaceTraffic && window.VietnamRaceTraffic.vehicles) {
      window.VietnamRaceTraffic.vehicles.forEach((v) => {
        const vx = v.mesh.position.x * scale;
        const vz = v.mesh.position.z * scale;
        ctx.fillStyle = v.isAirborne ? '#f97316' : (v.type === 'taxi' ? '#38bdf8' : (v.type === 'bus' ? '#e11d48' : '#eab308'));
        ctx.beginPath();
        ctx.arc(vx, vz, v.type === 'bus' ? 3.5 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // Restore from rotated/translated world

    // 7. Draw Player Car Marker (ALWAYS in center, ALWAYS pointing UP)
    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Headlight Beam Cone ahead of car
    ctx.fillStyle = 'rgba(255, 250, 101, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-18, -48);
    ctx.lineTo(18, -48);
    ctx.closePath();
    ctx.fill();

    // Car Body Marker (Red Chevron)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    // 8. Dynamic Compass North Indicator (Orbits outer rim)
    const compassR = radius - 10;
    const nx = w / 2 - Math.sin(car.yaw) * compassR;
    const ny = h / 2 + Math.cos(car.yaw) * compassR;

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px Barlow, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    ctx.restore(); // Restore clip
  }
};
