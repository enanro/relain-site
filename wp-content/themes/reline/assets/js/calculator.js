document.addEventListener('DOMContentLoaded', () => {
    // === Данные ===
    const COATING_TEMP_KEYS = ["-1", "-2", "-6"];

    const osptSoilGamma = [
        { name: "Пески мелкие 0,6 < Sr < 0,8", g: { "-1": 0.58, "-2": 0.60, "-6": 0.62 } },
        { name: "Пески мелкие 0,8 < Sr < 0,95", g: { "-1": 0.44, "-2": 0.49, "-6": 0.53 } },
        { name: "Пески мелкие Sr > 0,95", g: { "-1": 0.50, "-2": 0.49, "-6": 0.42 } },
        { name: "Пески пылеватые 0,6 < Sr < 0,8", g: { "-1": 0.35, "-2": 0.39, "-6": 0.46 } },
        { name: "Пески пылеватые 0,8 < Sr < 0,95", g: { "-1": 0.32, "-2": 0.37, "-6": 0.42 } },
        { name: "Супесь IL < 0,25", g: { "-1": 0.54, "-2": 0.50, "-6": 0.42 } },
        { name: "Супесь 0,25 < IL < 0,5", g: { "-1": 0.64, "-2": 0.59, "-6": 0.52 } },
        { name: "Супесь IL > 0,5", g: { "-1": 0.62, "-2": 0.60, "-6": 0.58 } },
        { name: "Суглинок IL < 0,25", g: { "-1": 0.45, "-2": 0.46, "-6": 0.55 } },
        { name: "Суглинок 0,25 < IL < 0,5", g: { "-1": 0.43, "-2": 0.45, "-6": 0.46 } },
        { name: "Глина IL < 0,25", g: { "-1": 0.55, "-2": 0.58, "-6": 0.60 } },
        { name: "Глина 0,25 < IL < 0,5", g: { "-1": 0.62, "-2": 0.62, "-6": 0.56 } },
        { name: "Глина IL > 0,5", g: { "-1": 0.58, "-2": 0.58, "-6": 0.56 } },
        { name: "Торф среднеразложившийся 0,6 < Sr < 0,8", g: { "-1": 0.67, "-2": 0.67, "-6": 0.67 } },
        { name: "Торф среднеразложившийся 0,8 < Sr < 0,95", g: { "-1": 0.68, "-2": 0.68, "-6": 0.76 } },
        { name: "Торф среднеразложившийся Sr > 0,95", g: { "-1": 0.73, "-2": 0.73, "-6": 0.77 } },
        { name: "Торф слаборазложившийся 0,6 < Sr < 0,8", g: { "-1": 0.70, "-2": 0.63, "-6": 0.51 } },
        { name: "Торф слаборазложившийся 0,8 < Sr < 0,95", g: { "-1": 0.63, "-2": 0.63, "-6": 0.55 } },
        { name: "Торф слаборазложившийся Sr > 0,95", g: { "-1": 0.67, "-2": 0.68, "-6": 0.65 } }
    ];

    const psppSoilGamma = [
        { name: "Песок пылеватый", g: { "-1": 0.37, "-2": 0.52, "-6": 0.61 } },
        { name: "Суглинок легкий", g: { "-1": 0.46, "-2": 0.46, "-6": 0.44 } },
        { name: "Цементно-песчаный раствор", g: { "-1": 0.45, "-2": 0.48, "-6": 0.50 } }
    ];

    const tauVariants = {
        sp_high: { label: "Сильнопучинистые грунты", points: [[1.5, 110], [2.5, 90], [3.0, 70]] },
        sp_mid: { label: "Среднепучинистые грунты", points: [[1.5, 90], [2.5, 70], [3.0, 55]] },
        sp_low: { label: "Слабопучинистые грунты", points: [[1.5, 70], [2.5, 55], [3.0, 40]] }
    };

    const pileTypeK = {
        metal: { label: "Стальная / металлическая без специальной обработки", k: 0.80 },
        concrete_smooth: { label: "Бетонная гладкая необработанная", k: 1.00 },
        concrete_rough_5_low: { label: "Бетонная шероховатая до 5 мм, нижняя граница", k: 1.10 },
        concrete_rough_5_high: { label: "Бетонная шероховатая до 5 мм, верхняя граница", k: 1.20 },
        concrete_rough_20_low: { label: "Бетонная шероховатая до 20 мм, нижняя граница", k: 1.25 },
        concrete_rough_20_high: { label: "Бетонная шероховатая до 20 мм, верхняя граница", k: 1.50 },
        wood: { label: "Деревянная антисептированная", k: 0.90 },
        custom: { label: "Пользовательский", k: null }
    };

    const pipeWalls = {
        159: [5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12, 13, 14, 15],
        219: [5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12, 13, 14, 15],
        273: [6.5, 7, 7.5, 8, 9, 10, 11, 12, 13, 14, 15],
        325: [7.5, 8, 9, 10, 11, 12, 13, 14, 15],
        377: [9, 10, 11, 12, 13, 14, 15],
        426: [9, 10, 11, 12, 13, 14, 15],
        530: [9, 10, 11, 12, 13, 14, 15],
        630: [10, 11, 12, 13, 14],
        720: [10, 11, 12, 13, 14],
        820: [10, 11, 12, 13, 14]
    };

    const steelDiameters = [159, 219, 273, 325, 377, 426, 530, 630, 720, 820, "custom"];
    const timberDiameters = [160, 180, 200, 220, 240, 260, 280, 300, "custom"];

    const concreteSections = [
        { label: "150 × 150", b: 150, h: 150 },
        { label: "200 × 200", b: 200, h: 200 },
        { label: "250 × 250", b: 250, h: 250 },
        { label: "300 × 300", b: 300, h: 300 },
        { label: "350 × 350", b: 350, h: 350 },
        { label: "400 × 400", b: 400, h: 400 },
        { label: "Своё значение", custom: true }
    ];

    const fiTableRows = [
        [1, 35, 23, 15, 12, 8, 4, 4, 3, 2],
        [2, 42, 30, 21, 17, 12, 7, 5, 4, 4],
        [3, 48, 35, 25, 20, 14, 8, 7, 6, 5],
        [4, 53, 38, 27, 22, 16, 9, 8, 7, 5],
        [5, 56, 40, 29, 24, 17, 10, 8, 7, 6],
        [6, 58, 42, 31, 25, 18, 10, 8, 7, 6],
        [8, 62, 44, 33, 26, 19, 10, 8, 7, 6],
        [10, 65, 46, 34, 27, 19, 10, 8, 7, 6],
        [15, 72, 51, 38, 28, 20, 11, 8, 7, 6],
        [20, 79, 56, 41, 30, 20, 12, 8, 7, 6],
        [25, 86, 61, 44, 32, 20, 12, 8, 7, 6],
        [30, 93, 66, 47, 34, 21, 12, 9, 8, 7],
        [35, 100, 70, 50, 36, 22, 13, 9, 8, 7],
        [40, 107, 74, 53, 38, 23, 14, 9, 8, 7]
    ];

    let layers = [{ from: 2.5, to: 8.0, fi: 12 }];
    let pileWeightEdited = false;
    let lastGeometryKey = "";

    function el(id) { return document.getElementById(id); }
    function val(id) { return el(id).value; }
    function num(id) { return parseFloat(el(id).value || "0"); }
    function fmt(n, d = 1) { return isFinite(n) ? Number(n).toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—"; }
    function inputFmt(n, d = 1) { return isFinite(n) ? Number(n).toFixed(d).replace(/\.?0+$/, "") : ""; }

    function interpolate(points, x) {
        if (x <= points[0][0]) return points[0][1];
        if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
        for (let i = 0; i < points.length - 1; i++) {
            const [x1, y1] = points[i], [x2, y2] = points[i + 1];
            if (x >= x1 && x <= x2) return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
        }
        return points[points.length - 1][1];
    }

    function isConcretePile() { return val("pileType").startsWith("concrete_"); }
    function isSteelPile() { return val("pileType") === "metal"; }
    function isCustomPile() { return val("pileType") === "custom"; }
    function coatingName() { return isConcretePile() ? "ПСПП (жидкое покрытие)" : "ОСПТ"; }
    function currentSoilList() { return isConcretePile() ? psppSoilGamma : osptSoilGamma; }
    function soil() { return currentSoilList()[parseInt(val("soilType"), 10)] || currentSoilList()[0]; }

    function internalRelineEffect() {
        const g = soil().g;
        const values = COATING_TEMP_KEYS.map(k => Number(g[k])).filter(v => isFinite(v));
        if (values.length === 0) return 1;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    function tauCalc() {
        if (val("tauSource") === "custom") return num("tauValue");
        return interpolate(tauVariants[val("tauSource")].points, num("freezeDepth"));
    }

    function kSurface() { return num("surfaceK"); }

    function selectedDiameterMm() {
        if (isConcretePile()) return 0;
        if (isCustomPile()) return num("customDiameter") || 0;
        return val("diameter") === "custom" ? num("customDiameter") : num("diameter");
    }

    function selectedWallMm() {
        if (isCustomPile()) return num("customWall") || 0;
        return val("wall") === "custom" ? num("customWall") : num("wall");
    }

    function concreteSection() {
        if (val("concreteSection") === "custom") {
            return { b: num("customConcreteB"), h: num("customConcreteH"), custom: true };
        }
        return concreteSections[parseInt(val("concreteSection") || "0", 10)] || concreteSections[0];
    }

    function Dm() { return selectedDiameterMm() / 1000; }

    function perimeter() {
        if (isConcretePile()) {
            const s = concreteSection();
            return 2 * (s.b + s.h) / 1000;
        }
        return Math.PI * Dm();
    }

    function Afh() { return perimeter() * num("freezeDepth"); }
    function heaveNoReline() { return tauCalc() * kSurface() * Afh(); }
    function heaveReline() { return heaveNoReline() * internalRelineEffect(); }

    function pipeWeightKgM() {
        const D = selectedDiameterMm(), t = selectedWallMm();
        if (D <= 0 || t <= 0 || D - 2 * t <= 0) return 0;
        return Math.PI / 4 * (D * D - (D - 2 * t) * (D - 2 * t)) * 7850 / 1000000;
    }

    function concreteWeightKgM() {
        const s = concreteSection();
        return (s.b / 1000) * (s.h / 1000) * 2500;
    }

    function autoPileWeightKNM() {
        if (isSteelPile()) return pipeWeightKgM() * 9.80665 / 1000;
        if (isConcretePile()) return concreteWeightKgM() * 9.80665 / 1000;
        return 0;
    }

    function pileWeightInputHasValue() { return String(val("pileWeightM")).trim() !== ""; }

    function pileWeightSource() {
        if (pileWeightInputHasValue()) return pileWeightEdited ? "введено пользователем" : "расчетное значение";
        if (isSteelPile() || isConcretePile()) return "расчетное значение";
        return "не задан";
    }

    function pipeWeightKNM() {
        if (isSteelPile() || isConcretePile()) {
            return pileWeightInputHasValue() ? Math.max(0, num("pileWeightM")) : autoPileWeightKNM();
        }
        if (isCustomPile()) return pileWeightInputHasValue() ? Math.max(0, num("pileWeightM")) : 0;
        return 0;
    }

    function equivalentFi() {
        let sumFiH = 0, sumH = 0;
        for (const layer of layers) {
            const h = Math.max(0, Number(layer.to) - Number(layer.from));
            const fi = Math.max(0, Number(layer.fi));
            if (h > 0) {
                sumFiH += fi * h;
                sumH += h;
            }
        }
        return sumH > 0 ? sumFiH / sumH : 0;
    }

    function sideHoldingPerMeter() { return perimeter() * equivalentFi(); }
    function holdingChangePerMeter() { return pipeWeightKNM() + sideHoldingPerMeter(); }

    function effectiveHoldingG() { return num("baseHoldingG") + num("structureLoadF"); }
    function tailHeight() { return Math.max(0, num("tailHeight")); }
    function baseLengthInGround() { return Math.max(0, num("baseLength") - tailHeight()); }
    function totalLengthFromGroundLength(groundLength) { return groundLength + tailHeight(); }

    function groundLengthForForce(force) {
        const q = pipeWeightKNM();
        const a = sideHoldingPerMeter();
        const L0g = baseLengthInGround();
        const G = effectiveHoldingG();
        const denom = a + q;
        if (denom <= 0) return Infinity;
        return (force - G + q * L0g + a * L0g) / denom;
    }

    function groundLengthNoReline() { return groundLengthForForce(heaveNoReline()); }
    function rawGroundLengthReline() { return groundLengthForForce(heaveReline()); }
    function minGroundRelineLength() { return num("freezeDepth") + 0.4; }

    function groundLengthReline() {
        const raw = rawGroundLengthReline();
        return raw < num("freezeDepth") ? minGroundRelineLength() : raw;
    }

    function lengthNoReline() { return totalLengthFromGroundLength(groundLengthNoReline()); }
    function rawLengthReline() { return totalLengthFromGroundLength(rawGroundLengthReline()); }
    function minRelineLength() { return totalLengthFromGroundLength(minGroundRelineLength()); }
    function lengthReline() { return totalLengthFromGroundLength(groundLengthReline()); }
    function lengthReductionM() { return Math.max(0, lengthNoReline() - lengthReline()); }
    function lengthReductionPct() { return lengthNoReline() > 0 ? lengthReductionM() / lengthNoReline() * 100 : 0; }

    function hasFatalError() { return baseLengthInGround() < num("freezeDepth"); }
    function noCoatingLengthBelowDth() { return !hasFatalError() && groundLengthNoReline() < num("freezeDepth"); }

    function isExtremeLoad() {
        const extreme = effectiveHoldingG() >= 320000 || pipeWeightKNM() * baseLengthInGround() >= 320000;
        return extreme;
    }

    function extremeLoadMessage() {
        return `Вы ввели нагрузку, с которой свая уже не борется с морозным пучением. Она, скорее, претендует на место в инженерной истории.<br><br>
Для ориентира: на мосту Stan Musial Veterans Memorial Bridge в США испытывали сваю диаметром 3,5 м и глубиной 36,3 м. На неё дали 320 МН — примерно 32 631 тс.<br><br>
Вы уверены, что хотите побить этот рекорд?<br><br>
Если да, то с морозным пучением всё спокойно: при такой нагрузке оно уже не главный герой. Но значение лучше проверить. Возможно, вы указали нагрузку не на одну сваю, а на весь фундамент.`;
    }

    function render(skipLayers = false) {
        syncTauField();
        updateWeightField();
        if (!skipLayers) renderLayers();
        const error = hasFatalError();

        if (error) {
            el("mainStatus").className = "calculator-status calculator-status--bad";
            el("mainStatus").innerHTML = `<h3>Невозможно сформировать результат</h3><p>Исходная длина сваи в грунте меньше глубины сезонного промерзания-оттаивания. Проверьте L0, высоту хвостовика и dth.</p>`;
            el("priceBtn").style.display = "none";
        } else if (noCoatingLengthBelowDth()) {
            el("mainStatus").className = "calculator-status calculator-status--bad";
            el("mainStatus").innerHTML = `<h3>Проверьте исходные данные</h3><p>Расчетная длина сваи без покрытия получилась меньше глубины сезонного промерзания-оттаивания dth. Проверьте G, F, fi, dth, τfh, тип сваи и геометрию.</p>`;
            el("priceBtn").style.display = "none";
        } else {
            const no = lengthNoReline(), rel = lengthReline();
            el("mainStatus").className = `calculator-status ${isExtremeLoad() ? "calculator-status--warn" : "calculator-status--good"}`;
            const resultText = `С ${coatingName()} «Релайн» итоговая длина сваи — <strong>${fmt(rel)} м</strong>. Без покрытия — <strong>${fmt(no)} м</strong>. В расчет добавлена высота хвостовика <strong>${fmt(tailHeight())} м</strong>. Предварительное сокращение длины — <strong>${fmt(lengthReductionM())} м</strong> (<strong>${fmt(lengthReductionPct())}%</strong>). Требуется проверка по несущей способности.`;
            if (isExtremeLoad()) {
                el("mainStatus").innerHTML = `<h3>Проверьте нагрузку</h3><p>${extremeLoadMessage()}</p>`;
            } else {
                el("mainStatus").innerHTML = `<p>${resultText}</p>`;
            }
            el("priceBtn").style.display = "inline-block";
        }

        const badgeItems = [
            `<span class="calculator-pill">τfh = ${fmt(tauCalc())} кПа</span>`,
            `<span class="calculator-pill">${coatingName()} «Релайн»</span>`,
            pipeWeightKNM() > 0 ? `<span class="calculator-pill">q = ${fmt(pipeWeightKNM())} кН/м</span>` : "",
            error ? `<span class="calculator-pill">L0 &lt; dth</span>` : `<span class="calculator-pill">L0 ≥ dth</span>`,
            !error && isExtremeLoad() ? `<span class="calculator-pill">Рекордная нагрузка</span>` : "",
        ].filter(Boolean);
        el("badges").innerHTML = badgeItems.join("");

        if (error) {
            el("lengthTable").innerHTML = `<tr><th>Показатель</th><th>Значение</th></tr><tr><td>Статус</td><td>Расчет остановлен. Сначала исправьте L0 или dth.</td></tr>`;
            el("compareTable").innerHTML = `<tr><th>Показатель</th><th>Без покрытия</th><th>С покрытием «Релайн»</th></tr><tr><td>Результат</td><td>—</td><td>—</td></tr>`;
            el("calcTable").innerHTML = `<tr><th>Показатель</th><th>Значение</th></tr><tr><td>Ошибка</td><td>L0 в грунте меньше dth</td></tr>`;
        } else if (noCoatingLengthBelowDth()) {
            el("lengthTable").innerHTML = `<tr><th>Показатель</th><th>Значение</th></tr><tr><td>Статус</td><td>Проверьте исходные данные</td></tr>`;
            el("compareTable").innerHTML = `<tr><th>Показатель</th><th>Без покрытия</th><th>С покрытием «Релайн»</th></tr><tr><td>Результат</td><td colspan="2">Проверьте исходные данные</td></tr>`;
            el("calcTable").innerHTML = `<tr><th>Показатель</th><th>Значение</th></tr><tr><td>Ошибка</td><td>Расчетная длина без покрытия меньше dth</td></tr>`;
        } else {
            el("lengthTable").innerHTML = `
                <tr><th>Показатель</th><th>Значение</th></tr>
                <tr><td>Исходная полная длина L0</td><td>${fmt(num("baseLength"))} м</td></tr>
                <tr><td>Высота хвостовика над землей</td><td>${fmt(tailHeight())} м</td></tr>
                <tr><td>Исходная длина в грунте</td><td>${fmt(baseLengthInGround())} м</td></tr>
                <tr><td>Итоговая длина без покрытия</td><td>${fmt(lengthNoReline())} м</td></tr>
                <tr><td>Итоговая длина с ${coatingName()} «Релайн»</td><td>${fmt(lengthReline())} м</td></tr>
                <tr><td>Предварительное сокращение длины</td><td><strong>${fmt(lengthReductionM())} м или ${fmt(lengthReductionPct())}%</strong></td></tr>
                <tr><td>Проверка по несущей способности</td><td>Требуется отдельно</td></tr>
            `;
            el("compareTable").innerHTML = `
                <tr><th>Показатель</th><th>Без покрытия</th><th>С ${coatingName()} «Релайн»</th></tr>
                <tr><td>Расчетная длина сваи в грунте</td><td>${fmt(groundLengthNoReline())} м</td><td>${fmt(groundLengthReline())} м</td></tr>
                <tr><td>Итоговая длина с хвостовиком</td><td>${fmt(lengthNoReline())} м</td><td>${fmt(lengthReline())} м</td></tr>
                <tr><td>Предварительное сокращение</td><td colspan="2">${fmt(lengthReductionM())} м или ${fmt(lengthReductionPct())}%</td></tr>
                <tr><td>Несущая способность</td><td colspan="2">Нужна отдельная проверка</td></tr>
            `;
            const weightRows = isSteelPile() ? `
                <tr><td>Толщина стенки</td><td>${fmt(selectedWallMm())} мм</td></tr>
                <tr><td>Погонный вес q, использованный в расчете</td><td>${fmt(pipeWeightKNM())} кН/м (${pileWeightSource()})</td></tr>
            ` : isConcretePile() ? `
                <tr><td>Погонный вес q, использованный в расчете</td><td>${fmt(pipeWeightKNM())} кН/м (${pileWeightSource()})</td></tr>
            ` : isCustomPile() ? `
                <tr><td>Диаметр сваи</td><td>${selectedDiameterMm() > 0 ? fmt(selectedDiameterMm()) + " мм" : "не задан"}</td></tr>
                <tr><td>Толщина стенки</td><td>${selectedWallMm() > 0 ? fmt(selectedWallMm()) + " мм" : "не задана"}</td></tr>
                <tr><td>Погонный вес q, использованный в расчете</td><td>${pipeWeightKNM() > 0 ? fmt(pipeWeightKNM()) + " кН/м (" + pileWeightSource() + ")" : "не задан"}</td></tr>
            ` : "";
            el("calcTable").innerHTML = `
                <tr><th>Показатель</th><th>Значение</th></tr>
                <tr><td>Тип сваи</td><td>${pileTypeK[val("pileType")].label}</td></tr>
                <tr><td>${isConcretePile() ? "Сечение сваи" : isCustomPile() ? "Тип геометрии" : "Диаметр сваи"}</td><td>${isConcretePile() ? concreteSection().b + " × " + concreteSection().h + " мм" : isCustomPile() ? "Пользовательская" : fmt(selectedDiameterMm()) + " мм"}</td></tr>
                ${weightRows}
                <tr><td>Тип грунта для покрытия</td><td>${soil().name}</td></tr>
                <tr><td>τfh</td><td>${fmt(tauCalc())} кПа</td></tr>
                <tr><td>Коэффициент поверхности сваи k</td><td>${fmt(kSurface())}</td></tr>
                <tr><td>Периметр сваи</td><td>${fmt(perimeter())} м</td></tr>
                <tr><td>Площадь смерзания</td><td>${fmt(Afh())} м²</td></tr>
                <tr><td>Эквивалентное fi по слоям</td><td>${fmt(equivalentFi())} кПа</td></tr>
                <tr><td>Нагрузка от веса сооружения F</td><td>${fmt(num("structureLoadF"))} кН</td></tr>
                <tr><td>Высота хвостовика над землей</td><td>${fmt(tailHeight())} м</td></tr>
                <tr><td>Длина сваи в грунте при L0</td><td>${fmt(baseLengthInGround())} м</td></tr>
            `;
        }

        el("jsonOut").value = JSON.stringify(allData(), null, 2);
    }

    function syncTauField() {
        if (val("tauSource") === "custom") {
            el("tauValue").readOnly = false;
        } else {
            el("tauValue").readOnly = true;
            el("tauValue").value = inputFmt(interpolate(tauVariants[val("tauSource")].points, num("freezeDepth")));
        }
    }

    function syncPileK() {
        if (val("pileType") !== "custom") {
            el("surfaceK").value = pileTypeK[val("pileType")].k.toFixed(2);
        }
    }

    function syncSoilOptions() {
        const list = currentSoilList();
        const current = parseInt(el("soilType").value || "0", 10);
        el("soilType").innerHTML = list.map((s, i) => `<option value="${i}">${s.name}</option>`).join("");
        el("soilType").value = current < list.length ? String(current) : "0";
    }

    function syncRoundDiameterOptions() {
        const current = val("diameter");
        let list = val("pileType") === "wood" ? timberDiameters : steelDiameters;
        if (isCustomPile()) list = ["custom"];
        el("diameter").innerHTML = list.map(d => `<option value="${d}">${d === "custom" ? "Другое значение" : d}</option>`).join("");
        if (list.map(String).includes(current)) {
            el("diameter").value = current;
        } else {
            el("diameter").value = list.includes(325) ? "325" : String(list[0]);
        }
    }

    function setVisible(id, visible) {
        el(id).classList.toggle("hidden", !visible);
    }

    function geometryKey() {
        return [
            val("pileType"), val("diameter"), val("customDiameter"),
            val("wall"), val("customWall"), val("concreteSection"),
            val("customConcreteB"), val("customConcreteH")
        ].join("|");
    }

    function updateGeometryFields() {
        const concrete = isConcretePile();
        const steel = isSteelPile();
        const custom = isCustomPile();
        const showWeight = steel || concrete || custom;

        setVisible("roundDiameterWrap", !concrete);
        setVisible("steelWallWrap", steel || custom);
        setVisible("concreteSectionWrap", concrete);
        setVisible("pileWeightWrap", showWeight);
        setVisible("customDiameterWrap", custom || (!concrete && val("diameter") === "custom"));
        setVisible("customWallWrap", custom || (steel && val("wall") === "custom"));
        setVisible("customConcreteWrap", concrete && val("concreteSection") === "custom");

        const key = geometryKey();
        if (key !== lastGeometryKey) {
            pileWeightEdited = false;
            lastGeometryKey = key;
        }

        if (showWeight) {
            if (!pileWeightEdited) {
                if (steel || concrete) {
                    el("pileWeightM").value = inputFmt(autoPileWeightKNM(), 3);
                } else if (custom) {
                    el("pileWeightM").value = "";
                }
            }
        } else {
            el("pileWeightM").value = "";
        }
    }

    function updateWeightField() { updateGeometryFields(); }

    function updateWalls() {
        const D = val("diameter"), cur = val("wall");
        let walls = isCustomPile() ? ["custom"] : (pipeWalls[D] || [5, 6, 8, 10, 12]).concat(["custom"]);
        el("wall").innerHTML = walls.map(w => `<option value="${w}">${w === "custom" ? "Другое значение" : w}</option>`).join("");
        if (walls.map(String).includes(cur)) el("wall").value = cur;
        else el("wall").value = String(walls[0]);
    }

    function renderFiTable() {
        el("fiTable").innerHTML = `
            <tr>
                <th>Средняя глубина слоя, м</th>
                <th>Пески крупные и средней крупности</th>
                <th>Пески мелкие</th>
                <th>Пески пылеватые</th>
                <th>Глинистые IL ≤ 0,2</th>
                <th>Глинистые IL = 0,3</th>
                <th>Глинистые IL = 0,4</th>
                <th>Глинистые IL = 0,5</th>
                <th>Глинистые IL = 0,6</th>
                <th>Глинистые IL = 0,7</th>
            </tr>
            ${fiTableRows.map(r => `
                <tr>
                    <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td><td>${r[7]}</td><td>${r[8]}</td><td>${r[9]}</td>
                </tr>
            `).join("")}
        `;
    }

    function renderLayers() {
        el("layersTable").innerHTML = `
            <div class="calculator-layer-head">От, м</div>
            <div class="calculator-layer-head">До, м</div>
            <div class="calculator-layer-head">fi, кПа</div>
            ${layers.map((layer, i) => `
                <input type="number" step="0.1" value="${layer.from}" data-layer="${i}" data-field="from">
                <input type="number" step="0.1" value="${layer.to}" data-layer="${i}" data-field="to">
                <input type="number" step="1" value="${layer.fi}" data-layer="${i}" data-field="fi">
            `).join("")}
        `;
        el("layersTable").querySelectorAll("input").forEach(inp => {
            inp.addEventListener("input", e => {
                const idx = parseInt(e.target.dataset.layer, 10);
                const field = e.target.dataset.field;
                layers[idx][field] = parseFloat(e.target.value || "0");
                el("holdingFi").value = inputFmt(equivalentFi());
                render(true);
            });
        });
        el("holdingFi").value = inputFmt(equivalentFi());
    }

    function syncDefaultLayer() {
        if (layers.length === 1) {
            layers[0].from = num("freezeDepth");
            layers[0].to = Math.max(baseLengthInGround(), num("freezeDepth") + 0.1);
        }
    }

    function allData() {
        return {
            description: "Конфигуратор применения противопучинных покрытий Релайн",
            inputs: {
                pile_type: pileTypeK[val("pileType")].label,
                surface_k: kSurface(),
                diameter_mm: isConcretePile() ? null : (selectedDiameterMm() || null),
                concrete_section_mm: isConcretePile() ? concreteSection() : null,
                wall_mm: (isSteelPile() || isCustomPile()) ? (selectedWallMm() || null) : null,
                pile_weight_q_kN_per_m: pipeWeightKNM(),
                pile_weight_q_source: pileWeightSource(),
                base_total_length_L0_m: num("baseLength"),
                tail_height_above_ground_m: tailHeight(),
                base_length_in_ground_m: baseLengthInGround(),
                base_holding_G_kN: num("baseHoldingG"),
                structure_load_F_kN: num("structureLoadF"),
                effective_holding_G_plus_F_kN: effectiveHoldingG(),
                freeze_depth_dth_m: num("freezeDepth"),
                soil_type: soil().name,
                coating_type: coatingName(),
                tau_source: val("tauSource") === "custom" ? "Пользовательский" : tauVariants[val("tauSource")].label,
                tau_fh_kPa: tauCalc(),
                layers_below_dth: layers,
                equivalent_fi_kPa: equivalentFi()
            },
            calculations: {
                perimeter_m: perimeter(),
                Afh_m2: Afh(),
                heave_without_reline_kN: hasFatalError() ? null : heaveNoReline(),
                heave_with_reline_kN: hasFatalError() ? null : heaveReline(),
                ground_length_without_reline_m: hasFatalError() ? null : groundLengthNoReline(),
                ground_raw_length_with_reline_m: hasFatalError() ? null : rawGroundLengthReline(),
                ground_min_length_with_reline_m: hasFatalError() ? null : minGroundRelineLength(),
                ground_length_with_reline_m: hasFatalError() ? null : groundLengthReline(),
                total_length_without_reline_m: hasFatalError() ? null : lengthNoReline(),
                total_raw_length_with_reline_m: hasFatalError() ? null : rawLengthReline(),
                total_min_length_with_reline_m: hasFatalError() ? null : minRelineLength(),
                total_length_with_reline_m: hasFatalError() ? null : lengthReline(),
                reline_length_adjusted_to_dth_plus_0_4: hasFatalError() ? null : (rawGroundLengthReline() < num("freezeDepth")),
                preliminary_length_reduction_m: hasFatalError() ? null : lengthReductionM(),
                preliminary_length_reduction_percent: hasFatalError() ? null : lengthReductionPct()
            },
            validation: { base_length_shorter_than_dth: hasFatalError(), no_coating_length_below_dth: noCoatingLengthBelowDth() },
            limitations: [
                "Расчет показывает предварительное сокращение длины только по морозному пучению.",
                "Требуется отдельная проверка по несущей способности."
            ]
        };
    }

    function resultSummaryText() {
        if (hasFatalError() || noCoatingLengthBelowDth()) return "Расчет требует проверки исходных данных.";
        return [
            `Тип покрытия: ${coatingName()} «Релайн»`,
            `Итоговая длина без покрытия: ${fmt(lengthNoReline())} м`,
            `Итоговая длина с покрытием: ${fmt(lengthReline())} м`,
            `Предварительное сокращение: ${fmt(lengthReductionM())} м / ${fmt(lengthReductionPct())}%`,
            `τfh: ${fmt(tauCalc())} кПа`,
            `q: ${fmt(pipeWeightKNM())} кН/м`,
            `L0: ${fmt(num("baseLength"))} м`,
            `dth: ${fmt(num("freezeDepth"))} м`,
            `Тип сваи: ${pileTypeK[val("pileType")].label}`,
            `Грунт: ${soil().name}`
        ].join("\n");
    }

    // function openRequestModal() {
    //     render();
    //     el("requestCalcData").value = resultSummaryText();
    //     el("requestModal").classList.add("is-open");
    //     el("requestModal").setAttribute("aria-hidden", "false");
    //     document.body.classList.add("modal-open");
    // }

    // function closeRequestModal() {
    //     el("requestModal").classList.remove("is-open");
    //     el("requestModal").setAttribute("aria-hidden", "true");
    //     document.body.classList.remove("modal-open");
    // }

    // function copy(text) {
    //     navigator.clipboard.writeText(text).then(() => alert("Скопировано")).catch(() => {
    //         const ta = document.createElement("textarea");
    //         ta.value = text;
    //         document.body.appendChild(ta);
    //         ta.select();
    //         document.execCommand("copy");
    //         document.body.removeChild(ta);
    //         alert("Скопировано");
    //     });
    // }

    function openRequestModal() {
        render();

        // Получаем данные расчета
        const calcData = resultSummaryText();

        // Заполняем поле в CF7 форме
        const calcDataField = document.getElementById('calculation-data-field');
        if (calcDataField) {
            calcDataField.value = calcData;
        }

        // Открываем модалку
        const modal = document.getElementById('requestModal');
        if (modal) {
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        }
    }

    function closeRequestModal() {
        const modal = document.getElementById('requestModal');
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
        }
    }

    function copy(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showCopyNotification();
            }).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showCopyNotification();
    }

    function showCopyNotification() {
        const copyBtn = document.getElementById('copyRequestData');
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Скопировано!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    }    

    // === Init ===
    function init() {
        syncSoilOptions();
        el("soilType").value = "7";
        syncRoundDiameterOptions();
        el("concreteSection").innerHTML = concreteSections.map((s, i) => `<option value="${s.custom ? "custom" : i}">${s.label}</option>`).join("");
        updateWalls();
        el("wall").value = "8";
        updateGeometryFields();
        renderFiTable();
        syncPileK();
        syncDefaultLayer();

        el("pileType").addEventListener("input", () => { syncPileK(); syncSoilOptions(); syncRoundDiameterOptions(); updateWalls(); updateGeometryFields(); render(); });
        el("surfaceK").addEventListener("input", () => {
            if (val("pileType") !== "custom") {
                el("pileType").value = "custom";
                syncSoilOptions();
                syncRoundDiameterOptions();
                updateWalls();
            }
            updateGeometryFields();
            render();
        });
        el("pileWeightM").addEventListener("input", () => { pileWeightEdited = true; render(); });
        el("addLayer").addEventListener("click", () => {
            const last = layers[layers.length - 1] || { from: num("freezeDepth"), to: num("freezeDepth") + 1, fi: 12 };
            layers.push({ from: last.to, to: last.to + 2, fi: last.fi });
            render();
        });
        el("removeLayer").addEventListener("click", () => { if (layers.length > 1) { layers.pop(); render(); } });

        document.querySelectorAll(".calculator-section-card input, .calculator-section-card select").forEach(x => {
            if (["pileType", "surfaceK", "pileWeightM"].includes(x.id)) return;
            x.addEventListener("input", () => {
                if (x.id === "diameter") updateWalls();
                if (["freezeDepth", "baseLength", "tailHeight"].includes(x.id)) syncDefaultLayer();
                updateGeometryFields();
                render();
            });
        });

        el("copyText").addEventListener("click", () => copy([
            `Статус: ${el("mainStatus").querySelector("h3")?.textContent || "Предварительный расчет готов"}`,
            `Итоговая длина без покрытия: ${hasFatalError() || noCoatingLengthBelowDth() ? "—" : fmt(lengthNoReline()) + " м"}`,
            `Итоговая длина с покрытием: ${hasFatalError() || noCoatingLengthBelowDth() ? "—" : fmt(lengthReline()) + " м"}`,
            `Предварительное сокращение: ${hasFatalError() || noCoatingLengthBelowDth() ? "—" : fmt(lengthReductionM()) + " м / " + fmt(lengthReductionPct()) + "%"}`
        ].join("\n")));

        el("priceBtn").addEventListener("click", openRequestModal);
        el("showResult").addEventListener("click", () => { render(); el("resultZone").scrollIntoView({ behavior: "smooth", block: "start" }); });
        el("resetBtn").addEventListener("click", () => window.location.reload());

        // Убираем ссылки на несуществующие элементы
        // el("sendRequest").addEventListener("click", () => alert("Заявка подготовлена..."));
        // el("copyRequestData").addEventListener("click", () => copy(el("requestCalcData").value));

        // Кнопка копирования (если есть в CF7 форме)
        const copyRequestDataBtn = document.getElementById('copyRequestData');
        if (copyRequestDataBtn) {
            copyRequestDataBtn.addEventListener("click", () => {
                const calcDataField = document.getElementById('calculation-data-field');
                if (calcDataField && calcDataField.value) {
                    copy(calcDataField.value);
                }
            });
        }

        // Закрытие модалки с проверкой на существование
        const modal = document.getElementById('requestModal');
        if (modal) {
            modal.querySelectorAll("[data-modal-close]").forEach(btn => btn.addEventListener("click", closeRequestModal));
            modal.addEventListener("click", e => { if (e.target === modal) closeRequestModal(); });
        }

        document.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                const modal = document.getElementById('requestModal');
                if (modal && modal.classList.contains("is-open")) {
                    closeRequestModal();
                }
            }
        });

        render();
    }
    init();
});