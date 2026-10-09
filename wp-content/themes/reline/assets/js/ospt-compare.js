document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.ospt-compare');
    if (!section) return;

    const model = section.querySelector('.ospt-compare__model');
    const buttons = section.querySelectorAll('[data-pile-state]');
    const economy = section.querySelector('.ospt-compare__economy');
    const economyTitle = section.querySelector('.ospt-compare__economy-title');
    const economyText = section.querySelector('.ospt-compare__economy-text');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const copy = {
        coated: {
            title: 'Сокращение капитальных затрат для заказчиков',
            text: 'За счёт снижения касательных сил морозного пучения до 60% — экономия длины свай в 1,5 раза. Снижение общих затрат на проект — от 15 до 55%. Срок службы покрытия — 50+ лет.',
            label: 'Укороченная металлическая свая с тёмной противопучинной оболочкой, диагональ слева сверху направо вниз'
        },
        bare: {
            title: 'Без защиты: рост затрат',
            text: 'Без противопучинного покрытия требуется увеличение длины свай в 1,5 раза. Рост капитальных затрат на проект. Коррозия металла сокращает срок службы конструкции.',
            label: 'Удлинённая металлическая свая без оболочки, диагональ справа сверху налево вниз'
        }
    };
    let textTimer;

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const state = button.dataset.pileState;
            if (!copy[state] || (section.dataset.state || 'coated') === state) return;

            section.dataset.state = state;
            model.setAttribute('aria-label', copy[state].label);

            buttons.forEach((option) => {
                const isActive = option === button;
                option.classList.toggle('is-active', isActive);
                option.setAttribute('aria-pressed', String(isActive));
            });

            window.clearTimeout(textTimer);
            economy.classList.add('is-updating');
            textTimer = window.setTimeout(() => {
                economyTitle.textContent = copy[state].title;
                economyText.textContent = copy[state].text;
                economy.classList.remove('is-updating');
            }, reducedMotion.matches ? 0 : 180);
        });
    });
});
