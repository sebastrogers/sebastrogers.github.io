/* Motor dos slides das aulas · Expedição Filipos */
(function () {
  const tela = document.querySelector('.tela');
  const slides = [...document.querySelectorAll('.slide')];
  const barra = document.querySelector('.barra i');
  const contador = document.querySelector('#contador');
  const painel = document.querySelector('#notas');
  let atual = 0;

  const celularEmPe = matchMedia('(max-width: 760px) and (orientation: portrait)');
  function escalar() {
    if (celularEmPe.matches) { tela.style.transform = ''; return; }
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    tela.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  window.addEventListener('resize', escalar);
  escalar();

  const passos = (sl) => [...sl.querySelectorAll('.passo')];

  function mostrar(i, todosPassos) {
    atual = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => s.classList.toggle('ativo', k === atual));
    const sl = slides[atual];
    sl.scrollTop = 0;
    passos(sl).forEach(p => p.classList.toggle('visto', !!todosPassos));
    barra.style.width = ((atual + 1) / slides.length * 100) + '%';
    contador.textContent = `${atual + 1} / ${slides.length}`;
    const nota = sl.querySelector('.nota');
    painel.querySelector('.texto-nota').innerHTML = nota ? nota.innerHTML : '<p>Sem notas para este slide.</p>';
    try { history.replaceState(null, '', '#' + (atual + 1)); } catch (e) { /* ok */ }
    const mapa = sl.querySelector('.mapa-slide #mapa');
    if (mapa && !mapa.dataset.pronto && window.Expedicao && Expedicao.mapa) { mapa.dataset.pronto = '1'; Expedicao.mapa(mapa); }
    else if (mapa) { const b = mapa.querySelector('#refazerRota'); if (b) b.click(); }
  }

  function avancar() {
    if (celularEmPe.matches) { if (atual < slides.length - 1) mostrar(atual + 1, true); return; }
    const falta = passos(slides[atual]).find(p => !p.classList.contains('visto'));
    if (falta) { falta.classList.add('visto'); return; }
    if (atual < slides.length - 1) mostrar(atual + 1);
  }
  function voltar() {
    if (celularEmPe.matches) { if (atual > 0) mostrar(atual - 1, true); return; }
    const vistos = passos(slides[atual]).filter(p => p.classList.contains('visto'));
    if (vistos.length) { vistos[vistos.length - 1].classList.remove('visto'); return; }
    if (atual > 0) mostrar(atual - 1, true);
  }

  function telaCheia() {
    const d = document;
    if (!d.fullscreenElement) (d.documentElement.requestFullscreen || function () {}).call(d.documentElement);
    else d.exitFullscreen();
  }
  function alternarNotas() { painel.classList.toggle('aberta'); }

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea')) return;
    const k = e.key;
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(k) && !e.target.closest('button,summary,a')) { e.preventDefault(); avancar(); }
    else if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); avancar(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); voltar(); }
    else if (k === 'Home') mostrar(0);
    else if (k === 'End') mostrar(slides.length - 1, true);
    else if (k === 'f' || k === 'F') telaCheia();
    else if (k === 'n' || k === 'N') alternarNotas();
    else if (k === 'p' || k === 'P') document.querySelector('#bPdf').click();
  });
  document.querySelector('.palco').addEventListener('click', (e) => {
    if (e.target.closest('button,a,summary,details,.venn,.fichas,.mapa-slide,.revisao')) return;
    if (celularEmPe.matches) return;
    const r = tela.getBoundingClientRect();
    if (e.clientX > r.left + r.width * 0.3) avancar(); else voltar();
  });
  let x0 = null;
  let y0 = null;
  document.addEventListener('touchstart', e => { if (e.target.closest('.venn,.fichas,.controles,.notas,.mapa-slide')) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; const dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? avancar : voltar)();
  });
  document.querySelector('#bAnt').addEventListener('click', voltar);
  document.querySelector('#bProx').addEventListener('click', avancar);
  document.querySelector('#bTela').addEventListener('click', telaCheia);
  document.querySelector('#bNotas').addEventListener('click', alternarNotas);
  document.querySelector('#bSair').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    let mesmoSite = false;
    try { mesmoSite = document.referrer && new URL(document.referrer).origin === location.origin && !document.referrer.includes('aula-'); } catch (e) { /* ok */ }
    if (mesmoSite && history.length > 1) history.back();
    else location.href = document.body.dataset.sair || 'index.html';
  });
  /* PDF: prepara a impressão com todos os slides */
  let abertosAntes = [];
  function prepararImpressao() {
    document.body.classList.add('imprimindo');
    slides.forEach(sl => sl.querySelectorAll('.passo').forEach(p => p.classList.add('visto')));
    abertosAntes = [...document.querySelectorAll('.revisao details')].map(d => d.open);
    document.querySelectorAll('.revisao details').forEach(d => { d.open = true; });
    const m = document.querySelector('.mapa-slide #mapa');
    if (m && !m.dataset.pronto && window.Expedicao && Expedicao.mapa) { m.dataset.pronto = '1'; Expedicao.mapa(m); }
    if (m) { const svg = m.querySelector('svg'); if (svg) svg.classList.add('ativo'); }
  }
  function depoisImpressao() {
    document.body.classList.remove('imprimindo');
    document.querySelectorAll('.revisao details').forEach((d, i) => { d.open = !!abertosAntes[i]; });
    mostrar(atual);
  }
  window.addEventListener('beforeprint', prepararImpressao);
  window.addEventListener('afterprint', depoisImpressao);
  document.querySelector('#bPdf').addEventListener('click', () => { prepararImpressao(); setTimeout(() => window.print(), 300); });
  let t; document.addEventListener('mousemove', () => { document.body.classList.add('mostrar-ctrl'); clearTimeout(t); t = setTimeout(() => document.body.classList.remove('mostrar-ctrl'), 1800); });

  /* atividade: os dois círculos */
  document.querySelectorAll('.atividade-venn').forEach((box) => {
    let escolhida = null;
    const fichas = box.querySelector('.fichas');
    box.querySelectorAll('.ficha').forEach(f => f.addEventListener('click', (e) => {
      e.stopPropagation();
      if (escolhida === f) { f.classList.remove('escolhida'); escolhida = null; return; }
      box.querySelectorAll('.ficha').forEach(x => x.classList.remove('escolhida'));
      f.classList.add('escolhida'); escolhida = f;
    }));
    box.querySelectorAll('[data-zona]').forEach(z => z.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!escolhida) return;
      const destino = z.querySelector('.lista');
      if (escolhida.parentElement === destino) fichas.append(escolhida);
      else destino.append(escolhida);
      escolhida.classList.remove('escolhida'); escolhida = null;
    }));
    const limpar = box.querySelector('.limpar');
    if (limpar) limpar.addEventListener('click', (e) => { e.stopPropagation(); box.querySelectorAll('.ficha').forEach(f => fichas.append(f)); });
  });

  const inicio = parseInt((location.hash || '#1').slice(1), 10);
  mostrar(isNaN(inicio) ? 0 : inicio - 1);
})();
/* botões que alternam um estado (ex.: a folha amassada) */
document.querySelectorAll('[data-alternar]').forEach(b => b.addEventListener('click', (e) => {
  e.stopPropagation();
  const alvo = document.querySelector(b.dataset.alternar);
  if (!alvo) return;
  const aberta = alvo.classList.toggle('aberta');
  if (b.dataset.rotulos) { const [a, c] = b.dataset.rotulos.split('|'); b.textContent = aberta ? c : a; }
}));
