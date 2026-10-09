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
        'water-out': 300,
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
        unroll: 'water',
        'water-out': 'reroll',
        reroll: 'end-back',
        'end-back': 'turn-back'
    };
    window.RelineOsptPolymer = function ({ section, model, layerAxis, focus, canvas, visual, onPhaseChange, onFinished }) {
        const ctx = canvas.getContext('2d', { alpha: true });
        const images = {};
        let phase = '';
        let phaseAt = 0;
        let frame = 0;
        let width = 0;
        let height = 0;
        let pixelRatio = 1;
        let reverseUnrollFrom = 1;
        let reverseTurnFrom = 1;
        let waterAtExit = 0;
        let waterSprites = null;

        ['end', 'strip', 'water'].forEach((name) => {
            const image = new Image();
            image.decoding = 'async';
            image.src = focus.dataset[`${name}Src`];
            image.addEventListener('load', () => {
                if (name === 'water') waterSprites = null;
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
            section.dataset.polymerPhase = next;
            focus.setAttribute('aria-hidden', String(['prepare', 'hold', 'cover'].includes(next)));
            model.setAttribute('aria-hidden', String(['end', 'unroll', 'water', 'water-out', 'reroll', 'end-back'].includes(next)));
            onPhaseChange();
            if (scheduleFrame && !frame) frame = requestAnimationFrame(tick);
        }

        function finish() {
            phase = '';
            delete section.dataset.polymerPhase;
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
            if (['water-out', 'reroll', 'end-back', 'turn-back'].includes(phase)) return true;
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
            } else {
                waterAtExit = elapsed;
                reverseUnrollFrom = 1;
                setPhase('water-out');
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
            const radius = Math.min(width * .11, height * .11, 90);
            const stripWidth = Math.min(width * .94, 700);
            const stripHeight = stripWidth * (364 / 1672);
            const axis = layerAxis.getScreenCTM();
            const sleeveEnd = axis ? new DOMPoint(0, 0).matrixTransform(axis) : null;
            const capX = sleeveEnd ? sleeveEnd.x - rect.left : width * .58;
            const centerY = sleeveEnd ? sleeveEnd.y - rect.top : height * .5;
            return {
                radius,
                stripWidth,
                stripHeight,
                centerY,
                capX,
                flatX: (width - stripWidth) / 2,
                flatY: height * .5 - stripHeight / 2
            };
        }

        function drawCap(settings, turn = 1, alpha = 1, layersAlpha = 1) {
            if (alpha <= 0) return;
            const amount = ease(turn);
            const face = Math.max(.002, Math.sin(amount * Math.PI / 2));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(settings.capX, settings.centerY);
            ctx.scale(face, 1);
            ctx.beginPath();
            ctx.arc(0, 0, settings.radius, 0, Math.PI * 2);
            ctx.clip();
            const rim = ctx.createRadialGradient(-settings.radius * .26, -settings.radius * .31,
                settings.radius * .1, 0, 0, settings.radius);
            rim.addColorStop(0, '#45474a');
            rim.addColorStop(.62, '#191a1c');
            rim.addColorStop(.91, '#343638');
            rim.addColorStop(1, '#0a0b0c');
            ctx.fillStyle = rim;
            ctx.fillRect(-settings.radius, -settings.radius, settings.radius * 2, settings.radius * 2);
            const hollow = ctx.createRadialGradient(0, 0, settings.radius * .15,
                0, 0, settings.radius * .68);
            hollow.addColorStop(0, '#020202');
            hollow.addColorStop(.8, '#090909');
            hollow.addColorStop(1, '#242527');
            ctx.fillStyle = hollow;
            ctx.beginPath();
            ctx.arc(0, 0, settings.radius * .66, 0, Math.PI * 2);
            ctx.fill();
            if (loaded(images.end) && layersAlpha > 0) {
                ctx.globalAlpha = alpha * clamp(layersAlpha);
                ctx.drawImage(images.end, 145, 130, 965, 965,
                    -settings.radius, -settings.radius, settings.radius * 2, settings.radius * 2);
            }
            ctx.restore();
        }

        function drawUnrolled(settings, openness) {
            if (!loaded(images.strip)) return;
            const t = ease(openness);
            const radius = settings.radius;
            const finalWidth = settings.stripWidth;
            const finalHeight = settings.stripHeight;
            const centerX = settings.capX + (width * .5 - settings.capX) * t;
            const top = (settings.centerY - radius) * (1 - t) + settings.flatY * t;
            const depth = radius * .37 * (1 - t) + finalHeight * t;
            const arc = Math.max(.001, Math.PI * 2 * (1 - t));
            const length = Math.PI * 2 * radius * (1 - t) + finalWidth * t;
            const sourceTop = 294;
            const sourceHeight = 364;
            const segments = 108;

            const point = (s) => {
                const angle = (s - .5) * arc;
                const curveRadius = length / arc;
                return {
                    x: centerX + curveRadius * Math.sin(angle),
                    y: top + curveRadius * (1 - Math.cos(angle)),
                    nx: -Math.sin(angle),
                    ny: Math.cos(angle)
                };
            };

            for (let index = 0; index < segments; index += 1) {
                const start = index / segments;
                const end = (index + 1) / segments;
                const a = point(start);
                const b = point(end);
                const sourceX = 1672 * start;
                ctx.setTransform(
                    pixelRatio * (b.x - a.x), pixelRatio * (b.y - a.y),
                    pixelRatio * a.nx * depth, pixelRatio * a.ny * depth,
                    pixelRatio * a.x, pixelRatio * a.y
                );
                ctx.drawImage(images.strip, sourceX, sourceTop, 1672 / segments + .6, sourceHeight, 0, 0, 1.018, 1);
            }
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

            if (t > .96) {
                ctx.save();
                ctx.globalAlpha = ease((t - .96) / .04);
                ctx.drawImage(images.strip, 0, sourceTop, 1672, sourceHeight,
                    settings.flatX, settings.flatY, finalWidth, finalHeight);
                ctx.restore();
            }
            const capAlpha = 1 - ease(t / .32);
            if (capAlpha > 0) drawCap(settings, 1, capAlpha);
        }

        function createWaterSprites() {
            if (!loaded(images.water)) return [];
            const cuts = [
                { x: 121, y: 206, w: 112, h: 103, anchor: .20, start: 0 },
                { x: 345, y: 184, w: 132, h: 132, anchor: .25, start: 670 },
                { x: 707, y: 217, w: 105, h: 100, anchor: .49, start: 1310 },
                { x: 933, y: 205, w: 120, h: 112, anchor: .54, start: 1930 }
            ];
            return cuts.map((cut) => {
                const sprite = document.createElement('canvas');
                sprite.width = cut.w;
                sprite.height = cut.h;
                const sc = sprite.getContext('2d');
                sc.drawImage(images.water, cut.x, cut.y, cut.w, cut.h, 0, 0, cut.w, cut.h);
                sc.globalCompositeOperation = 'destination-in';
                const mask = sc.createRadialGradient(cut.w / 2, cut.h * .54, cut.w * .18,
                    cut.w / 2, cut.h * .54, Math.max(cut.w, cut.h) * .58);
                mask.addColorStop(0, 'rgba(0,0,0,1)');
                mask.addColorStop(.64, 'rgba(0,0,0,.96)');
                mask.addColorStop(1, 'rgba(0,0,0,0)');
                sc.fillStyle = mask;
                sc.fillRect(0, 0, cut.w, cut.h);
                return { ...cut, sprite };
            });
        }

        function drawWater(settings, elapsed, opacity = 1) {
            if (!loaded(images.water) || opacity <= 0) return;
            if (!waterSprites) waterSprites = createWaterSprites();
            const cycle = elapsed % 5600;
            const scale = settings.stripWidth / 1672 * 1.12;
            const departure = ease((cycle - 3150) / 1900);
            waterSprites.forEach((drop) => {
                const age = cycle - drop.start;
                if (age < 0) return;
                const fall = ease(age / 430);
                const pool = ease((age - 430) / 730);
                const drift = Math.min(26, Math.max(0, age - 430) * .015);
                const imageWidth = drop.w * scale * (1 + .32 * pool);
                const imageHeight = drop.h * scale * (1 - .37 * pool);
                const x = settings.flatX + settings.stripWidth * drop.anchor + drift
                    + departure * (settings.stripWidth + 200);
                const y = settings.flatY + 2 - imageHeight / 2 - (1 - fall) * 125
                    + departure * 12;
                if (x - imageWidth / 2 > width) return;
                ctx.save();
                ctx.globalAlpha = opacity * Math.min(1, age / 160);
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(drop.sprite, x - imageWidth / 2, y - imageHeight / 2,
                    imageWidth, imageHeight);
                if (fall > .96 && departure < .9) {
                    const puddle = ctx.createRadialGradient(x, settings.flatY + 1, 1,
                        x, settings.flatY + 1, imageWidth * .43);
                    puddle.addColorStop(0, 'rgba(236,244,245,.23)');
                    puddle.addColorStop(1, 'rgba(236,244,245,0)');
                    ctx.fillStyle = puddle;
                    ctx.beginPath();
                    ctx.ellipse(x, settings.flatY + 1, imageWidth * .48, 3.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });
        }

        function draw(now) {
            if (!ctx || ['prepare', 'hold', 'cover'].includes(phase)) return;
            const settings = layout();
            const elapsed = Math.max(0, now - phaseAt);
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            ctx.clearRect(0, 0, width, height);

            if (phase === 'turn') drawCap(settings, elapsed / durations.turn, 1, 0);
            else if (phase === 'end') drawCap(settings, 1, 1, ease(elapsed / durations.end));
            else if (phase === 'unroll') drawUnrolled(settings, elapsed / durations.unroll);
            else if (phase === 'water') {
                drawUnrolled(settings, 1);
                drawWater(settings, elapsed);
            } else if (phase === 'water-out') {
                drawUnrolled(settings, 1);
                drawWater(settings, waterAtExit, 1 - ease(elapsed / durations['water-out']));
            } else if (phase === 'reroll') {
                const duration = Math.max(160, durations.reroll * reverseUnrollFrom);
                drawUnrolled(settings, reverseUnrollFrom * (1 - elapsed / duration));
            } else if (phase === 'end-back') {
                drawCap(settings, 1, 1, 1 - ease(elapsed / durations['end-back']));
            } else if (phase === 'turn-back') {
                const duration = Math.max(180, durations['turn-back'] * reverseTurnFrom);
                drawCap(settings, reverseTurnFrom * (1 - elapsed / duration), 1, 0);
            }
        }

        function tick(now) {
            frame = 0;
            if (!phase) return;
            let elapsed = now - phaseAt;
            let duration = durations[phase];
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
                const dx = x - settings.capX;
                const dy = y - settings.centerY;
                return Math.hypot(dx, dy) <= settings.radius * 1.1;
            }
            return x >= settings.flatX - 6 && x <= settings.flatX + settings.stripWidth + 6
                && y >= settings.flatY - 65 && y <= settings.flatY + settings.stripHeight + 12;
        }

        return { start, exit, reset, hitTest, get phase() { return phase; } };
    };
}());
