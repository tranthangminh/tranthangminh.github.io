/**
 * Lucky Wheel - 3D Cylinder Renderer (Chế Độ 3D Khối Trụ Arcade Deluxe - Bám Sát Hình 2)
 * Features:
 * - Steampunk / Gold Arcade Tiered Pedestal (Bệ đỡ đồng thau giật cấp với đinh tán và biển máy)
 * - Heavy Golden Brass Cylinder Wall with Specular Highlights (Thành trụ mạ vàng kim loại phản quang)
 * - Outer Brass Riveted Rim & Raised 3D Pegs (Vành đĩa vàng đinh tán & chốt ghim nhô cao)
 * - Turquoise Gem Center Hub encased in Gold (Tâm xoay Viên Ngọc Bích khảm vàng hoàng gia)
 * - Arcade Brass Lamp Pointer at 3 o'clock (Kim chỉ đèn báo ngọc bích sang trọng)
 * - 100% Pure Canvas 2D (Zero heavy libraries)
 */

window.LuckyWheel3DCylinder = (function () {
    'use strict';

    /**
     * Adjust hex color brightness with metallic tinting
     */
    function adjustBrightness(hex, factor) {
        if (!hex || typeof hex !== 'string' || hex.charAt(0) !== '#') return hex;
        let color = hex.slice(1);
        if (color.length === 3) {
            color = color.split('').map(c => c + c).join('');
        }
        if (color.length !== 6) return hex;
        const num = parseInt(color, 16);
        let r = (num >> 16);
        let g = ((num >> 8) & 0x00FF);
        let b = (num & 0x0000FF);

        r = Math.min(255, Math.max(0, Math.round(r * factor)));
        g = Math.min(255, Math.max(0, Math.round(g * factor)));
        b = Math.min(255, Math.max(0, Math.round(b * factor)));

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Draw the Volumetric 3D Cylinder Wheel on Canvas
     * @param {LuckyWheelEngine} engine
     */
    function draw(engine) {
        const ctx = engine.ctx;
        const cx = engine.centerX;
        const cy = engine.centerY;
        const r = engine.radius;

        ctx.clearRect(0, 0, engine.width, engine.height);

        const tiltRatio = 0.62;
        const progress = engine.thicknessProgress !== undefined ? engine.thicknessProgress : 1;
        const cylinderDepth = Math.max(28, Math.min(48, Math.round(engine.width * 0.08))) * progress;
        
        // Căn chỉnh trục bánh xe lên trên để chừa không gian phía dưới cho bệ đỡ (Pedestal)
        const rx = r * 0.86; // Tỷ lệ cân đối cho cả bánh xe và bệ đỡ
        const ry = rx * tiltRatio;
        const topCx = cx;
        const topCy = cy - Math.round(cylinderDepth * 1.1);
        const bottomCy = topCy + cylinderDepth;
        const outerRx = rx + 14;
        const outerRy = ry + 14 * tiltRatio;
        const bottomRimY = bottomCy + ry; // Đáy thấp nhất của vành khối trụ

        // 1. Deep Floor Ambient Shadow under Pedestal
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(topCx, bottomRimY + 36, rx * 1.15, ry * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 14;
        ctx.fill();
        ctx.restore();

        // 2. Background Steampunk Pedestal Base (Chân bệ đỡ phía sau)
        drawPedestalBack(ctx, topCx, bottomRimY, rx);

        // 3. Extruded Cylinder Foundation (Đáy vành đồng khối trụ)
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(topCx, bottomCy, outerRx, outerRy, 0, 0, Math.PI);
        ctx.lineTo(topCx - outerRx, topCy);
        ctx.lineTo(topCx + outerRx, topCy);
        ctx.closePath();
        const baseBrassGrad = ctx.createLinearGradient(topCx - outerRx, 0, topCx + outerRx, 0);
        baseBrassGrad.addColorStop(0, '#451a03');
        baseBrassGrad.addColorStop(0.15, '#78350f');
        baseBrassGrad.addColorStop(0.35, '#b45309');
        baseBrassGrad.addColorStop(0.5, '#fde68a'); // vệt sáng phản quang vàng đồng ở giữa
        baseBrassGrad.addColorStop(0.7, '#d97706');
        baseBrassGrad.addColorStop(0.9, '#78350f');
        baseBrassGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = baseBrassGrad;
        ctx.fill();
        ctx.restore();

        // 4. Extruded Cylinder Facets (Thành khối trụ xoay tròn theo nan quạt)
        engine.slices.forEach((slice, idx) => {
            const start = slice.startAngle;
            const end = slice.endAngle;
            const segs = engine.getVisibleArcSegments(start, end, engine.currentAngle);
            const baseColor = slice.color || engine.getDefaultColor(idx);

            segs.forEach(([t1, t2]) => {
                ctx.save();
                ctx.beginPath();

                // Curved top edge
                const steps = Math.max(3, Math.ceil((t2 - t1) / 0.05));
                for (let j = 0; j <= steps; j++) {
                    const t = t1 + (t2 - t1) * (j / steps);
                    const px = topCx + Math.cos(t) * rx;
                    const py = topCy + Math.sin(t) * ry;
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }

                // Curved bottom edge (reverse loop: j--)
                for (let j = steps; j >= 0; j--) {
                    const t = t1 + (t2 - t1) * (j / steps);
                    const px = topCx + Math.cos(t) * rx;
                    const py = bottomCy + Math.sin(t) * ry;
                    ctx.lineTo(px, py);
                }
                ctx.closePath();

                // 3D Diffuse Lighting + Gold Metallic Sheen
                const midAngle = (t1 + t2) / 2;
                const lightFactor = 0.5 + 0.5 * Math.cos(midAngle - 0.45);

                const facetGrad = ctx.createLinearGradient(0, topCy, 0, bottomCy + 6);
                facetGrad.addColorStop(0, adjustBrightness(baseColor, lightFactor * 1.15));
                facetGrad.addColorStop(0.65, adjustBrightness(baseColor, lightFactor * 0.8));
                facetGrad.addColorStop(1, adjustBrightness(baseColor, lightFactor * 0.45));

                ctx.fillStyle = facetGrad;
                ctx.fill();

                // Nẹp viền kim loại vàng giữa các lát cắt trên thành trụ
                ctx.lineWidth = 1.6;
                ctx.strokeStyle = '#451a03';
                ctx.stroke();

                ctx.restore();
            });
        });

        // 5. Beveled Lower Brass Trim (Nẹp kim loại bo đáy khối trụ)
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(topCx, bottomCy, rx, ry, 0, 0, Math.PI);
        ctx.lineWidth = 3.5;
        const lowerTrimGrad = ctx.createLinearGradient(topCx - rx, 0, topCx + rx, 0);
        lowerTrimGrad.addColorStop(0, '#78350f');
        lowerTrimGrad.addColorStop(0.3, '#d97706');
        lowerTrimGrad.addColorStop(0.5, '#fef08a');
        lowerTrimGrad.addColorStop(0.7, '#d97706');
        lowerTrimGrad.addColorStop(1, '#78350f');
        ctx.strokeStyle = lowerTrimGrad;
        ctx.stroke();
        ctx.restore();

        // 6. Top Face Wheel Slices & Text (Mặt trên elip)
        ctx.save();
        ctx.translate(topCx, topCy);
        ctx.scale(1, tiltRatio);

        // Vành ngoài vàng đồng bản dày có đinh tán (Heavy Brass Rim with Rivets như Hình 2)
        drawTopHeavyBrassRim(ctx, rx);

        // Rotating Slices
        ctx.rotate(engine.currentAngle);

        engine.slices.forEach((slice, idx) => {
            const start = slice.startAngle;
            const end = slice.endAngle;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, rx, start, end);
            ctx.closePath();

            ctx.fillStyle = slice.color || engine.getDefaultColor(idx);
            ctx.fill();

            // Vạch chia nan quạt mạ vàng sang trọng
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#1e1b4b';
            ctx.stroke();

            // Chữ nan quạt
            engine.drawSliceText(ctx, slice, start, end, rx);
        });

        // Raised 3D Brass Pegs (Hàng chốt ghim vàng nhô cao nổi khối)
        drawRaisedPegs(ctx, engine.slices, rx);

        ctx.restore(); // restore top face scale & translation

        // 7. Turquoise Gem Center Hub encased in Gold (Tâm xoay Ngọc Bích khảm vàng như Hình 2)
        ctx.save();
        ctx.translate(topCx, topCy);
        ctx.scale(1, tiltRatio);
        drawTurquoiseGemHub(engine, ctx, 0, 0, rx);
        ctx.restore();

        // 8. Steampunk Front Pedestal & Plaque (Bệ đỡ phía trước có biển hiệu dập nổi)
        drawFrontPedestal(ctx, topCx, bottomRimY, rx);

        // 9. Draw Arcade Pointer at 3 o'clock
        drawPointer(engine);
    }

    /**
     * Draw Steampunk Pedestal Back Base Plate
     */
    function drawPedestalBack(ctx, cx, bottomRimY, rx) {
        ctx.save();
        const baseWidth = rx * 1.16;
        const baseY = bottomRimY + 12;

        // Base step 1 (Đế rộng tầng dưới)
        ctx.beginPath();
        ctx.ellipse(cx, baseY + 20, baseWidth, 14, 0, 0, Math.PI * 2);
        const baseGrad = ctx.createLinearGradient(cx - baseWidth, 0, cx + baseWidth, 0);
        baseGrad.addColorStop(0, '#291102');
        baseGrad.addColorStop(0.2, '#78350f');
        baseGrad.addColorStop(0.5, '#fde68a');
        baseGrad.addColorStop(0.8, '#78350f');
        baseGrad.addColorStop(1, '#291102');
        ctx.fillStyle = baseGrad;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#fde68a';
        ctx.stroke();

        // Đinh tán đồng chạy dọc chân đế
        for (let i = -5; i <= 5; i++) {
            const rivetX = cx + i * (baseWidth * 0.17);
            const rivetY = baseY + 20;
            ctx.beginPath();
            ctx.arc(rivetX, rivetY, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draw Steampunk Front Pedestal Pillar with Plaque
     */
    function drawFrontPedestal(ctx, cx, bottomRimY, rx) {
        ctx.save();
        const pillarW = rx * 0.74;
        const topW = pillarW * 0.72;
        const startY = bottomRimY - 6;
        const endY = bottomRimY + 30;

        // Thân bệ đỡ hình thang đón bánh xe
        ctx.beginPath();
        ctx.moveTo(cx - topW / 2, startY);
        ctx.lineTo(cx - pillarW / 2, endY);
        ctx.lineTo(cx + pillarW / 2, endY);
        ctx.lineTo(cx + topW / 2, startY);
        ctx.closePath();

        const pillarGrad = ctx.createLinearGradient(cx - pillarW, 0, cx + pillarW, 0);
        pillarGrad.addColorStop(0, '#291102');
        pillarGrad.addColorStop(0.2, '#78350f');
        pillarGrad.addColorStop(0.35, '#b45309');
        pillarGrad.addColorStop(0.5, '#fde68a');
        pillarGrad.addColorStop(0.65, '#b45309');
        pillarGrad.addColorStop(0.8, '#78350f');
        pillarGrad.addColorStop(1, '#291102');
        ctx.fillStyle = pillarGrad;
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = '#fef08a';
        ctx.stroke();

        // Biển kim loại đồng thau dập nổi: "★ LUCKY WHEEL ★"
        const plaqueW = pillarW * 0.88;
        const plaqueH = 17;
        const plaqueX = cx - plaqueW / 2;
        const plaqueY = startY + (endY - startY) * 0.32;

        ctx.beginPath();
        ctx.rect(plaqueX, plaqueY, plaqueW, plaqueH);
        const plaqueGrad = ctx.createLinearGradient(0, plaqueY, 0, plaqueY + plaqueH);
        plaqueGrad.addColorStop(0, '#fef08a');
        plaqueGrad.addColorStop(0.5, '#d97706');
        plaqueGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = plaqueGrad;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // 4 Đinh tán góc biển
        [-1, 1].forEach(dx => {
            [-1, 1].forEach(dy => {
                ctx.beginPath();
                ctx.arc(cx + dx * (plaqueW / 2 - 4), plaqueY + plaqueH / 2 + dy * 4.5, 1.6, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            });
        });

        // Chữ dập nổi
        ctx.fillStyle = '#451a03';
        ctx.font = '800 9.5px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ LUCKY WHEEL ★', cx, plaqueY + plaqueH / 2);

    }

    /**
     * Draw Top Heavy Brass Rim with Rivets (Vành vàng đinh tán như Hình 2)
     */
    function drawTopHeavyBrassRim(ctx, r) {
        ctx.save();

        const rimThickness = 14;

        // Vành đai đồng vàng bóng bẩy
        ctx.beginPath();
        ctx.arc(0, 0, r + rimThickness, 0, Math.PI * 2);
        const outerBrassGrad = ctx.createRadialGradient(0, 0, r, 0, 0, r + rimThickness);
        outerBrassGrad.addColorStop(0, '#b45309');
        outerBrassGrad.addColorStop(0.3, '#fde68a');
        outerBrassGrad.addColorStop(0.6, '#d97706');
        outerBrassGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = outerBrassGrad;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fef08a';
        ctx.stroke();

        // Vòng đinh tán đồng (Rivets) chạy quanh chu vi vành
        const rivetCount = 28;
        const rivetDist = r + rimThickness * 0.5;
        for (let i = 0; i < rivetCount; i++) {
            const angle = (Math.PI * 2 / rivetCount) * i;
            const rx = Math.cos(angle) * rivetDist;
            const ry = Math.sin(angle) * rivetDist;

            ctx.beginPath();
            ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 2;
            ctx.fill();

            ctx.lineWidth = 0.6;
            ctx.strokeStyle = '#78350f';
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Draw Raised 3D Brass Pegs with Specular Highlight
     */
    function drawRaisedPegs(ctx, slices, r) {
        slices.forEach(slice => {
            const angle = slice.startAngle;
            const pegDistance = r + 4;
            const px = Math.cos(angle) * pegDistance;
            const py = Math.sin(angle) * pegDistance;

            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, 4.2, 0, Math.PI * 2);

            const pegGrad = ctx.createRadialGradient(px - 1.2, py - 1.2, 0.5, px, py, 4.2);
            pegGrad.addColorStop(0, '#ffffff');
            pegGrad.addColorStop(0.3, '#fef08a');
            pegGrad.addColorStop(0.7, '#d97706');
            pegGrad.addColorStop(1, '#451a03');

            ctx.fillStyle = pegGrad;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetY = 2;
            ctx.fill();

            ctx.lineWidth = 1;
            ctx.strokeStyle = '#291102';
            ctx.stroke();
            ctx.restore();
        });
    }

    /**
     * Draw Turquoise Gem Center Hub encased in Gold (Bám sát Hình 2)
     */
    function drawTurquoiseGemHub(engine, ctx, cx, cy, r) {
        ctx.save();
        const hubRadius = Math.max(38, r * 0.18);

        // 1. Vòng nẹp đồng ngoài đính đinh tán
        ctx.beginPath();
        ctx.arc(cx, cy, hubRadius + 4, 0, Math.PI * 2);
        const goldCaseGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, hubRadius + 4);
        goldCaseGrad.addColorStop(0, '#fef08a');
        goldCaseGrad.addColorStop(0.4, '#d97706');
        goldCaseGrad.addColorStop(0.8, '#92400e');
        goldCaseGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = goldCaseGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#fde68a';
        ctx.stroke();

        // Các hạt ngọc vàng nhỏ bao quanh viền tâm
        const beadCount = 16;
        for (let i = 0; i < beadCount; i++) {
            const angle = (Math.PI * 2 / beadCount) * i;
            const bx = cx + Math.cos(angle) * (hubRadius + 1);
            const by = cy + Math.sin(angle) * (hubRadius + 1);
            ctx.beginPath();
            ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        // 2. Vành gương vàng đánh bóng
        ctx.beginPath();
        ctx.arc(cx, cy, hubRadius * 0.82, 0, Math.PI * 2);
        const bezelGrad = ctx.createLinearGradient(cx, cy - hubRadius, cx, cy + hubRadius);
        bezelGrad.addColorStop(0, '#fde68a');
        bezelGrad.addColorStop(0.5, '#b45309');
        bezelGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = bezelGrad;
        ctx.fill();

        // 3. Viên ngọc bích / ngọc lam hình cầu 3D lấp lánh (Turquoise Cabochon Gem)
        const gemR = hubRadius * 0.68;
        ctx.beginPath();
        ctx.arc(cx, cy, gemR, 0, Math.PI * 2);
        const gemGrad = ctx.createRadialGradient(cx - gemR * 0.35, cy - gemR * 0.35, 1, cx, cy, gemR);
        gemGrad.addColorStop(0, '#a5f3fc'); // Đốm sáng ngọc bích
        gemGrad.addColorStop(0.25, '#22d3ee');
        gemGrad.addColorStop(0.65, '#0891b2');
        gemGrad.addColorStop(0.9, '#155e75');
        gemGrad.addColorStop(1, '#083344');
        ctx.fillStyle = gemGrad;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#cffafe';
        ctx.stroke();

        // Vệt phản quang thủy tinh hình bán nguyệt trên đỉnh ngọc bích
        ctx.beginPath();
        ctx.ellipse(cx - gemR * 0.15, cy - gemR * 0.28, gemR * 0.45, gemR * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fill();

        // Chữ "QUAY" / "SPIN" vàng nổi trên mặt ngọc
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${Math.floor(gemR * 0.5)}px Montserrat, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 6;
        const spinText = window.LuckyWheelI18n ? window.LuckyWheelI18n.t('actions.spin') : 'SPIN';
        ctx.fillText(spinText, cx, cy);

        ctx.restore();
    }

    /**
     * Draw Arcade Brass Pointer at 3 o'clock (Kim chỉ đèn báo ngọc bích)
     * @param {LuckyWheelEngine} engine
     */
    function drawPointer(engine) {
        const pCanvas = engine.pointerCanvas;
        if (!pCanvas) return;
        const ctx = engine.pointerCtx;
        const w = engine.pWidth;
        const h = engine.pHeight;

        ctx.clearRect(0, 0, w, h);
        ctx.save();

        ctx.translate(w - 10, h / 2);
        ctx.rotate(engine.pointerDeflection);

        const needleLength = w - 16;
        const needleHalfHeight = 15;

        // 1. Khối kim đồng thau đón sáng (Upper Brass Facet)
        ctx.beginPath();
        ctx.moveTo(0, -needleHalfHeight);
        ctx.lineTo(0, 0);
        ctx.lineTo(-needleLength, 0);
        ctx.closePath();
        const topBrassGrad = ctx.createLinearGradient(0, -needleHalfHeight, 0, 0);
        topBrassGrad.addColorStop(0, '#fef08a');
        topBrassGrad.addColorStop(0.4, '#f59e0b');
        topBrassGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = topBrassGrad;
        ctx.fill();

        // 2. Khối kim đồng thau đổ bóng (Lower Brass Facet)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, needleHalfHeight);
        ctx.lineTo(-needleLength, 0);
        ctx.closePath();
        const botBrassGrad = ctx.createLinearGradient(0, 0, 0, needleHalfHeight);
        botBrassGrad.addColorStop(0, '#92400e');
        botBrassGrad.addColorStop(0.6, '#78350f');
        botBrassGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = botBrassGrad;
        ctx.fill();

        // 3. Đèn chỉ báo ngọc bích phát sáng trên thân kim (Turquoise Indicator Lamp)
        ctx.beginPath();
        ctx.arc(-needleLength * 0.45, 0, 4.2, 0, Math.PI * 2);
        const lampGrad = ctx.createRadialGradient(-needleLength * 0.45 - 1, -1, 0.5, -needleLength * 0.45, 0, 4.2);
        lampGrad.addColorStop(0, '#ffffff');
        lampGrad.addColorStop(0.3, '#67e8f9');
        lampGrad.addColorStop(0.8, '#0891b2');
        lampGrad.addColorStop(1, '#164e63');
        ctx.fillStyle = lampGrad;
        ctx.shadowColor = 'rgba(34, 211, 238, 0.85)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // 4. Đường gân giữa sắc sảo
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-needleLength, 0);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 4;
        ctx.stroke();

        // 5. Viền đồng vàng sáng bao quanh kim
        ctx.beginPath();
        ctx.moveTo(0, -needleHalfHeight);
        ctx.lineTo(0, needleHalfHeight);
        ctx.lineTo(-needleLength, 0);
        ctx.closePath();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#fde68a';
        ctx.stroke();

        // 6. Nắp chốt kim loại đồng thau bên phải
        ctx.beginPath();
        ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
        const pivotGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 9.5);
        pivotGrad.addColorStop(0, '#ffffff');
        pivotGrad.addColorStop(0.35, '#fde68a');
        pivotGrad.addColorStop(0.7, '#d97706');
        pivotGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = pivotGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#291102';
        ctx.stroke();

        ctx.restore();
    }

    return {
        draw: draw,
        drawPointer: drawPointer,
        adjustBrightness: adjustBrightness
    };
})();
