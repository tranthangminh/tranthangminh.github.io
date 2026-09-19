/**
 * Lucky Wheel - 3D Tilt Renderer (Chế Độ 3D Nghiêng)
 * 
 * Kiến trúc:
 * - Khối trụ 3D thể tích tương tự 3D Cylinder nhưng phối hợp cùng phép xoay 3D của wheel-wrapper.
 * - Độ dày (Extruded Cylinder Facets) mô phỏng thành khối trụ đồng nhất với màu nan quạt 2D.
 * - Độ dày có hiệu ứng biến thiên mượt mà từ 0% đến 100% khi chuyển từ 2D sang 3D.
 * - Tái sử dụng 100% bề mặt đĩa 2D chuẩn (engine.drawWheelDisc).
 * - Màu sắc viền kim loại xám thép đồng bộ tuyệt đối với style 2D.
 */

window.LuckyWheel3DTilt = (function () {
    'use strict';

    /**
     * Draw the 3D Tilt Wheel on Canvas
     * @param {LuckyWheelEngine} engine
     */
    function draw(engine) {
        const ctx = engine.ctx;
        const cx = engine.centerX;
        const cy = engine.centerY;
        const r = engine.radius;

        ctx.clearRect(0, 0, engine.width, engine.height);

        // Kích thước độ dày tối đa (ở 100% thickness)
        const maxDepth = Math.max(24, Math.min(38, Math.round(engine.width * 0.065)));
        const progress = engine.thicknessProgress !== undefined ? engine.thicknessProgress : 1;
        const depth = maxDepth * progress;

        // Nếu độ dày > 0.5px: Vẽ thành khối trụ 3D (giống 3D cylinder) bên dưới đĩa
        if (depth > 0.5) {
            drawCylinderDepth(ctx, engine, cx, cy, r, depth);
        }

        // 2. REUSE 100% bề mặt đĩa 2D chuẩn (Viền thép xám, Slices, Chốt bạc Chrome, Tâm cyan)
        engine.drawWheelDisc();

        // 3. REUSE 100% kim chỉ đỏ thể thao 2D
        engine.drawPointer();
    }

    /**
     * Vẽ độ dày khối trụ xoay theo nan quạt (tương tự 3D Cylinder nhưng dùng style kim loại thép xám đồng bộ với 2D)
     */
    function drawCylinderDepth(ctx, engine, cx, cy, r, depth) {
        const outerR = r + 8; // Bằng bán kính vành ngoài kim loại của 2D

        // 1. Đáy vành thép khối trụ (Under-rim foundation)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy + depth, outerR, 0, Math.PI);
        ctx.lineTo(cx - outerR, cy);
        ctx.lineTo(cx + outerR, cy);
        ctx.closePath();
        const baseGrad = ctx.createLinearGradient(cx - outerR, 0, cx + outerR, 0);
        baseGrad.addColorStop(0, '#090d16');
        baseGrad.addColorStop(0.2, '#1e293b');
        baseGrad.addColorStop(0.5, '#475569');
        baseGrad.addColorStop(0.8, '#1e293b');
        baseGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = baseGrad;
        ctx.fill();
        ctx.restore();

        // 2. Thành khối trụ xoay tròn theo nan quạt (Extruded Cylinder Facets giống 3D Cylinder)
        if (engine.slices && engine.slices.length > 0) {
            engine.slices.forEach((slice, idx) => {
                const start = slice.startAngle;
                const end = slice.endAngle;
                // Lấy các đoạn cung nằm ở nửa dưới đường tròn [0, PI] (hướng đối diện góc nhìn)
                const segs = engine.getVisibleArcSegments(start, end, engine.currentAngle);
                const baseColor = slice.color || (engine.getDefaultColor ? engine.getDefaultColor(idx) : '#eab308');

                segs.forEach(([t1, t2]) => {
                    ctx.save();
                    ctx.beginPath();

                    // Vòng cung trên tại mặt đĩa (cx, cy)
                    const steps = Math.max(3, Math.ceil((t2 - t1) / 0.05));
                    for (let j = 0; j <= steps; j++) {
                        const t = t1 + (t2 - t1) * (j / steps);
                        const px = cx + Math.cos(t) * r;
                        const py = cy + Math.sin(t) * r;
                        if (j === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }

                    // Vòng cung dưới tại đáy khối trụ (cx, cy + depth)
                    for (let j = steps; j >= 0; j--) {
                        const t = t1 + (t2 - t1) * (j / steps);
                        const px = cx + Math.cos(t) * r;
                        const py = cy + depth + Math.sin(t) * r;
                        ctx.lineTo(px, py);
                    }
                    ctx.closePath();

                    // Hiệu ứng ánh sáng 3D đa hướng (Diffuse Lighting)
                    const midAngle = (t1 + t2) / 2;
                    const lightFactor = 0.5 + 0.5 * Math.cos(midAngle - 0.45);

                    const facetGrad = ctx.createLinearGradient(0, cy, 0, cy + depth + 6);
                    facetGrad.addColorStop(0, engine.adjustBrightness(baseColor, lightFactor * 1.15));
                    facetGrad.addColorStop(0.65, engine.adjustBrightness(baseColor, lightFactor * 0.8));
                    facetGrad.addColorStop(1, engine.adjustBrightness(baseColor, lightFactor * 0.45));

                    ctx.fillStyle = facetGrad;
                    ctx.fill();

                    // Nẹp viền kim loại xám thép phân cách các lát cắt trên thành trụ
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#0f172a';
                    ctx.stroke();

                    ctx.restore();
                });
            });
        }

        // 3. Nẹp kim loại bo viền đáy khối trụ (Beveled Lower Rim Trim)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy + depth, outerR, 0, Math.PI);
        ctx.lineWidth = 2.5;
        const lowerRimGrad = ctx.createLinearGradient(cx - outerR, 0, cx + outerR, 0);
        lowerRimGrad.addColorStop(0, '#0f172a');
        lowerRimGrad.addColorStop(0.25, '#334155');
        lowerRimGrad.addColorStop(0.5, '#64748b');
        lowerRimGrad.addColorStop(0.75, '#334155');
        lowerRimGrad.addColorStop(1, '#0f172a');
        ctx.strokeStyle = lowerRimGrad;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw pointer for 3D Tilt mode (Tái sử dụng kim chuẩn 2D)
     * @param {LuckyWheelEngine} engine
     */
    function drawPointer(engine) {
        engine.drawStandardPointer();
    }

    return {
        draw: draw,
        drawPointer: drawPointer
    };
})();
