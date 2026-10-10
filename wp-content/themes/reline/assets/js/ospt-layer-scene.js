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
            verticalMask.addColorStop(.82, 'rgba(0,0,0,1)');
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

        function drawRibbon(orientation = 0, separation = 0) {
            backdrop();
            if (!available()) return null;
            const layout = ribbonLayout(orientation);
            ctx.save();
            ctx.translate(layout.x, layout.y);
            ctx.rotate(layout.angle);
            const start = -layout.total / 2;
            bands.forEach((band) => {
                const bandHeight = (band.bottom - band.top) * layout.scale;
                const y = start + (band.top - bands[0].top) * layout.scale;
                let offset = 0;
                if (layer === 'barrier' && band.name === 'polymer') offset = -height * .32 * ease(separation);
                if (layer === 'adhesive' && band.name === 'polymer') offset = -width * .25 * ease(separation);
                if (layer === 'adhesive' && band.name === 'barrier') offset = -width * .13 * ease(separation);
                ctx.drawImage(strip, 0, band.top, 1672, band.bottom - band.top,
                    -layout.length / 2, y + offset, layout.length, bandHeight + .7);
            });
            ctx.restore();
            return layout;
        }

        function droplet(x, y, w, h, opacity) {
            ctx.save();
            ctx.globalAlpha = opacity;
            const body = ctx.createRadialGradient(x - w * .23, y - h * .25, 1, x, y, w * .72);
            body.addColorStop(0, 'rgba(255,255,255,.75)');
            body.addColorStop(.26, 'rgba(215,227,231,.24)');
            body.addColorStop(.67, 'rgba(178,197,205,.09)');
            body.addColorStop(1, 'rgba(235,244,244,.45)');
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(243,249,248,.62)';
            ctx.lineWidth = 1.1;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.75)';
            ctx.beginPath();
            ctx.ellipse(x - w * .18, y - h * .2, Math.max(1.5, w * .12), Math.max(1, h * .13), -.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        function drawWater(now, layout, alpha) {
            if (!layout) return;
            const blackTop = height / 2 - layout.total / 2;
            const blackHeight = 85 * layout.scale;
            const cycle = (now / 6200) % 1;
            for (let i = 0; i < 24; i++) {
                const seed = (i * .618034) % 1;
                const age = (cycle - seed + 1) % 1;
                if (age > .88) continue;
                const originX = width * (.08 + .84 * ((i * .381966) % 1));
                const direction = i % 2 ? 1 : -1;
                const roll = ease((age - .34) / .5);
                const x = originX + direction * roll * width * (.28 + (i % 4) * .07);
                if (x < -30 || x > width + 30) continue;
                const landing = blackTop + blackHeight * (.28 + .3 * ((i * .27) % 1));
                const y = age < .16 ? landing - (1 - ease(age / .16)) * 55 : landing + roll * blackHeight * .55;
                const merge = ease((age - .18) / .25);
                const w = 5 + (i % 5) * 2 + merge * (12 + (i % 4) * 4);
                const h = Math.max(5, w * (.7 - .25 * roll));
                const opacity = alpha * ease(age / .1) * (1 - ease((age - .72) / .16));
                droplet(x, y, w, h, opacity);
            }
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

        function drawAdhesion(now, layout, alpha) {
            if (!layout) return;
            const pulse = .5 + .5 * Math.sin(now / 330);
            const violetEdge = layout.x - (-layout.total / 2 + (85 + 38) * layout.scale);
            const pinkEdge = violetEdge + width * .13;
            ctx.save();
            ctx.globalAlpha = alpha;
            for (let i = -5; i <= 5; i++) {
                const y = layout.y + i * layout.length / 12;
                ctx.strokeStyle = `rgba(225,174,244,${.32 + .35 * pulse})`;
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.moveTo(violetEdge - 2, y);
                ctx.bezierCurveTo(violetEdge + 25 + 5 * pulse, y - 8, pinkEdge - 24, y + 8, pinkEdge + 2, y);
                ctx.stroke();
            }
            ctx.fillStyle = '#eed5fa';
            ctx.font = '600 12px Arial, sans-serif';
            ctx.fillText('СЦЕПЛЕНИЕ СОХРАНЯЕТСЯ', pinkEdge + 12, layout.y - layout.length * .36);
            ctx.strokeStyle = '#d6a6ed';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pinkEdge + 10, layout.y - 35);
            ctx.lineTo(pinkEdge + 80 + 16 * pulse, layout.y - 35);
            ctx.moveTo(pinkEdge + 80 + 16 * pulse, layout.y - 35);
            ctx.lineTo(pinkEdge + 69 + 16 * pulse, layout.y - 42);
            ctx.moveTo(pinkEdge + 80 + 16 * pulse, layout.y - 35);
            ctx.lineTo(pinkEdge + 69 + 16 * pulse, layout.y - 28);
            ctx.stroke();
            ctx.restore();
        }

        function drawEffect(now, progress = 1, alpha = 1) {
            const orientation = layer === 'adhesive' ? progress : 0;
            const separation = layer === 'polymer' ? 0 : progress;
            const layout = drawRibbon(orientation, separation);
            if (layer === 'polymer') drawWater(now, layout, alpha);
            else if (layer === 'barrier') drawBarrier(now, layout, alpha * progress);
            else drawAdhesion(now, layout, alpha * progress);
        }

        function setPhase(next) {
            phase = next;
            phaseAt = performance.now();
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
            if (!phase || phase === 'reverse' || phase === 'fade-out') return;
            if (phase === 'enter') {
                const duration = videos.forward.duration || 6.6;
                beginReverse(Math.max(0, duration - videos.forward.currentTime));
            } else {
                setPhase('effect-out');
            }
        }

        function stop(notify = false) {
            videos.forward.pause();
            videos.reverse.pause();
            canvas.style.opacity = '';
            phase = '';
            layer = '';
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
            } else if (phase === 'effect-out') {
                const progress = 1 - ease(elapsed / 650);
                drawEffect(now, progress, Math.min(1, progress * 2));
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
            if (layer === 'adhesive') return x > rect.width * .15 && x < rect.width * .56;
            return Math.abs(y - rect.height / 2) < Math.min(180, rect.width * .17);
        }

        return { start, exit, reset: () => stop(false), hitTest, get phase() { return phase; } };
    };
}());
