document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.ospt-compare');
    if (!section) return;

    const sticky = section.querySelector('.ospt-compare__sticky');
    const visual = section.querySelector('.ospt-compare__visual');
    const model = section.querySelector('.ospt-compare__model');
    const groundCopy = section.querySelector('.ospt-compare__ground-copy');
    const finalCopy = section.querySelector('.ospt-compare__final-copy');
    const layersCopy = section.querySelector('.ospt-compare__layers-copy');
    const cutaway = section.querySelector('.ospt-compare__cutaway');
    const barrierWindow = section.querySelector('.ospt-compare__barrier-window');
    const adhesiveWindow = section.querySelector('.ospt-compare__adhesive-window');
    const layerAxis = section.querySelector('.ospt-compare__layer-axis');
    const sceneCanvas = section.querySelector('.ospt-compare__layer-scene');
    const soilLabels = section.querySelector('.ospt-compare__soil-labels');
    const mobileModel = section.querySelector('.ospt-compare__mobile-final-visual');
    const layerTriggers = section.querySelectorAll('[data-layer-target]');
    const layerList = section.querySelector('.ospt-compare__layers-list');
    const layerDetail = section.querySelector('.ospt-compare__layer-detail');
    const detailTitle = section.querySelector('.ospt-compare__detail-title');
    const detailText = section.querySelector('.ospt-compare__detail-text');
    const detailBack = section.querySelector('.ospt-compare__detail-back');
    const layerDescriptions = {
        polymer: ['Полимерное покрытие', 'Защищает от механических повреждений и внешней среды. Капли воды скатываются с поверхности, не проникая внутрь.'],
        barrier: ['Барьерный слой', 'Не пропускает агрессивные молекулы к адгезионному слою и металлу.'],
        adhesive: ['Адгезионный слой', 'Прочно связывает металл с верхними слоями. Сцепление сохраняется в воде, химической среде и при абразивном воздействии.']
    };
    const linearQuery = window.matchMedia('(max-width: 900px), (prefers-reduced-motion: reduce)');
    const clamp = (value) => Math.min(1, Math.max(0, value));
    const smooth = (start, end, value) => {
        const t = clamp((value - start) / (end - start));
        return t * t * (3 - 2 * t);
    };
    let frame = 0;
    let selectedLayer = '';
    let previewLayer = '';
    let returnFocus = null;
    let pendingFocusEvent = null;
    const scene = window.RelineOsptLayerScene({
        section, canvas: sceneCanvas,
        onFinished: () => completeLayerExit()
    });
    const activeAnimation = () => scene.phase ? scene : null;

    function completeLayerExit() {
        scene.reset();
        selectedLayer = '';
        previewLayer = '';
        syncLayerInteraction();
        if (pendingFocusEvent?.detail === 0 && returnFocus && !returnFocus.closest('[aria-hidden="true"]')) {
            returnFocus.focus({ preventScroll: true });
        }
        pendingFocusEvent = null;
    }

    function finishLayerExit(event, immediate = false) {
        pendingFocusEvent = event || null;
        if (immediate || section.classList.contains('is-linear')) {
            completeLayerExit();
            return;
        }
        const animation = activeAnimation();
        if (animation) {
            animation.exit();
            return;
        }
        completeLayerExit();
    }

    function layerAtPointer(event) {
        if (activeAnimation()) return '';
        if (section.classList.contains('is-sequenced') && section.dataset.activeScreen !== 'layers') return '';
        const matrix = layerAxis.getScreenCTM();
        if (!matrix) return '';
        const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        if (Math.abs(y) > 52) return '';

        const extended = previewLayer || selectedLayer;
        if (extended === 'polymer' && x >= -270 && x <= 260) return 'polymer';
        if (extended === 'barrier' && x >= 0 && x <= 260) return 'barrier';
        if (extended === 'adhesive' && x >= 135 && x <= 326) return 'adhesive';
        if (x >= -270 && x < 0) return 'polymer';
        if (x >= 0 && x < 135) return 'barrier';
        if (x >= 135 && x <= 260) return 'adhesive';
        return '';
    }

    function syncLayerInteraction() {
        const active = activeAnimation() ? '' : previewLayer || selectedLayer;
        if (active) section.dataset.activeLayer = active;
        else delete section.dataset.activeLayer;
        if (selectedLayer) section.dataset.selectedLayer = selectedLayer;
        else delete section.dataset.selectedLayer;

        layerTriggers.forEach((trigger) => {
            if (trigger.tagName === 'BUTTON') {
                trigger.setAttribute('aria-pressed', String(trigger.dataset.layerTarget === selectedLayer));
            }
        });
        if (selectedLayer) {
            [detailTitle.textContent, detailText.textContent] = layerDescriptions[selectedLayer];
        }
        layerList.inert = Boolean(selectedLayer);
        layerList.setAttribute('aria-hidden', String(Boolean(selectedLayer)));
        layerDetail.inert = !selectedLayer;
        layerDetail.setAttribute('aria-hidden', String(!selectedLayer));
    }

    function clearLayer(event) {
        finishLayerExit(event);
    }

    function selectLayer(layer, trigger, keyboard) {
        if (activeAnimation()) return;
        selectedLayer = layer;
        previewLayer = '';
        returnFocus = trigger?.tagName === 'BUTTON' ? trigger : section.querySelector(`.ospt-compare__layer-choice[data-layer-target="${layer}"]`);
        if (!section.classList.contains('is-linear')) scene.start(layer);
        syncLayerInteraction();
        if (keyboard) detailBack.focus({ preventScroll: true });
    }

    layerTriggers.forEach((trigger) => {
        trigger.addEventListener('pointerenter', () => {
            if (section.classList.contains('is-sequenced') && section.dataset.activeScreen !== 'layers') return;
            if (activeAnimation()) return;
            previewLayer = trigger.dataset.layerTarget;
            syncLayerInteraction();
        });
        trigger.addEventListener('pointerleave', () => {
            if (previewLayer === trigger.dataset.layerTarget) {
                previewLayer = '';
                syncLayerInteraction();
            }
        });
        if (trigger.tagName === 'BUTTON') {
            trigger.addEventListener('focus', () => {
                if (activeAnimation()) return;
                previewLayer = trigger.dataset.layerTarget;
                syncLayerInteraction();
            });
            trigger.addEventListener('blur', () => {
                if (previewLayer === trigger.dataset.layerTarget) {
                    previewLayer = '';
                    syncLayerInteraction();
                }
            });
        }
        trigger.addEventListener('click', (event) => {
            if (section.classList.contains('is-sequenced') && section.dataset.activeScreen !== 'layers') return;
            event.stopPropagation();
            selectLayer(trigger.dataset.layerTarget, trigger, event.detail === 0);
        });
    });

    model.addEventListener('pointermove', (event) => {
        if (activeAnimation()) return;
        const next = layerAtPointer(event);
        model.classList.toggle('is-layer-hot', Boolean(next));
        if (next === previewLayer) return;
        previewLayer = next;
        syncLayerInteraction();
    });
    model.addEventListener('pointerleave', () => {
        model.classList.remove('is-layer-hot');
        if (!previewLayer) return;
        previewLayer = '';
        syncLayerInteraction();
    });
    model.addEventListener('click', (event) => {
        if (section.classList.contains('is-sequenced') && section.dataset.activeScreen !== 'layers') return;
        const animation = activeAnimation();
        if (scene.phase === 'enter' || scene.phase === 'reverse') {
            event.stopPropagation();
            return;
        }
        if (animation) {
            if (animation.hitTest(event)) event.stopPropagation();
            return;
        }
        event.stopPropagation();
        const layer = layerAtPointer(event);
        if (layer) selectLayer(layer, null, false);
        else if (selectedLayer) clearLayer(event);
    });

    detailBack.addEventListener('click', (event) => {
        event.stopPropagation();
        clearLayer(event);
    });
    sticky.addEventListener('click', (event) => {
        if (!selectedLayer || event.target.closest('a, [data-layer-target]')) return;
        if (activeAnimation()?.hitTest(event)) return;
        clearLayer(event);
    });
    syncLayerInteraction();

    function render() {
        frame = 0;
        if (!section.classList.contains('is-sequenced')) return;

        const travel = Math.max(1, section.offsetHeight - sticky.offsetHeight);
        const sequenceProgress = clamp(-section.getBoundingClientRect().top / travel);
        const progress = clamp(sequenceProgress / .52);
        const zoom = smooth(.05, .52, progress);
        const turn = smooth(.42, .91, progress);
        const settle = smooth(.7, 1, progress);
        const groundOpacity = 1 - smooth(.42, .62, progress);
        const layersTurn = smooth(.58, .76, sequenceProgress);
        const barrierReveal = smooth(.77, .85, sequenceProgress);
        const adhesiveReveal = smooth(.86, .94, sequenceProgress);
        const layersOpacity = smooth(.80, .91, sequenceProgress);
        const finalOpacity = smooth(.54, .76, progress) * (1 - smooth(.74, .83, sequenceProgress));
        const bare = section.dataset.state === 'bare';
        const finalAngle = bare ? 60 : 0;
        const middleAngle = 32 * (1 - turn) + finalAngle * turn;
        const angle = middleAngle * (1 - layersTurn) - 55 * layersTurn;

        const dissolve = smooth(.18, .85, progress);
        section.style.setProperty('--scene-opacity', (1 - dissolve).toFixed(3));
        section.style.setProperty('--labels-opacity', ((1 - dissolve) ** 2).toFixed(3));
        section.style.setProperty('--scene-blur', `${(22 * dissolve).toFixed(1)}px`);
        section.style.setProperty('--scene-brightness', (1 - .5 * dissolve).toFixed(3));
        section.style.setProperty('--scene-scale', (1 + .17 * zoom).toFixed(3));
        section.style.setProperty('--ground-opacity', groundOpacity.toFixed(3));
        section.style.setProperty('--final-opacity', finalOpacity.toFixed(3));
        section.style.setProperty('--layers-opacity', layersOpacity.toFixed(3));
        section.style.setProperty('--layers-y', `${(24 * (1 - layersOpacity)).toFixed(1)}px`);
        section.style.setProperty('--layers-art-opacity', smooth(.62, .72, sequenceProgress).toFixed(3));
        section.style.setProperty('--backglow-opacity', (.15 * smooth(.58, .91, sequenceProgress)).toFixed(3));
        section.style.setProperty('--backglow-scale', (.75 + .85 * layersTurn).toFixed(3));
        section.style.setProperty('--glow-scale', (1.12 + .58 * layersTurn).toFixed(3));
        section.style.setProperty('--callout-opacity', smooth(.86, .96, sequenceProgress).toFixed(3));
        barrierWindow.setAttribute('width', (135 * barrierReveal).toFixed(1));
        adhesiveWindow.setAttribute('width', (125 * adhesiveReveal).toFixed(1));
        section.style.setProperty('--ground-y', `${(-20 * (1 - groundOpacity)).toFixed(1)}px`);
        section.style.setProperty('--final-y', `${(24 * (1 - finalOpacity)).toFixed(1)}px`);
        section.style.setProperty('--pile-x', `${(70 * (1 - turn) + 150 * layersTurn).toFixed(1)}px`);
        section.style.setProperty('--pile-y', `${((172 - 70 * zoom) * (1 - turn) - (bare ? 25 * turn : 0) + 50 * layersTurn).toFixed(1)}px`);
        section.style.setProperty('--pile-angle', `${angle.toFixed(2)}deg`);
        section.style.setProperty('--pile-scale', ((.62 + .41 * zoom - .03 * settle) * (bare ? 1 - .16 * turn : 1) * (1 + .75 * layersTurn)).toFixed(3));
        section.style.setProperty('--glow-opacity', smooth(.62, .95, progress).toFixed(3));

        const activeScreen = sequenceProgress >= .88 ? 'layers' : progress >= .72 ? 'middle' : 'ground';
        if (activeScreen !== 'layers' && activeAnimation()) finishLayerExit(undefined, true);
        section.dataset.activeScreen = activeScreen;
        section.dataset.layersTransition = String(sequenceProgress >= .58);
        section.dataset.sequenceComplete = String(activeScreen === 'middle' && progress >= .8);
        groundCopy.setAttribute('aria-hidden', String(activeScreen !== 'ground'));
        finalCopy.setAttribute('aria-hidden', String(activeScreen !== 'middle'));
        layersCopy.setAttribute('aria-hidden', String(activeScreen !== 'layers'));
        cutaway.setAttribute('aria-hidden', String(activeScreen !== 'layers'));
        cutaway.inert = activeScreen !== 'layers';
        model.setAttribute('aria-hidden', String(Boolean(scene.phase)));
        groundCopy.inert = activeScreen !== 'ground';
        finalCopy.inert = activeScreen !== 'middle';
        layersCopy.inert = activeScreen !== 'layers';
        soilLabels.setAttribute('aria-hidden', String(progress > .75));
        section.setAttribute('aria-labelledby', activeScreen === 'layers' ? 'ospt-layers-title' : activeScreen === 'middle' ? 'ospt-compare-title' : 'ospt-ground-title');
        model.setAttribute('aria-label', activeScreen === 'layers'
            ? 'Та же металлическая свая с чёрной оболочкой повёрнута горизонтально: открыты барьерный, адгезионный и стальной слои'
            : activeScreen !== 'ground'
            ? (section.dataset.state === 'bare'
                ? 'Удлинённая металлическая свая без оболочки на чёрном фоне'
                : 'Укороченная металлическая свая с оболочкой ОСПТ «Релайн» на чёрном фоне')
            : 'Металлическая свая с оболочкой ОСПТ «Релайн» в двух слоях грунта под модульным зданием');
    }

    function schedule() {
        if (!frame) frame = window.requestAnimationFrame(render);
    }

    function configure() {
        const linear = linearQuery.matches;
        section.classList.toggle('is-linear', linear);
        section.classList.toggle('is-sequenced', !linear);
        if (linear) {
            if (activeAnimation()) finishLayerExit(undefined, true);
            mobileModel.setAttribute('aria-hidden', 'false');
            section.dataset.sequenceComplete = 'true';
            groundCopy.inert = false;
            finalCopy.inert = false;
            layersCopy.inert = false;
            groundCopy.setAttribute('aria-hidden', 'false');
            finalCopy.setAttribute('aria-hidden', 'false');
            layersCopy.setAttribute('aria-hidden', 'false');
            cutaway.setAttribute('aria-hidden', 'true');
            cutaway.inert = true;
            model.setAttribute('aria-hidden', 'false');
            soilLabels.setAttribute('aria-hidden', 'false');
            section.setAttribute('aria-labelledby', 'ospt-ground-title ospt-compare-title ospt-layers-title');
            model.setAttribute('aria-label', 'Металлическая свая с оболочкой ОСПТ «Релайн» в двух слоях грунта под модульным зданием');
        } else {
            mobileModel.setAttribute('aria-hidden', 'true');
            schedule();
        }
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    linearQuery.addEventListener('change', configure);
    new MutationObserver(schedule).observe(section, { attributes: true, attributeFilter: ['data-state'] });
    configure();
});
