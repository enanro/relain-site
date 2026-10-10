(function () {
    'use strict';

    const clamp = (n) => Math.max(0, Math.min(1, n));
    const ease = (n) => { const t = clamp(n); return t * t * (3 - 2 * t); };
    const bands = [
        { name: 'polymer', top: 293, bottom: 378 },
        { name: 'barrier', top: 378, bottom: 416 },
        { name: 'adhesive', top: 416, bottom: 452 },
        { name: 'steel', top: 452, bottom: 661 }
    ];

    window.RelineOsptLayerScene = function ({ section, canvas, onFinished }) {
        const ctx = canvas.getContext('2d', { alpha: true });
        const model = section.querySelector('.ospt-compare__model');
        const strip = new Image();
        strip.decoding = 'async';
        strip.src = canvas.dataset.stripSrc;
        const endcap = new Image();
        endcap.decoding = 'async';
        endcap.src = canvas.dataset.endSrc;
        let phase = '';
        let layer = '';
        let phaseAt = 0;
        let frame = 0;
        let width = 0;
        let height = 0;
        let ratio = 1;
        let transitionProgress = 0;
        let transitionDirection = 1;
        let transitionAt = 0;
        let modelTransform = '';
        let transitionFrom = 0;
        let fragment = null;
        let heldGlow = null;
        let waterStartedAt = 0;
        let adhesionStartedAt = 0;
        let adhesionPull = 0;
        let adhesionExitPull = 0;
        let lastLayout = null;

        const available = () => strip.complete && strip.naturalWidth > 0;
        function resize() {
            const rect = canvas.getBoundingClientRect();
            const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
            if (rect.width !== width || rect.height !== height || nextRatio !== ratio) {
                width = rect.width;
                height = rect.height;
                ratio = nextRatio;
                canvas.width = Math.round(width * ratio);
                canvas.height = Math.round(height * ratio);
            }
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        }

        function backdrop() {
            // The third screen owns the backdrop and its orange glow.
            ctx.clearRect(0, 0, width, height);
        }

        function drawEndcap(face, alpha = 1, unroll = 0) {
            if (!endcap.complete || !endcap.naturalWidth || face <= 0 || alpha <= 0) return;
            const radius = Math.min(width * .35, height * .27) * (1 - .8 * unroll);
            const x = width * (.14 + .36 * face - .42 * unroll);
            const y = height * .5;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.scale(Math.max(.001, face), 1);
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(endcap, 152, 128, 950, 950,
                -radius, -radius, radius * 2, radius * 2);
            ctx.restore();
        }

        function makeFragment() {
            const image = model.querySelector('.ospt-compare__pile--coated');
            fragment = document.createElement('div');
            fragment.setAttribute('aria-hidden', 'true');
            fragment.style.cssText = 'position:absolute;z-index:3;pointer-events:none;opacity:0;overflow:visible;';
            fragment.style.top = `${model.offsetTop}px`;
            fragment.style.left = `${model.offsetLeft}px`;
            fragment.style.width = `${model.offsetWidth}px`;
            fragment.style.height = `${model.offsetHeight}px`;
            fragment.style.transformOrigin = getComputedStyle(model).transformOrigin;
            fragment.style.clipPath = 'inset(0 0 78% 0)';
            const piece = document.createElement('img');
            piece.src = image.currentSrc || image.src;
            piece.alt = '';
            piece.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform:scale(.82);';
            fragment.append(piece);
            canvas.parentElement.insertBefore(fragment, canvas);
        }

        function holdOriginalGlow() {
            const glow = model.querySelector('.ospt-compare__glow');
            const style = getComputedStyle(glow);
            heldGlow = document.createElement('div');
            heldGlow.setAttribute('aria-hidden', 'true');
            heldGlow.style.cssText = 'position:absolute;z-index:2;pointer-events:none;';
            heldGlow.style.top = `${model.offsetTop}px`;
            heldGlow.style.left = `${model.offsetLeft}px`;
            heldGlow.style.width = `${model.offsetWidth}px`;
            heldGlow.style.height = `${model.offsetHeight}px`;
            heldGlow.style.transformOrigin = getComputedStyle(model).transformOrigin;
            heldGlow.style.transform = modelTransform;
            const image = document.createElement('img');
            image.src = glow.currentSrc || glow.src;
            image.alt = '';
            image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
            image.style.opacity = style.opacity;
            image.style.filter = style.filter;
            image.style.transform = style.transform;
            heldGlow.append(image);
            canvas.parentElement.insertBefore(heldGlow, canvas);
        }

        function drawTransition(progress) {
            backdrop();
            const fracture = ease((progress - .16) / .13);
            const turn = ease((progress - .29) / .35);
            const unroll = ease((progress - .64) / .36);
            const movement = ` rotateY(${(90 * turn).toFixed(3)}deg) scale(${(1 + .18 * turn).toFixed(4)})`;
            model.style.transform = modelTransform + movement;
            model.style.clipPath = fracture > .001 ? `inset(${(22 * fracture + 8 * turn).toFixed(3)}% 0 0 0)` : '';
            model.style.opacity = String(1 - ease((progress - .56) / .11));
            if (fragment) {
                fragment.style.transform = modelTransform + ` translate(${(-45 * fracture).toFixed(2)}px, ${(90 * fracture).toFixed(2)}px) rotateZ(${(-14 * fracture).toFixed(2)}deg)`;
                fragment.style.opacity = String(fracture * (1 - ease((progress - .31) / .15)));
            }
            if (turn > 0 && unroll < 1) drawEndcap(turn, 1 - ease(unroll), unroll);
            if (unroll > 0 && available()) {
                ctx.save();
                const reveal = ease(unroll);
                ctx.beginPath();
                ctx.rect(width * .82 * (1 - reveal), 0, width, height);
                ctx.clip();
                drawRibbon(0, 0, 0, 0, false);
                ctx.restore();
            }
        }

        function ribbonLayout(orientation) {
            const vertical = ease(orientation);
            const length = width * 1.09 * (1 - vertical) + height * 1.12 * vertical;
            const scale = length / 1672;
            return {
                x: width * (.5 - .17 * vertical),
                y: height * .5,
                length,
                scale,
                total: (bands[3].bottom - bands[0].top) * scale,
                angle: Math.PI / 2 * vertical
            };
        }

        function peelProfile(position) {
            return 1 - ease((position - .08) / .55);
        }

        function drawAdhesiveFibers(layout, pull) {
            const bond = -layout.total / 2 + (85 + 38) * layout.scale;
            const stretch = layout.total * .56 * pull;
            const cut = .04 + pull * .19;
            const gap = ctx.createLinearGradient(0, bond, 0, bond - stretch);
            gap.addColorStop(0, 'rgba(156,70,197,.92)');
            gap.addColorStop(.25, 'rgba(168,77,210,.75)');
            gap.addColorStop(.55, 'rgba(183,95,219,.56)');
            gap.addColorStop(.85, 'rgba(195,103,227,.82)');
            gap.addColorStop(1, 'rgba(222,142,243,.94)');
            const fiber = ctx.createLinearGradient(0, bond, 0, bond - stretch);
            fiber.addColorStop(0, 'rgba(157,73,196,.58)');
            fiber.addColorStop(.55, 'rgba(225,151,248,.80)');
            fiber.addColorStop(1, 'rgba(173,82,207,.74)');
            ctx.save();
            ctx.globalAlpha = ease(pull / .22);
            ctx.fillStyle = gap;
            ctx.beginPath();
            for (let i = 0; i <= 42; i++) {
                const u = cut + i / 42 * (.63 - cut);
                const x = -layout.length / 2 + u * layout.length;
                const y = bond - stretch * peelProfile(u);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            for (let i = 42; i >= 0; i--) {
                const u = .1 + i / 42 * .53;
                ctx.lineTo(-layout.length / 2 + u * layout.length, bond);
            }
            ctx.closePath();
            // The dark spaces are pulled out of one continuous adhesive film.
            // Their uneven, tapered contours avoid the look of drilled holes.
            const openings = [];
            const cavities = [
                { u: .303, span: .025, depth: .66, lean: -.24 },
                { u: .397, span: .032, depth: .76, lean: .17 },
                { u: .497, span: .028, depth: .70, lean: -.12 }
            ];
            cavities.forEach(({ u, span, depth, lean }, i) => {
                const reach = stretch * peelProfile(u);
                if (reach < 16) return;
                const x = -layout.length / 2 + u * layout.length;
                const half = span * layout.length;
                const root = bond - Math.min(3.5, reach * .055);
                const tip = bond - reach * depth;
                const trace = () => {
                    ctx.moveTo(x - half, root);
                    ctx.bezierCurveTo(x - half * .93, bond - reach * .27,
                        x - half * (.45 + lean), bond - reach * .62,
                        x - half * .19, tip + reach * .055);
                    ctx.bezierCurveTo(x + half * .11, tip - reach * .04,
                        x + half * .52, tip + reach * .17,
                        x + half * .67, bond - reach * .48);
                    ctx.bezierCurveTo(x + half * (1.06 + lean), bond - reach * .22,
                        x + half * .94, root - reach * .035,
                        x + half, root);
                    ctx.bezierCurveTo(x + half * .14, root - reach * .095,
                        x - half * .42, root + reach * .02,
                        x - half, root);
                    ctx.closePath();
                };
                trace();
                openings.push(trace);
            });
            ctx.fill('evenodd');
            ctx.strokeStyle = 'rgba(234,164,245,.53)';
            ctx.lineWidth = 1.15;
            openings.forEach(trace => {
                ctx.beginPath();
                trace();
                ctx.stroke();
            });
            ctx.strokeStyle = fiber;
            for (let i = 0; i < 12; i++) {
                const u = .145 + i / 12 * .43;
                const x = -layout.length / 2 + u * layout.length;
                const shift = (Math.sin(i * 2.73) * 24 + Math.sin(i * 6.29) * 14) * pull;
                const targetU = Math.max(cut, Math.min(.62, u + shift / layout.length));
                const reach = stretch * peelProfile(targetU);
                if (reach < 1) continue;
                ctx.globalAlpha = ease(pull / .2) * (.12 + (i % 5) * .04);
                ctx.lineWidth = .45 + (i % 3) * .12;
                ctx.beginPath();
                ctx.moveTo(x, bond + 1);
                ctx.bezierCurveTo(x - shift * .26, bond - reach * .29,
                    x + shift * 1.14, bond - reach * .71,
                    -layout.length / 2 + targetU * layout.length, bond - reach + 1);
                ctx.stroke();
            }
            ctx.globalAlpha = ease(pull / .22) * .62;
            ctx.strokeStyle = '#d390ea';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i <= 36; i++) {
                const u = cut + i / 36 * (.61 - cut);
                const x = -layout.length / 2 + u * layout.length;
                const y = bond - stretch * peelProfile(u) + 1;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        function drawRibbon(orientation = 0, separation = 0, tilt = 0, peel = 0, clear = true) {
            if (clear) backdrop();
            if (!available()) return null;
            const layout = ribbonLayout(orientation);
            layout.angle += tilt;
            layout.peel = peel;
            lastLayout = layout;
            ctx.save();
            ctx.translate(layout.x, layout.y);
            ctx.rotate(layout.angle);
            const start = -layout.total / 2;
            const drawBand = (band, warped = false) => {
                const bandHeight = (band.bottom - band.top) * layout.scale;
                const y = start + (band.top - bands[0].top) * layout.scale;
                if (warped) {
                    const count = Math.ceil(layout.length / 4.5);
                    const sourceWidth = 1672 / count;
                    const pieceWidth = layout.length / count;
                    const first = Math.floor((.04 + peel * .19) * count);
                    for (let i = first; i < count; i++) {
                        const u = (i + .5) / count;
                        const shift = layout.total * .56 * peel * peelProfile(u);
                        ctx.drawImage(strip, i * sourceWidth, band.top, sourceWidth, band.bottom - band.top,
                            -layout.length / 2 + i * pieceWidth, y - shift, pieceWidth + .45, bandHeight + .65);
                    }
                    const capU = (first + .5) / count;
                    const capX = -layout.length / 2 + first * pieceWidth;
                    const capShift = layout.total * .56 * peel * peelProfile(capU);
                    ctx.strokeStyle = band.name === 'polymer' ? 'rgba(240,239,236,.54)' : 'rgba(255,175,215,.66)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(capX, y - capShift);
                    ctx.lineTo(capX, y + bandHeight - capShift);
                    ctx.stroke();
                    return;
                }
                let offset = 0;
                if (layer === 'barrier' && band.name === 'polymer') offset = -height * .32 * ease(separation);
                ctx.drawImage(strip, 0, band.top, 1672, band.bottom - band.top,
                    -layout.length / 2, y + offset, layout.length, bandHeight + .7);
            };
            if (layer === 'adhesive' && orientation >= .999 && peel > .001) {
                drawBand(bands[3]);
                drawBand(bands[2]);
                drawAdhesiveFibers(layout, peel);
                drawBand(bands[1], true);
                drawBand(bands[0], true);
            } else bands.forEach((band) => drawBand(band));
            ctx.restore();
            return layout;
        }

        function waterBead(x, baseY, w, h, opacity) {
            if (opacity <= 0 || w <= 0) return;
            ctx.save();
            ctx.globalAlpha = opacity;
            const surface = ctx.createLinearGradient(x, baseY - h, x, baseY);
            surface.addColorStop(0, 'rgba(11,10,10,.88)');
            surface.addColorStop(.48, 'rgba(48,43,39,.75)');
            surface.addColorStop(.78, 'rgba(174,166,158,.67)');
            surface.addColorStop(1, 'rgba(251,250,247,.90)');
            ctx.fillStyle = surface;
            ctx.strokeStyle = 'rgba(248,247,243,.68)';
            ctx.lineWidth = Math.max(.7, Math.min(1.4, w * .045));
            ctx.beginPath();
            ctx.moveTo(x - w / 2, baseY);
            ctx.bezierCurveTo(x - w * .5, baseY - h * .54, x - w * .29, baseY - h, x, baseY - h);
            ctx.bezierCurveTo(x + w * .29, baseY - h, x + w * .5, baseY - h * .54, x + w / 2, baseY);
            ctx.quadraticCurveTo(x, baseY + Math.max(1, h * .09), x - w / 2, baseY);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.94)';
            ctx.lineWidth = Math.max(1, w * .075);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - w * .27, baseY - h * .58);
            ctx.quadraticCurveTo(x - w * .12, baseY - h * .92, x + w * .11, baseY - h * .83);
            ctx.stroke();
            if (w > 12) {
                ctx.fillStyle = 'rgba(255,255,255,.76)';
                ctx.beginPath();
                ctx.ellipse(x + w * .24, baseY - h * .38, Math.max(1, w * .045), Math.max(1, h * .075), -.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        function waterRivulet(x, y, length, progress, opacity) {
            if (progress <= 0 || opacity <= 0) return;
            const reach = length * ease(progress);
            const endX = x + reach * .62;
            const endY = y + reach;
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(205,202,197,.28)';
            ctx.lineWidth = 3.3;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + reach * .04, y + reach * .31,
                endX - reach * .18, endY - reach * .22, endX, endY);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(252,250,245,.61)';
            ctx.lineWidth = .85;
            ctx.stroke();
            const tip = ctx.createRadialGradient(endX - 2, endY - 3, 1, endX, endY, 8);
            tip.addColorStop(0, 'rgba(255,255,255,.96)');
            tip.addColorStop(.28, 'rgba(38,35,33,.82)');
            tip.addColorStop(.75, 'rgba(147,144,139,.82)');
            tip.addColorStop(1, 'rgba(248,247,244,.98)');
            ctx.fillStyle = tip;
            ctx.beginPath();
            ctx.ellipse(endX, endY, 5, 8, -.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        function drawWater(now, layout, alpha) {
            if (!layout || alpha <= 0) return;
            const cycle = (Math.max(0, now - waterStartedAt) / 5700) % 1;
            if (cycle >= .85) return;
            const left = -layout.length / 2;
            const right = layout.length / 2;
            const blackTop = -layout.total / 2;
            const blackHeight = 85 * layout.scale;
            const rim = blackTop + 1;
            const drain = ease((cycle - .44) / .38);
            ctx.save();
            ctx.translate(layout.x, layout.y);
            ctx.rotate(layout.angle);

            for (let i = 0; i < 18; i++) {
                const start = .008 + (i % 9) * .014;
                if (cycle < start || cycle >= start + .085) continue;
                const fall = ease((cycle - start) / .085);
                const x = left + layout.length * (.07 + ((i * .618034) % 1) * .86);
                const y = rim - (1 - fall) * (34 + i % 4 * 11);
                waterBead(x, y, 3 + i % 3, 4 + i % 4, alpha * ease((cycle - start) / .018));
            }

            // Beads collect along the top edge, merge, then glide down the slope to the right.
            for (let i = 0; i < 28; i++) {
                const born = .08 + (i % 11) * .018;
                if (cycle < born) continue;
                const seed = (i * .618034) % 1;
                const startX = left + layout.length * (.045 + seed * .87);
                const growth = ease((cycle - born) / .17);
                const flow = ease((cycle - .4 - (i % 5) * .012) / .37);
                const x = startX + (right + 38 - startX) * flow;
                const size = (i % 7 === 0 ? 31 : i % 3 === 0 ? 18 : 5 + i % 5 * 2) * layout.scale * 2.15;
                const w = Math.max(2, size * (.32 + growth * .68));
                const h = Math.max(2, w * (i % 7 === 0 ? .72 : .55));
                const tremble = Math.sin(now / 115 + i * 2.1) * .65 * (1 - drain);
                waterBead(x, rim + tremble, w, h, alpha * growth * (1 - ease((flow - .91) / .09)));
            }

            // A thin joined film follows the black coating, never a row of opaque circles.
            const film = ease((cycle - .19) / .15) * (1 - ease((cycle - .52) / .24));
            if (film > 0) {
                const filmStart = left + layout.length * .18 + drain * layout.length * .65;
                const filmEnd = Math.min(right, filmStart + layout.length * .42);
                const glint = ctx.createLinearGradient(filmStart, rim, filmEnd, rim);
                glint.addColorStop(0, 'rgba(255,255,255,0)');
                glint.addColorStop(.3, `rgba(244,242,238,${.24 * alpha * film})`);
                glint.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.strokeStyle = glint;
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(filmStart, rim + 2);
                ctx.quadraticCurveTo((filmStart + filmEnd) / 2, rim + 3, filmEnd, rim + 2);
                ctx.stroke();
            }

            // As in the reference, a few joined drops run down the face and leave its right edge.
            const streams = [
                { at: .29, start: .49, reach: .64 },
                { at: .57, start: .53, reach: 1.05 },
                { at: .78, start: .57, reach: .82 }
            ];
            streams.forEach(({ at, start, reach }) => {
                const progress = ease((cycle - start) / .3);
                const x = left + layout.length * at;
                const visibility = alpha * ease((cycle - start) / .08)
                    * (1 - ease((cycle - .78) / .08));
                waterRivulet(x, rim + 3, layout.total * reach, progress, visibility);
                waterBead(x, rim + 2, 12 * layout.scale * 2.15, 8 * layout.scale * 2.15,
                    visibility * (1 - progress * .6));
            });
            ctx.restore();
        }

        function drawMolecule(x, y, size, rotation, alpha) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#b3c0cc';
            ctx.beginPath();
            ctx.moveTo(-size * .2, size * .15);
            ctx.lineTo(-size * .9, size * .55);
            ctx.moveTo(size * .17, size * .17);
            ctx.lineTo(size * .8, size * .55);
            ctx.stroke();
            [[0, 0, size * .45, '#dc3f43'], [-size * .95, size * .57, size * .29, '#347bd0'], [size * .87, size * .58, size * .29, '#347bd0']].forEach(([cx, cy, r, color]) => {
                const shine = ctx.createRadialGradient(cx - r * .35, cy - r * .35, 1, cx, cy, r);
                shine.addColorStop(0, '#fff');
                shine.addColorStop(.23, color);
                shine.addColorStop(1, '#2a2732');
                ctx.fillStyle = shine;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        function drawBarrier(now, layout, alpha) {
            if (!layout) return;
            const top = height / 2 - layout.total / 2 + 85 * layout.scale;
            for (let i = 0; i < 10; i++) {
                const age = ((now / 1850) + i * .193) % 1;
                const x = width * (.08 + .84 * ((i * .371) % 1));
                const distance = age < .48 ? 1 - ease(age / .48) : ease((age - .48) / .52);
                const y = top - 12 - distance * (55 + (i % 4) * 12);
                drawMolecule(x, y, 9 + (i % 3) * 2, age * 1.3, alpha * (1 - ease((age - .8) / .2)));
            }
        }

        function adhesionTiming(now) {
            const time = Math.max(0, now - adhesionStartedAt) % 5500;
            const pull = time < 500 ? 0 : time < 2000 ? ease((time - 500) / 1500)
                : time < 3000 ? 1 : time < 5000 ? 1 - ease((time - 3000) / 2000) : 0;
            const arrows = ease((time - 500) / 450) * (1 - ease((time - 3150) / 850));
            return { pull, arrows };
        }

        function drawAdhesion(layout, pull, arrows) {
            if (!layout || arrows <= 0) return;
            const right = layout.x + layout.total / 2 + layout.total * .56 * pull;
            ctx.save();
            ctx.globalAlpha = arrows;
            ctx.shadowColor = 'rgba(245,240,250,.64)';
            ctx.shadowBlur = 14;
            for (let i = 0; i < 3; i++) {
                const x = right + 9 + i * 25;
                const y = height * (.32 - i * .055) - pull * 13;
                const length = 43 + i * 10;
                const fill = ctx.createLinearGradient(x, y, x + 23, y - length);
                fill.addColorStop(0, 'rgba(184,182,188,.22)');
                fill.addColorStop(.48, 'rgba(242,240,244,.62)');
                fill.addColorStop(1, 'rgba(255,255,255,.94)');
                ctx.fillStyle = fill;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + 8, y - length * .65);
                ctx.lineTo(x + 1, y - length * .67);
                ctx.lineTo(x + 23, y - length);
                ctx.lineTo(x + 34, y - length * .65);
                ctx.lineTo(x + 26, y - length * .68);
                ctx.lineTo(x + 18, y + 1);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        function drawEffect(now, progress = 1, alpha = 1, forcedPull = null) {
            const orientation = layer === 'adhesive' ? progress : 0;
            const separation = layer === 'barrier' ? progress : 0;
            const tilt = layer === 'polymer' ? Math.PI / 15 * progress : 0;
            const adhesion = layer === 'adhesive' && phase === 'effect' && forcedPull === null
                ? adhesionTiming(now) : { pull: forcedPull || 0, arrows: 0 };
            if (layer === 'adhesive') adhesionPull = adhesion.pull;
            const layout = drawRibbon(orientation, separation, tilt, adhesion.pull);
            if (layer === 'polymer') drawWater(now, layout, alpha * ease((progress - .45) / .45));
            else if (layer === 'barrier') drawBarrier(now, layout, alpha * progress);
            else drawAdhesion(layout, adhesion.pull, adhesion.arrows * alpha * progress);
        }

        function setPhase(next) {
            phase = next;
            phaseAt = performance.now();
            if (next === 'effect-in' && layer === 'polymer') waterStartedAt = phaseAt + 280;
            if (next === 'effect' && layer === 'adhesive') adhesionStartedAt = phaseAt;
            section.dataset.layerScene = next;
            if (!frame) frame = requestAnimationFrame(tick);
        }

        function start(nextLayer) {
            if (!ctx || phase) return false;
            layer = nextLayer;
            modelTransform = getComputedStyle(model).transform;
            holdOriginalGlow();
            makeFragment();
            transitionProgress = 0;
            transitionFrom = 0;
            transitionDirection = 1;
            setPhase('enter');
            transitionAt = phaseAt;
            return true;
        }

        function beginReverse() {
            transitionFrom = transitionProgress;
            transitionDirection = -1;
            setPhase('reverse');
            transitionAt = phaseAt;
        }

        function exit() {
            if (!phase || ['reverse', 'water-out', 'adhesion-release', 'effect-out'].includes(phase)) return;
            if (phase === 'enter') {
                beginReverse();
            } else {
                if (layer === 'adhesive') {
                    adhesionExitPull = adhesionPull;
                    setPhase('adhesion-release');
                } else setPhase(layer === 'polymer' ? 'water-out' : 'effect-out');
            }
        }

        function stop(notify = false) {
            canvas.style.opacity = '';
            model.style.transform = '';
            model.style.clipPath = '';
            model.style.opacity = '';
            if (fragment) fragment.remove();
            fragment = null;
            if (heldGlow) heldGlow.remove();
            heldGlow = null;
            phase = '';
            layer = '';
            lastLayout = null;
            adhesionPull = 0;
            delete section.dataset.layerScene;
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (notify) onFinished();
        }

        function tick(now) {
            frame = 0;
            if (!phase) return;
            resize();
            const elapsed = now - phaseAt;
            if (phase === 'enter' || phase === 'reverse') {
                transitionProgress = clamp(transitionFrom + transitionDirection * elapsed / 3400);
                drawTransition(transitionProgress);
                if (transitionDirection > 0 && transitionProgress >= 1) setPhase('effect-in');
                else if (transitionDirection < 0 && transitionProgress <= 0) {
                    stop(true);
                    return;
                }
            } else if (phase === 'effect-in') {
                const progress = ease(elapsed / (layer === 'adhesive' ? 750 : 650));
                drawEffect(now, progress, progress);
                if (progress >= 1) setPhase('effect');
            } else if (phase === 'effect') {
                drawEffect(now);
            } else if (phase === 'water-out') {
                drawEffect(now, 1, 1 - ease(elapsed / 300));
                if (elapsed >= 300) setPhase('effect-out');
            } else if (phase === 'adhesion-release') {
                drawEffect(now, 1, 1, adhesionExitPull * (1 - ease(elapsed / 550)));
                if (elapsed >= 550) setPhase('effect-out');
            } else if (phase === 'effect-out') {
                const progress = 1 - ease(elapsed / 650);
                drawEffect(now, progress, layer === 'polymer' ? 0 : Math.min(1, progress * 2), 0);
                if (progress <= 0) beginReverse();
            }
            if (phase && !frame) frame = requestAnimationFrame(tick);
        }

        function hitTest(event) {
            if (!phase || phase === 'enter' || phase === 'reverse') return false;
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (!lastLayout) return false;
            const dx = x - lastLayout.x;
            const dy = y - lastLayout.y;
            const along = Math.cos(lastLayout.angle) * dx + Math.sin(lastLayout.angle) * dy;
            const across = -Math.sin(lastLayout.angle) * dx + Math.cos(lastLayout.angle) * dy;
            return Math.abs(along) <= lastLayout.length / 2 + 8
                && across >= -lastLayout.total / 2 - lastLayout.total * .56 * (lastLayout.peel || 0) - 12
                && across <= lastLayout.total / 2 + 12;
        }

        return { start, exit, reset: () => stop(false), hitTest, get phase() { return phase; } };
    };
}());
