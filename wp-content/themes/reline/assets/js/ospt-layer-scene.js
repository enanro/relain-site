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
        const ctx = canvas.getContext('2d', { alpha: false });
        const videoSurface = document.createElement('canvas');
        const videoContext = videoSurface.getContext('2d');
        const strip = new Image();
        strip.decoding = 'async';
        strip.src = canvas.dataset.stripSrc;
        const videos = {
            forward: document.createElement('video'),
            reverse: document.createElement('video')
        };
        Object.entries(videos).forEach(([direction, video]) => {
            video.src = canvas.dataset[`${direction}Src`];
            video.preload = 'auto';
            video.muted = true;
            video.playsInline = true;
        });
        let phase = '';
        let layer = '';
        let phaseAt = 0;
        let frame = 0;
        let width = 0;
        let height = 0;
        let ratio = 1;
        let fromForwardAt = 0;
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
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const glow = ctx.createRadialGradient(width * .37, height * .5, 16, width * .37, height * .5, width * .7);
            glow.addColorStop(0, '#3b1909');
            glow.addColorStop(.42, '#1b0b04');
            glow.addColorStop(1, '#000');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
        }

        function drawVideo(video) {
            backdrop();
            if (video.readyState < 2) return;
            if (videoSurface.width !== video.videoWidth || videoSurface.height !== video.videoHeight) {
                videoSurface.width = video.videoWidth;
                videoSurface.height = video.videoHeight;
            }
            videoContext.globalCompositeOperation = 'source-over';
            videoContext.clearRect(0, 0, videoSurface.width, videoSurface.height);
            videoContext.drawImage(video, 0, 0);
            videoContext.globalCompositeOperation = 'destination-in';
            const verticalMask = videoContext.createLinearGradient(0, 0, 0, videoSurface.height);
            verticalMask.addColorStop(0, 'rgba(0,0,0,0)');
            verticalMask.addColorStop(.12, 'rgba(0,0,0,1)');
            verticalMask.addColorStop(.76, 'rgba(0,0,0,1)');
            verticalMask.addColorStop(.88, 'rgba(0,0,0,0)');
            verticalMask.addColorStop(1, 'rgba(0,0,0,0)');
            videoContext.fillStyle = verticalMask;
            videoContext.fillRect(0, 0, videoSurface.width, videoSurface.height);
            const horizontalMask = videoContext.createLinearGradient(0, 0, videoSurface.width, 0);
            horizontalMask.addColorStop(0, 'rgba(0,0,0,0)');
            horizontalMask.addColorStop(.08, 'rgba(0,0,0,1)');
            horizontalMask.addColorStop(.92, 'rgba(0,0,0,1)');
            horizontalMask.addColorStop(1, 'rgba(0,0,0,0)');
            videoContext.fillStyle = horizontalMask;
            videoContext.fillRect(0, 0, videoSurface.width, videoSurface.height);
            videoContext.globalCompositeOperation = 'source-over';
            const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
            const w = video.videoWidth * scale;
            const h = video.videoHeight * scale;
            ctx.drawImage(videoSurface, (width - w) / 2, (height - h) / 2, w, h);
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
            const gap = ctx.createLinearGradient(0, bond, 0, bond - stretch);
            gap.addColorStop(0, 'rgba(122,53,166,.30)');
            gap.addColorStop(.42, 'rgba(150,65,193,.12)');
            gap.addColorStop(1, 'rgba(185,98,220,.20)');
            const fiber = ctx.createLinearGradient(0, bond, 0, bond - stretch);
            fiber.addColorStop(0, 'rgba(129,54,168,.9)');
            fiber.addColorStop(.55, 'rgba(203,124,234,.76)');
            fiber.addColorStop(1, 'rgba(145,64,178,.86)');
            ctx.save();
            ctx.globalAlpha = ease(pull / .22);
            ctx.fillStyle = gap;
            ctx.beginPath();
            for (let i = 0; i <= 42; i++) {
                const u = .05 + i / 42 * .58;
                const x = -layout.length / 2 + u * layout.length;
                const y = bond - stretch * peelProfile(u);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            for (let i = 42; i >= 0; i--) {
                const u = .05 + i / 42 * .58;
                ctx.lineTo(-layout.length / 2 + u * layout.length, bond);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = fiber;
            for (let i = 0; i < 88; i++) {
                const u = .065 + i / 88 * .53;
                const x = -layout.length / 2 + u * layout.length;
                const shift = (Math.sin(i * 2.73) * 17 + Math.sin(i * 6.29) * 9) * pull;
                const targetU = Math.max(.05, Math.min(.62, u + shift / layout.length));
                const reach = stretch * peelProfile(targetU);
                if (reach < 1) continue;
                ctx.globalAlpha = ease(pull / .2) * (.24 + (i % 7) * .085);
                ctx.lineWidth = .45 + (i % 9 === 0 ? .85 : (i % 4) * .11);
                ctx.beginPath();
                ctx.moveTo(x, bond + 1);
                ctx.bezierCurveTo(x - shift * .26, bond - reach * .29,
                    x + shift * 1.14, bond - reach * .71,
                    x + shift, bond - reach + 1);
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawRibbon(orientation = 0, separation = 0, tilt = 0, peel = 0) {
            backdrop();
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
                    for (let i = 0; i < count; i++) {
                        const u = (i + .5) / count;
                        const shift = layout.total * .56 * peel * peelProfile(u);
                        ctx.drawImage(strip, i * sourceWidth, band.top, sourceWidth, band.bottom - band.top,
                            -layout.length / 2 + i * pieceWidth, y - shift, pieceWidth + .45, bandHeight + .65);
                    }
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

        function play(video, start = 0) {
            video.pause();
            const begin = () => {
                video.currentTime = Math.min(start, Math.max(0, (video.duration || 6.6) - .05));
                video.play().catch(() => stop(true));
            };
            if (video.readyState >= 2) begin();
            else video.addEventListener('loadeddata', begin, { once: true });
        }

        function start(nextLayer) {
            if (!ctx || phase) return false;
            layer = nextLayer;
            setPhase('enter');
            play(videos.forward);
            return true;
        }

        function beginReverse(start = 0) {
            videos.forward.pause();
            setPhase('reverse');
            play(videos.reverse, start);
        }

        function exit() {
            if (!phase || ['reverse', 'fade-out', 'water-out', 'adhesion-release', 'effect-out'].includes(phase)) return;
            if (phase === 'enter') {
                const duration = videos.forward.duration || 6.6;
                beginReverse(Math.max(0, duration - videos.forward.currentTime));
            } else {
                if (layer === 'adhesive') {
                    adhesionExitPull = adhesionPull;
                    setPhase('adhesion-release');
                } else setPhase(layer === 'polymer' ? 'water-out' : 'effect-out');
            }
        }

        function stop(notify = false) {
            videos.forward.pause();
            videos.reverse.pause();
            canvas.style.opacity = '';
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
            if (phase === 'enter') {
                drawVideo(videos.forward);
                if (videos.forward.ended) setPhase('blend');
            } else if (phase === 'blend') {
                drawVideo(videos.forward);
                ctx.save();
                ctx.globalAlpha = ease(elapsed / 420);
                drawRibbon(0, 0);
                ctx.restore();
                if (elapsed >= 420) setPhase('effect-in');
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
            } else if (phase === 'reverse') {
                drawVideo(videos.reverse);
                if (videos.reverse.ended) setPhase('fade-out');
            } else if (phase === 'fade-out') {
                drawVideo(videos.reverse);
                canvas.style.opacity = String(1 - ease(elapsed / 260));
                if (elapsed >= 260) {
                    canvas.style.opacity = '';
                    stop(true);
                    return;
                }
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
