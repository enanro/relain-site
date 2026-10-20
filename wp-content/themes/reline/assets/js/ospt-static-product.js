document.querySelectorAll('.ospt-static--pile').forEach(section => {
  const coated = section.querySelector('.ospt-static__pile-coated');
  const bare = section.querySelector('.ospt-static__pile-bare');
  const buttons = section.querySelectorAll('[data-pile-view]');
  if (!coated || !bare || buttons.length !== 2) return;
  buttons.forEach(button => button.addEventListener('click', () => {
    const showCoated = button.dataset.pileView === 'coated';
    coated.hidden = !showCoated;
    bare.hidden = showCoated;
    buttons.forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
  }));
});
