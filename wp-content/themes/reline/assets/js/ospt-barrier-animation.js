(function () {
    'use strict';

    const clamp = (value) => Math.max(0, Math.min(1, value));
    const ease = (value) => {
        const t = clamp(value);
        return t * t * (3 - 2 * t);
    };
    const durations = {
        prepare: 420,
        hold: 200,
        cover: 280,
        turn: 920,
        end: 180,
        unroll: 1100,
        separate: 850,
        'molecules-out': 300,
        'cover-return': 850,
        reroll: 1100,
        'end-back': 180,
        'turn-back': 900
    };
    const nextPhase = {
        prepare: 'hold',
        hold: 'cover',
        cover: 'turn',
        turn: 'end',
        end: 'unroll',
        unroll: 'separate',
        separate: 'molecules',
        'molecules-out': 'cover-return',
        'cover-return': 'reroll',
        reroll: 'end-back',
        'end-back': 'turn-back'
    };
    const molecules = [
        { at: 0, y: .18, size: .88, tilt: -.22 },
        { at: 260, y: .49, size: 1.06, tilt: .24 },
        { at: 590, y: .75, size: .82, tilt: -.1 },
        { at: 960, y: .32, size: .94, tilt: .18 },
        { at: 1310, y: .63, size: .78, tilt: -.25 },
        { at: 1650, y: .9, size: .72, tilt: .12 }
    ];

    function createLayerAnimation({ section, model, layerAxis, focus, canvas, visual, onPhaseChange, onFinished, mode }) {
        const adhesive = mode === 'adhesive';
        const phaseKey = adhesive ? 'adhesivePhase' : 'barrierPhase';
        const ctx = canvas.getContext('2d', { alpha: true });
        const images = {};
        let phase = '';
        let phaseAt = 0;
        let frame = 0;
        let width = 0;
        let height = 0;
        let pixelRatio = 1;
        let reverseTurnFrom = 1;
        let reverseUnrollFrom = 1;
        let reverseSeparateFrom = 1;
        let moleculesAtExit = 0;

        ['end', 'strip'].forEach((name) => {
            const image = new Image();
            image.decoding = 'async';
            image.src = focus.dataset[`${name}Src`];
            image.addEventListener('load', () => {
                if (phase && !frame) frame = requestAnimationFrame(tick);
            });
            images[name] = image;
        });

        function loaded(image) {
            return image.complete && image.naturalWidth > 0;
        }

        function setPhase(next, at = performance.now(), scheduleFrame = true) {
            phase = next;
            phaseAt = at;
            section.dataset[phaseKey] = next;
            focus.setAttribute('aria-hidden', String(['prepare', 'hold', 'cover'].includes(next)));
            model.setAttribute('aria-hidden', String(['end', 'unroll', 'separate', 'molecules', 'molecules-out', 'cover-return', 'reroll', 'end-back'].includes(next)));
            onPhaseChange();
            if (scheduleFrame && !frame) frame = requestAnimationFrame(tick);
        }

        function finish() {
            phase = '';
            delete section.dataset[phaseKey];
            focus.setAttribute('aria-hidden', 'true');
            model.setAttribute('aria-hidden', 'false');
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            onPhaseChange();
            onFinished();
        }

        function start() {
            if (!ctx || phase) return;
            setPhase('prepare');
        }

        function exit(immediate = false) {
            if (!phase) return false;
            if (immediate || ['prepare', 'hold', 'cover'].includes(phase)) {
                finish();
                return true;
            }
            if (['molecules-out', 'cover-return', 'reroll', 'end-back', 'turn-back'].includes(phase)) return true;
            const elapsed = performance.now() - phaseAt;
            if (phase === 'turn') {
                reverseTurnFrom = ease(elapsed / durations.turn);
                setPhase('turn-back');
            } else if (phase === 'end') {
                reverseTurnFrom = 1;
                setPhase('end-back');
            } else if (phase === 'unroll') {
                reverseUnrollFrom = ease(elapsed / durations.unroll);
                setPhase('reroll');
            } else if (phase === 'separate') {
                reverseSeparateFrom = ease(elapsed / durations.separate);
                setPhase('cover-return');
            } else {
                moleculesAtExit = elapsed;
                reverseSeparateFrom = 1;
                setPhase('molecules-out');
            }
            return true;
        }

        function reset() {
            if (phase) finish();
        }

        function layout() {
            const rect = visual.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            if (rect.width !== width || rect.height !== height || dpr !== pixelRatio) {
                width = rect.width;
                height = rect.height;
                pixelRatio = dpr;
                canvas.width = Math.max(1, Math.round(width * dpr));
                canvas.height = Math.max(1, Math.round(height * dpr));
            }
            const axis = layerAxis.getScreenCTM();
            const sleeveEnd = axis ? new DOMPoint(0, 0).matrixTransform(axis) : null;
            const radius = Math.min(width * .11, height * .11, 90);
            const stripLength = Math.min(height * .9, 880);
            const stripThickness = stripLength * (364 / 1672);
            const flatRight = Math.min(width * .66, width - 82);
            return {
                radius,
                capX: sleeveEnd ? sleeveEnd.x - rect.left : width * .58,
                capY: sleeveEnd ? sleeveEnd.y - rect.top : height * .5,
                stripLength,
                stripThickness,
                flatRight,
                flatTop: (height - stripLength) / 2,
                blackThickness: stripThickness * (82 / 364),
                outerThickness: stripThickness * (120 / 364),
                separation: adhesive ? Math.min(width * .21, 132)
                    : width - flatRight + stripThickness * (82 / 364) + 32
            };
        }

        function drawCap(settings, turn = 1, alpha = 1) {
            if (!loaded(images.end) || alpha <= 0) return;
            const face = Math.max(.002, Math.sin(ease(turn) * Math.PI / 2));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(settings.capX, settings.capY);
            ctx.scale(face, 1);
            ctx.beginPath();
            ctx.arc(0, 0, settings.radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(images.end, 145, 130, 965, 965,
                -settings.radius, -settings.radius, settings.radius * 2, settings.radius * 2);
            ctx.restore();
        }

        function drawFullStrip(settings) {
            ctx.save();
            ctx.translate(settings.flatRight, height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(images.strip, 0, 294, 1672, 364,
                -settings.stripLength / 2, 0, settings.stripLength, settings.stripThickness);
            ctx.restore();
        }

        function drawUnrolled(settings, openness) {
            if (!loaded(images.strip)) return;
            const t = ease(openness);
            const radius = settings.radius;
            const arc = Math.max(.001, Math.PI * 2 * (1 - t));
            const length = Math.PI * 2 * radius * (1 - t) + settings.stripLength * t;
            const depth = radius * .37 * (1 - t) + settings.stripThickness * t;
            const baseX = settings.capX + (settings.flatRight - settings.capX) * t;
            const baseY = settings.capY + (height / 2 - settings.capY) * t;
            const segments = 108;
            const point = (s) => {
                const angle = (s - .5) * arc;
                const curveRadius = length / arc;
                return {
                    x: baseX + radius * (1 - t) - curveRadius * (1 - Math.cos(angle)),
                    y: baseY + curveRadius * Math.sin(angle),
                    nx: -Math.cos(angle),
                    ny: -Math.sin(angle)
                };
            };

            ctx.save();
            ctx.globalAlpha = ease(t / .24);
            for (let index = 0; index < segments; index += 1) {
                const start = index / segments;
                const end = (index + 1) / segments;
                const a = point(start);
                const b = point(end);
                ctx.setTransform(
                    pixelRatio * (b.x - a.x), pixelRatio * (b.y - a.y),
                    pixelRatio * a.nx * depth, pixelRatio * a.ny * depth,
                    pixelRatio * a.x, pixelRatio * a.y
                );
                ctx.drawImage(images.strip, 1672 * start, 294, 1672 / segments + .6, 364,
                    0, 0, 1.018, 1);
            }
            ctx.restore();
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            if (t > .96) {
                ctx.save();
                ctx.globalAlpha = ease((t - .96) / .04);
                drawFullStrip(settings);
                ctx.restore();
            }
            const capAlpha = 1 - ease(t / .32);
            if (capAlpha > 0) drawCap(settings, 1, capAlpha);
        }

        function drawSeparated(settings, amount, tension = 0) {
            if (!loaded(images.strip)) return;
            const separation = settings.separation * ease(amount) + (adhesive ? tension * 13 * ease(amount) : 0);
            if (separation < .5) {
                drawFullStrip(settings);
                return;
            }
            ctx.save();
            ctx.translate(settings.flatRight, height / 2);
            ctx.rotate(Math.PI / 2);
            if (adhesive) {
                ctx.drawImage(images.strip, 0, 414, 1672, 244,
                    -settings.stripLength / 2, settings.outerThickness,
                    settings.stripLength, settings.stripThickness - settings.outerThickness);
                ctx.drawImage(images.strip, 0, 294, 1672, 120,
                    -settings.stripLength / 2, -separation,
                    settings.stripLength, settings.outerThickness);
            } else {
                ctx.drawImage(images.strip, 0, 376, 1672, 282,
                    -settings.stripLength / 2, settings.blackThickness,
                    settings.stripLength, settings.stripThickness - settings.blackThickness);
                ctx.drawImage(images.strip, 0, 294, 1672, 82,
                    -settings.stripLength / 2, -separation,
                    settings.stripLength, settings.blackThickness);
            }
            ctx.restore();
            if (adhesive) drawAdhesiveBonds(settings, separation, ease(amount));
        }

        function drawAdhesiveBonds(settings, separation, opacity) {
            const from = settings.flatRight - settings.outerThickness;
            const to = from + separation;
            const top = settings.flatTop + 14;
            const length = settings.stripLength - 28;
            ctx.save();
            ctx.lineWidth = .7;
            for (let index = 0; index < 23; index += 1) {
                const fraction = (index + .5) / 23;
                const y = top + length * fraction;
                const drift = Math.sin(index * 2.4) * 5;
                ctx.strokeStyle = index % 4 === 0
                    ? `rgba(244,190,255,${.7 * opacity})`
                    : `rgba(163,91,185,${.38 * opacity})`;
                ctx.beginPath();
                ctx.moveTo(from - 1, y);
                ctx.bezierCurveTo(from + separation * .33, y + drift,
                    to - separation * .28, y - drift * .6, to + 1, y + drift * .25);
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawAdhesionEffect(settings, elapsed, opacity = 1) {
            const cycle = 7800;
            const segment = Math.floor((elapsed % cycle) / 2600);
            const local = elapsed % 2600;
            const labels = ['ВОДА', 'ХИМИЧЕСКАЯ СРЕДА', 'АБРАЗИВ'];
            const t = local / 2600;
            const tension = Math.sin(Math.PI * ease(Math.min(1, t * 1.8))) * .85 * opacity;
            drawSeparated(settings, 1, tension);
            const left = settings.flatRight - settings.outerThickness;
            const right = left + settings.separation + tension * 13;
            const center = settings.flatTop + settings.stripLength * .5;
            ctx.save();
            ctx.globalAlpha = opacity * Math.min(1, local / 350, (2600 - local) / 320);
            ctx.strokeStyle = '#d7b4e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(right + 12, center);
            ctx.lineTo(right + 52 + 12 * tension, center);
            ctx.lineTo(right + 43 + 12 * tension, center - 5);
            ctx.moveTo(right + 52 + 12 * tension, center);
            ctx.lineTo(right + 43 + 12 * tension, center + 5);
            ctx.stroke();
            ctx.fillStyle = '#e6d8e9';
            ctx.font = '600 11px sans-serif';
            ctx.letterSpacing = '1px';
            ctx.fillText(labels[segment], Math.min(width - 170, right + 18), Math.max(32, settings.flatTop - 20));
            // Conditions touch the surface; the same bonded layers remain held throughout.
            const effectX = Math.min(width - 28, right + 18);
            for (let index = 0; index < 8; index += 1) {
                const y = settings.flatTop + settings.stripLength * ((index + .5) / 8);
                const motion = (local * .028 + index * 23) % 64;
                const x = effectX + Math.max(0, 38 - motion);
                if (segment === 0) {
                    ctx.fillStyle = 'rgba(210,231,240,.65)';
                    ctx.beginPath();
                    ctx.ellipse(x, y + motion * .13, 2.4, 4.1, .3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (segment === 1) {
                    ctx.strokeStyle = 'rgba(241,155,113,.72)';
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = 'rgba(191,183,172,.7)';
                    ctx.fillRect(x, y, 3, 3);
                }
            }
            ctx.fillStyle = '#cbb8d2';
            ctx.font = '500 11px sans-serif';
            ctx.fillText('Сцепление сохраняется', Math.max(8, left - 60),
                Math.min(height - 18, settings.flatTop + settings.stripLength + 28));
            ctx.restore();
        }

        function sphere(x, y, radius, light, mid, dark) {
            const gradient = ctx.createRadialGradient(x - radius * .35, y - radius * .45,
                radius * .12, x, y, radius);
            gradient.addColorStop(0, light);
            gradient.addColorStop(.48, mid);
            gradient.addColorStop(1, dark);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        function drawMolecule(x, y, size, tilt, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(tilt);
            ctx.lineWidth = 3 * size;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#a8b7c5';
            const bondX = 10 * size * Math.cos(52.25 * Math.PI / 180);
            const bondY = 10 * size * Math.sin(52.25 * Math.PI / 180);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(bondX, -bondY);
            ctx.moveTo(0, 0);
            ctx.lineTo(bondX, bondY);
            ctx.stroke();
            sphere(bondX, -bondY, 4.4 * size, '#d8f6ff', '#408bd5', '#153a8e');
            sphere(bondX, bondY, 4.4 * size, '#d8f6ff', '#408bd5', '#153a8e');
            sphere(0, 0, 6.4 * size, '#ffb6ac', '#ec433e', '#8f161b');
            ctx.restore();
        }

        function drawMolecules(settings, elapsed, opacity = 1) {
            const cycle = 3800;
            const barrierX = settings.flatRight - settings.blackThickness;
            molecules.forEach((molecule, index) => {
                if (elapsed < molecule.at) return;
                const age = (elapsed - molecule.at) % cycle;
                if (age > 2300) return;
                const startX = width + 35 + index * 7;
                const impactX = barrierX + 6.4 * molecule.size;
                const approach = ease(age / 900);
                const bounce = ease((age - 900) / 1400);
                const x = age <= 900
                    ? startX + (impactX - startX) * approach
                    : impactX + (startX - impactX) * bounce;
                const baseY = settings.flatTop + settings.stripLength * molecule.y;
                const y = baseY + (age <= 900 ? 12 * (1 - approach) : -12 * bounce);
                const fade = age < 180 ? ease(age / 180) : 1 - ease((age - 2050) / 250);
                const impact = Math.max(0, 1 - Math.abs(age - 900) / 160);
                if (impact > 0) {
                    ctx.save();
                    ctx.globalAlpha = impact * opacity * .5;
                    const flash = ctx.createRadialGradient(barrierX, baseY, 1, barrierX, baseY, 34);
                    flash.addColorStop(0, '#ffd9eb');
                    flash.addColorStop(1, 'rgba(255,100,165,0)');
                    ctx.fillStyle = flash;
                    ctx.beginPath();
                    ctx.arc(barrierX, baseY, 34, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                drawMolecule(x, y, molecule.size, molecule.tilt + bounce * .35,
                    opacity * clamp(fade));
            });
        }

        function draw(now) {
            if (!ctx || ['prepare', 'hold', 'cover'].includes(phase)) return;
            const settings = layout();
            const elapsed = Math.max(0, now - phaseAt);
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            ctx.clearRect(0, 0, width, height);

            if (phase === 'turn') drawCap(settings, elapsed / durations.turn);
            else if (phase === 'end' || phase === 'end-back') drawCap(settings);
            else if (phase === 'unroll') drawUnrolled(settings, elapsed / durations.unroll);
            else if (phase === 'separate') drawSeparated(settings, elapsed / durations.separate);
            else if (phase === 'molecules') {
                if (adhesive) drawAdhesionEffect(settings, elapsed);
                else {
                    drawSeparated(settings, 1);
                    drawMolecules(settings, elapsed);
                }
            } else if (phase === 'molecules-out') {
                if (adhesive) drawAdhesionEffect(settings, moleculesAtExit,
                    1 - ease(elapsed / durations['molecules-out']));
                else {
                    drawSeparated(settings, 1);
                    drawMolecules(settings, moleculesAtExit, 1 - ease(elapsed / durations['molecules-out']));
                }
            } else if (phase === 'cover-return') {
                const duration = Math.max(160, durations['cover-return'] * reverseSeparateFrom);
                drawSeparated(settings, reverseSeparateFrom * (1 - elapsed / duration));
            } else if (phase === 'reroll') {
                const duration = Math.max(160, durations.reroll * reverseUnrollFrom);
                drawUnrolled(settings, reverseUnrollFrom * (1 - elapsed / duration));
            } else if (phase === 'turn-back') {
                const duration = Math.max(180, durations['turn-back'] * reverseTurnFrom);
                drawCap(settings, reverseTurnFrom * (1 - elapsed / duration));
            }
        }

        function tick(now) {
            frame = 0;
            if (!phase) return;
            let elapsed = now - phaseAt;
            let duration = durations[phase];
            if (phase === 'cover-return') duration = Math.max(160, duration * reverseSeparateFrom);
            if (phase === 'reroll') duration = Math.max(160, duration * reverseUnrollFrom);
            if (phase === 'turn-back') duration = Math.max(180, duration * reverseTurnFrom);
            while (duration && elapsed >= duration) {
                if (phase === 'hold' && (!loaded(images.end) || !loaded(images.strip))) {
                    phaseAt = now;
                    break;
                }
                if (phase === 'turn-back') {
                    finish();
                    return;
                }
                const successor = nextPhase[phase];
                if (!successor) break;
                setPhase(successor, phaseAt + duration, false);
                elapsed = now - phaseAt;
                duration = durations[phase];
                if (phase === 'cover-return') duration = Math.max(160, duration * reverseSeparateFrom);
                if (phase === 'reroll') duration = Math.max(160, duration * reverseUnrollFrom);
            }
            draw(now);
            if (phase) frame = requestAnimationFrame(tick);
        }

        function hitTest(event) {
            if (!phase || ['prepare', 'hold', 'cover'].includes(phase)) return false;
            const rect = visual.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const settings = layout();
            if (['turn', 'end', 'end-back', 'turn-back'].includes(phase)) {
                return Math.hypot(x - settings.capX, y - settings.capY) <= settings.radius * 1.1;
            }
            const onStrip = x >= settings.flatRight - settings.stripThickness - 8
                && x <= settings.flatRight + 8
                && y >= settings.flatTop - 8
                && y <= settings.flatTop + settings.stripLength + 8;
            if (onStrip) return true;
            const elapsed = Math.max(0, performance.now() - phaseAt);
            const separation = phase === 'separate' ? ease(elapsed / durations.separate)
                : phase === 'cover-return' ? reverseSeparateFrom *
                    (1 - ease(elapsed / Math.max(160, durations['cover-return'] * reverseSeparateFrom)))
                    : ['molecules', 'molecules-out'].includes(phase) ? 1 : 0;
            const blackRight = settings.flatRight + settings.separation * separation;
            return separation > 0 && x >= blackRight - (adhesive ? settings.outerThickness : settings.blackThickness) - 8
                && x <= blackRight + 8
                && y >= settings.flatTop - 8
                && y <= settings.flatTop + settings.stripLength + 8;
        }

        return { start, exit, reset, hitTest, get phase() { return phase; } };
    }

    window.RelineOsptBarrier = (options) => createLayerAnimation({ ...options, mode: 'barrier' });
    window.RelineOsptAdhesive = (options) => createLayerAnimation({ ...options, mode: 'adhesive' });
}());
