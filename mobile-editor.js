export function mountMobileEditor({ switchTab, fit }) {
  const $ = selector => document.querySelector(selector);
  const mobile = matchMedia('(max-width:700px)');
  const drawer = $('.customize-section'), tabs = $('.tool-tabs');
  const ranges = document.createElement('div'); ranges.className = 'object-ranges';
  for (const id of ['sticker-size', 'sticker-rotation']) {
    const row = document.createElement('div'); row.className = 'object-range'; row.append($(`label[for="${id}"]`), $(`#${id}`)); ranges.append(row);
  }
  $('#sticker-controls').append(ranges);
  $('#sticker-controls .selected-heading>div').prepend($('#mirror-sticker'));
  const heading = document.createElement('div'); heading.className = 'drawer-heading';
  heading.innerHTML = '<span id="drawer-title">Câmeras</span><button type="button" id="close-tools" aria-label="Recolher ferramentas e ampliar foto">Ver a foto <span aria-hidden="true">⌄</span></button>';
  tabs.after(heading);
  function close() { document.body.classList.add('tools-collapsed'); tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-expanded', 'false')); fit(); }
  function open(id) {
    document.body.classList.remove('tools-collapsed');
    const tab = tabs.querySelector(`[data-tab="${id}"]`);
    $('#drawer-title').textContent = tab?.textContent.trim() || 'Ferramentas';
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-expanded', String(b === tab)));
    if (mobile.matches) tab?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    fit();
  }
  $('#close-tools').addEventListener('click', close);
  tabs.addEventListener('click', event => {
    const tab = event.target.closest('.tool-tab'); if (!tab) return;
    if (mobile.matches && tab.dataset.wasActive === 'true' && !document.body.classList.contains('tools-collapsed')) close();
    else open(tab.dataset.tab);
  });
  tabs.addEventListener('pointerdown', event => { const tab = event.target.closest('.tool-tab'); if (tab) tab.dataset.wasActive = String(tab.classList.contains('active')); });
  tabs.addEventListener('keydown', () => { tabs.querySelectorAll('button').forEach(b => delete b.dataset.wasActive); });

  const groups = [...document.querySelectorAll('.adjustment-group')];
  groups.forEach(group => { const content = group.querySelector('.group-content'); content.append(content.querySelector('.text-reset')); });
  $('#panel-adjust').append($('#panel-adjust .adjustment-intro'));
  const groupNav = document.createElement('div'); groupNav.className = 'adjustment-navigation'; groupNav.setAttribute('aria-label', 'Grupos de ajustes');
  const labels = { light: ['☼', 'Luz'], color: ['◐', 'Cor'], hsl: ['◉', 'HSL'], curves: ['⌁', 'Curvas'], grading: ['◌', 'Gradação'], details: ['△', 'Detalhes'], analog: ['✧', 'Efeitos'], composition: ['⌗', 'Recorte'] };
  let selectedGroup = 'light';
  function selectGroup(id) {
    selectedGroup = id;
    groups.forEach(g => { g.hidden = g.dataset.group !== id; g.open = g.dataset.group === id; });
    groupNav.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.groupTarget === id)));
    $('#panel-adjust').scrollTop = 0;
  }
  for (const group of groups) {
    const [symbol, name] = labels[group.dataset.group] || ['✧', group.dataset.group];
    const button = document.createElement('button'); button.type = 'button'; button.dataset.groupTarget = group.dataset.group;
    button.innerHTML = `<span aria-hidden="true">${symbol}</span><span>${name}</span>`;
    button.addEventListener('click', () => { selectGroup(group.dataset.group); button.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); });
    groupNav.append(button);
  }
  $('#adjustments-root').before(groupNav); selectGroup(selectedGroup);

  const moved = ['#upload-button', '#save-button'].map(selector => {
    const node = $(selector), marker = document.createComment(selector); node.before(marker); return { node, marker };
  });
  moved[0].node.setAttribute('aria-label', 'Escolher ou trocar foto');
  moved[1].node.setAttribute('aria-label', 'Guardar minha criação');
  function layout() {
    if (mobile.matches) {
      $('.workspace-header').prepend(moved[0].node); $('.workspace-header').append(moved[1].node);
      close();
    } else { moved.forEach(({ node, marker }) => marker.after(node)); document.body.classList.remove('tools-collapsed'); }
    fit();
  }
  mobile.addEventListener('change', layout); layout();
  return { open: id => { switchTab(id); open(id); }, close };
}
