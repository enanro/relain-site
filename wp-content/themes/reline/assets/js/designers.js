document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.site-nav');
  const dropdownItems = document.querySelectorAll('.site-nav__item--dropdown');
  const modal = document.getElementById('request-modal');
  const openButtons = document.querySelectorAll('[data-modal-open]');
  const closeButtons = document.querySelectorAll('[data-modal-close]');
  const forms = document.querySelectorAll('.js-form');
  const stepCards = document.querySelectorAll('.step-card');
  const workflowNote = document.getElementById('workflow-note');
  const calcForm = document.getElementById('calc-form');
  const calcResult = document.getElementById('calc-result');
  const calcMiniBadges = document.getElementById('calc-mini-badges');

  const notes = [
    ['Запрос от проектного института', 'Передайте исходные данные по объекту, тип сваи, район строительства и расчетные требования.'],
    ['Подбор решения', 'Инженер подбирает параметры ОСПТ «Релайн» под грунты, глубину промерзания и конструкцию свайного основания.'],
    ['Предоставление документации', 'Готовим комплект материалов для проектирования: протоколы, нормативные ссылки, технические описания и рекомендации.'],
    ['Консультации', 'Разбираем технические вопросы и помогаем сформулировать обоснование применения решения в проектной документации.'],
    ['Сопровождение проекта', 'Поддерживаем проектировщика на этапе экспертизы, корректировок и дальнейшей реализации объекта.']
  ];

  stepCards.forEach((card) => {
    card.addEventListener('click', () => {
      stepCards.forEach((item) => item.classList.remove('is-active'));
      card.classList.add('is-active');
      const [title, text] = notes[Number(card.dataset.step)] || notes[0];
      if (workflowNote) {
        workflowNote.querySelector('h3').textContent = title;
        workflowNote.querySelector('p').textContent = text;
      }
    });
  });

  const miniSoils = [
    { name: 'Пески мелкие 0,6 < Sr < 0,8', g: { '-1': 0.58, '-2': 0.60, '-6': 0.62 } },
    { name: 'Пески мелкие 0,8 < Sr < 0,95', g: { '-1': 0.44, '-2': 0.49, '-6': 0.53 } },
    { name: 'Пески мелкие Sr > 0,95', g: { '-1': 0.50, '-2': 0.49, '-6': 0.42 } },
    { name: 'Пески пылеватые 0,6 < Sr < 0,8', g: { '-1': 0.35, '-2': 0.39, '-6': 0.46 } },
    { name: 'Пески пылеватые 0,8 < Sr < 0,95', g: { '-1': 0.32, '-2': 0.37, '-6': 0.42 } },
    { name: 'Супесь IL < 0,25', g: { '-1': 0.54, '-2': 0.50, '-6': 0.42 } },
    { name: 'Супесь 0,25 < IL < 0,5', g: { '-1': 0.64, '-2': 0.59, '-6': 0.52 } },
    { name: 'Супесь IL > 0,5', g: { '-1': 0.62, '-2': 0.60, '-6': 0.58 } },
    { name: 'Суглинок IL < 0,25', g: { '-1': 0.45, '-2': 0.46, '-6': 0.55 } },
    { name: 'Суглинок 0,25 < IL < 0,5', g: { '-1': 0.43, '-2': 0.45, '-6': 0.46 } },
    { name: 'Глина IL < 0,25', g: { '-1': 0.55, '-2': 0.58, '-6': 0.60 } },
    { name: 'Глина 0,25 < IL < 0,5', g: { '-1': 0.62, '-2': 0.62, '-6': 0.56 } }
  ];

  const miniTau = {
    sp_high: [[1.5, 110], [2.5, 90], [3.0, 70]]
  };

  function fmtRu(value, digits = 1) {
    return Number.isFinite(value)
      ? Number(value).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
      : '—';
  }

  function interpolate(points, x) {
    if (x <= points[0][0]) return points[0][1];
    if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
    for (let index = 0; index < points.length - 1; index += 1) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[index + 1];
      if (x >= x1 && x <= x2) return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
    }
    return points[points.length - 1][1];
  }

  function miniCalculate(form) {
    const data = new FormData(form);
    const pileType = String(data.get('pileType'));
    const diameter = Number(data.get('diameter'));
    const wall = Number(data.get('wall'));
    const freezeDepth = Number(data.get('freezeDepth')) || 2.5;
    const soil = miniSoils[Number(data.get('soilType'))] || miniSoils[0];
    const relEffect = ['-1', '-2', '-6'].reduce((sum, key) => sum + soil.g[key], 0) / 3;
    const surfaceK = pileType === 'concrete_smooth' ? 1 : 0.8;
    const perimeter = Math.PI * (diameter / 1000);
    const tau = interpolate(miniTau.sp_high, freezeDepth);
    const heaveNoReline = tau * surfaceK * perimeter * freezeDepth;
    const heaveReline = heaveNoReline * relEffect;
    const pipeWeight = Math.PI / 4 * (diameter * diameter - (diameter - 2 * wall) * (diameter - 2 * wall)) * 7850 / 1000000 * 9.80665 / 1000;

    const baseLength = 8;
    const baseHolding = 200;
    const sideHoldingPerMeter = perimeter * 30;
    const denom = pipeWeight + sideHoldingPerMeter;
    const lengthNoReline = (heaveNoReline - baseHolding + pipeWeight * baseLength + sideHoldingPerMeter * baseLength) / denom;
    const rawLengthReline = (heaveReline - baseHolding + pipeWeight * baseLength + sideHoldingPerMeter * baseLength) / denom;
    const lengthReline = Math.max(rawLengthReline, freezeDepth + 0.4);
    const reductionM = Math.max(0, lengthNoReline - lengthReline);
    const reductionPct = lengthNoReline > 0 ? reductionM / lengthNoReline * 100 : 0;

    return {
      lengthReline,
      lengthNoReline,
      reductionM,
      reductionPct,
      heaveNoReline,
      heaveReline,
      tau,
      soilName: soil.name
    };
  }

  function renderMiniResult(result) {
    if (!calcResult) return;
    calcResult.innerHTML = `
      <strong>Предварительный расчет готов</strong>
      <p>С ОСПТ «Релайн» итоговая длина сваи — <b>${fmtRu(result.lengthReline)} м</b>. Без покрытия — <b>${fmtRu(result.lengthNoReline)} м</b>. Предварительное сокращение длины — <b>${fmtRu(result.reductionM)} м</b> (<b>${fmtRu(result.reductionPct)}%</b>). Требуется проверка по несущей способности.</p>
    `;
    if (calcMiniBadges) {
      calcMiniBadges.innerHTML = `
        <span class="calc-mini-badge">τfh = ${fmtRu(result.tau)} кПа</span>
        <span class="calc-mini-badge">ОСПТ «Релайн»</span>
        <span class="calc-mini-badge">Fпуч = ${fmtRu(result.heaveNoReline)} кН</span>
        <span class="calc-mini-badge">FОСПТ = ${fmtRu(result.heaveReline)} кН</span>
      `;
    }
  }

  if (calcForm) renderMiniResult(miniCalculate(calcForm));

  calcForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    renderMiniResult(miniCalculate(calcForm));
  });

  // forms.forEach((form) => {
  //   form.addEventListener('submit', (event) => {
  //     event.preventDefault();
  //     if (!form.checkValidity()) {
  //       form.reportValidity();
  //       return;
  //     }
  //     const submitButton = form.querySelector('button[type="submit"]');
  //     if (!submitButton) return;
  //     const oldText = submitButton.textContent;
  //     submitButton.textContent = 'Заявка подготовлена';
  //     submitButton.disabled = true;
  //     setTimeout(() => {
  //       submitButton.textContent = oldText;
  //       submitButton.disabled = false;
  //       form.reset();
  //       forms.forEach(setFormMeta);
  //       if (form.closest('.modal')) closeModal();
  //     }, 1600);
  //   });
  // });
});
