/* Expedição Filipos · motor compartilhado das páginas */
(function () {
  'use strict';

  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzyVDcweu9eO6c8CztBCIj8y6hj1MXWVpWr0aFmXn_jrE3AYJC-BG7gc3OnsYiz6gbY/exec';
  const DISCIPLINA = 'EBD Jovens 4º Tri 2026';
  const CHAVE = 'expedicaoFilipos_v1';

  /* ---------- armazenamento (se o navegador bloquear, o site segue funcionando) ---------- */
  function ler() { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } }
  function gravar(est) { try { localStorage.setItem(CHAVE, JSON.stringify(est)); } catch (e) { /* segue sem salvar */ } }
  const estado = ler();
  estado.carimbos = estado.carimbos || {};
  estado.diario = estado.diario || {};

  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, attrs, ...filhos) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    for (const f of filhos.flat()) if (f != null) e.append(f.nodeType ? f : document.createTextNode(f));
    return e;
  };
  const embaralhar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function dataBR(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return d + ' ' + ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m - 1];
  }

  /* ---------- tema claro e escuro ---------- */
  const SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
  const LUA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
  function temaAtual() {
    const t = document.documentElement.dataset.theme;
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function montarTema() {
    const alvo = $('#tema');
    if (!alvo) return;
    const b = el('button', { class: 'botao-tema', type: 'button' });
    const pintar = () => {
      const escuro = temaAtual() === 'dark';
      b.innerHTML = (escuro ? SOL : LUA) + `<span>${escuro ? 'Modo claro' : 'Modo escuro'}</span>`;
      b.setAttribute('aria-label', escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro');
      b.title = escuro ? 'Modo claro' : 'Modo escuro';
    };
    b.addEventListener('click', () => {
      const novo = temaAtual() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = novo;
      try { localStorage.setItem('expedicaoTema', novo); } catch (e) { /* ok */ }
      pintar();
    });
    pintar();
    alvo.append(b);
  }

  /* ---------- quem está viajando ---------- */
  function atualizarViajante() {
    const alvo = $('#viajante');
    if (alvo) alvo.textContent = estado.aluno ? 'Viajante: ' + estado.aluno.nome.split(' ')[0] : '';
  }
  function formIdentificacao(aoConcluir) {
    const f = el('form', { class: 'identifique' },
      el('h3', null, 'Identifique-se para começar'),
      el('p', null, 'Seu nome vai junto com o resultado para o professor.'),
      el('div', { class: 'campo' }, el('label', { for: 'idNome' }, 'Seu nome'), el('input', { id: 'idNome', required: true, autocomplete: 'name', maxlength: 80, placeholder: 'Nome e sobrenome' })),
      el('div', { class: 'acoes centro' }, el('button', { class: 'botao', type: 'submit' }, 'Começar os desafios')));
    if (estado.aluno) f.querySelector('#idNome').value = estado.aluno.nome;
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const nome = f.querySelector('#idNome').value.trim();
      if (!nome) return;
      estado.aluno = { nome };
      gravar(estado);
      atualizarViajante();
      aoConcluir();
    });
    return f;
  }

  /* ---------- mapa animado da rota (At 16.8 a 17.1) ---------- */
  const P = (lon, lat) => [((lon - 22.6) * 100).toFixed(1), ((41.4 - lat) * 130).toFixed(1)];
  const caminho = (pts, fechar) => 'M' + pts.map(p => P(p[0], p[1]).join(',')).join(' L') + (fechar ? ' Z' : '');
  const ilha = (lon, lat, rx, ry) => { const [x, y] = P(lon, lat); return `<ellipse class="terra" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`; };
  const LUGARES = {
    troade: [26.16, 39.75, 'Trôade', -6, 4, 'end'], samotracia: [25.53, 40.47, 'Samotrácia', 8, 4, 'start'],
    neapolis: [24.41, 40.93, 'Neápolis', -2, 16, 'end'], filipos: [24.29, 41.01, 'Filipos', 0, -11, 'middle'],
    anfipolis: [23.85, 40.82, 'Anfípolis', -4, -8, 'middle'], apolonia: [23.46, 40.64, 'Apolônia', 0, 15, 'middle'],
    tessalonica: [22.95, 40.63, 'Tessalônica', 2, -8, 'start'],
  };
  const ORDEM = ['troade', 'samotracia', 'neapolis', 'filipos', 'anfipolis', 'apolonia', 'tessalonica'];
  function mapaSVG() {
    const europa = caminho([[22.6, 41.4], [22.6, 40.56], [22.95, 40.6], [23.02, 40.42], [23.3, 40.22], [23.33, 39.95], [23.48, 40.12],
      [23.62, 40.16], [23.78, 39.98], [23.95, 40.18], [24.38, 40.13], [23.95, 40.38], [23.78, 40.55], [23.86, 40.77], [24.12, 40.74],
      [24.42, 40.91], [24.7, 40.86], [25.05, 40.95], [25.5, 40.87], [25.9, 40.83], [26.05, 40.72], [26.2, 40.6], [26.55, 40.3],
      [26.62, 40.45], [26.6, 41.4]], true);
    const asia = caminho([[26.6, 39.4], [26.05, 39.45], [26.08, 39.75], [26.17, 40.05], [26.42, 40.17], [26.6, 40.3]], true);
    const L = LUGARES;
    const rota = caminho(ORDEM.map(k => L[k]));
    const pontos = ORDEM.map((k, i) => {
      const [x, y] = P(L[k][0], L[k][1]);
      const destino = k === 'filipos';
      return `<g class="lugar" style="--d:${(0.4 + i * 0.55).toFixed(2)}s"><circle class="ponto${destino ? ' destino' : ''}" cx="${x}" cy="${y}" r="${destino ? 5.5 : 3.6}"/>` +
        `<text class="${destino ? 'destaque' : ''}" x="${(+x + L[k][3]).toFixed(1)}" y="${(+y + L[k][4]).toFixed(1)}" text-anchor="${L[k][5]}">${L[k][2]}</text></g>`;
    }).join('');
    return `<svg class="mapa" viewBox="0 0 400 260" role="img" aria-labelledby="mapaT mapaD">
      <title id="mapaT">Rota de Paulo até Filipos</title>
      <desc id="mapaD">Mapa do norte do mar Egeu. De Trôade, na Ásia, o barco passa por Samotrácia e chega a Neápolis. De lá, a Via Egnatia sobe até Filipos e segue para Anfípolis, Apolônia e Tessalônica.</desc>
      <path class="terra" d="${europa}"/><path class="terra" d="${asia}"/>
      ${ilha(24.7, 40.68, 11, 9)}${ilha(25.55, 40.47, 8, 5)}${ilha(25.25, 39.9, 17, 12)}${ilha(25.85, 40.18, 8, 5)}
      <text class="mar" x="215" y="190">MAR EGEU</text><text class="mar" x="330" y="175" font-size="9">ÁSIA</text><text class="mar" x="40" y="22">MACEDÔNIA</text>
      <path class="rota-base" d="${rota}"/>
      <path id="rotaPaulo" class="rota-desenho" pathLength="1" d="${rota}"/>
      ${pontos}
      <circle class="viajante-ponto" r="4.5"><animateMotion id="movRota" dur="7s" begin="indefinite" fill="freeze" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#rotaPaulo"/></animateMotion></circle>
      <g transform="translate(14,222)"><rect class="mapa-legenda" width="176" height="24" rx="6"/><line x1="8" y1="12" x2="30" y2="12" class="rota-via-leg"/><text x="36" y="15.5">Rota de Paulo (At 16.8 a 17.1)</text></g>
    </svg>
    <div class="acoes centro"><button class="botao vazado" type="button" id="refazerRota">Ver a viagem de novo</button></div>`;
  }
  function animarMapa(alvo) {
    alvo.innerHTML = mapaSVG();
    const svg = alvo.querySelector('svg');
    const mov = alvo.querySelector('#movRota');
    const tocar = () => {
      svg.classList.remove('ativo'); void svg.getBoundingClientRect(); svg.classList.add('ativo');
      try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) mov.beginElement(); } catch (e) { /* sem SMIL */ }
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ents) => { if (ents.some(e => e.isIntersecting)) { tocar(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(svg);
    } else tocar();
    alvo.querySelector('#refazerRota').addEventListener('click', tocar);
  }

  /* ---------- passaporte: todas as paradas abertas ---------- */
  function seloSVG(n, cls) {
    return `<svg class="${cls || 'selo'}" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26"/><circle cx="30" cy="30" r="20" stroke-dasharray="2 3"/><text x="30" y="27" text-anchor="middle" font-size="8">FILIPOS</text><text x="30" y="40" text-anchor="middle" font-size="13">${n}</text></svg>`;
  }
  function renderPassaporte(alvo) {
    const paradas = window.EXPEDICAO_PARADAS;
    if (!alvo || !paradas) return;
    const lista = el('ol', { class: 'carimbos' });
    let feitos = 0;
    for (const p of paradas) {
      const c = estado.carimbos[p.n];
      if (c) feitos++;
      const a = el('a', { class: 'carimbo' + (c ? ' carimbado' : ''), href: p.pagina },
        el('span', { class: 'capa-foto' }, el('img', { src: p.capa, alt: '', loading: 'lazy', decoding: 'async' }), el('span', { class: 'num' }, 'Parada ' + p.n)),
        el('span', { class: 'texto-carimbo' },
          el('span', { class: 'lugar' }, p.lugar),
          el('span', { class: 'tema' }, p.tema),
          el('span', { class: 'data' }, c ? `Carimbado: ${c.acertos} de ${c.total}` : 'Lição de ' + dataBR(p.data))));
      if (c) a.insertAdjacentHTML('beforeend', seloSVG(p.n));
      lista.append(el('li', null, a));
    }
    alvo.innerHTML = '';
    alvo.append(lista);
    const cont = $('#contagemCarimbos');
    if (cont) cont.textContent = `${feitos} de ${paradas.length} carimbos`;
  }

  /* ---------- envio para a planilha ---------- */
  function enviarResultado(dados, statusEl) {
    statusEl.textContent = 'Enviando para o professor...';
    if (!WEBAPP_URL) { statusEl.textContent = 'Resultado registrado só nesta tela.'; return Promise.resolve(false); }
    return fetch(WEBAPP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(dados) })
      .then(() => { statusEl.textContent = 'Resultado enviado ao professor.'; return true; })
      .catch(() => { statusEl.textContent = 'Não foi possível enviar agora. Toque em "Enviar de novo" ou mostre esta tela ao professor.'; return false; });
  }

  /* ---------- motor de desafios ---------- */
  function iniciarExpedicao(cfg) {
    const raiz = $('#expedicao');
    if (!raiz) return;
    window.__expedicaoCfg = cfg;
    const D = cfg.desafios;
    const pontosDe = (d) => d.tipo === 'mcq' || d.tipo === 'vf' ? d.perguntas.length : d.tipo === 'categorizar' ? d.itens.length : d.tipo === 'pareamento' ? d.pares.length : 1;
    const total = D.reduce((s, d) => s + pontosDe(d), 0);
    let i = 0, acertos = 0, comecou = false;

    const retorno = (ok, ...linhas) => el('div', { class: 'retorno ' + (ok ? 'certo' : 'errado'), role: 'status' }, ...linhas.filter(Boolean).map(l => el('p', null, ...[].concat(l))));
    const negrito = (t) => el('strong', null, t);
    const barra = () => el('div', { class: 'progresso', 'aria-hidden': 'true' }, D.map((_, k) => el('span', { class: k < i ? 'feito' : k === i ? 'atual' : '' })));
    const cabecalho = (d) => [barra(), el('p', { class: 'nota' }, `Desafio ${i + 1} de ${D.length}`), el('h3', null, d.titulo),
      el('p', { class: 'contexto' }, d.contexto), d.micro ? el('div', { class: 'micro' }, d.micro) : null, el('p', { class: 'instrucao' }, d.instrucao)];
    function botaoSeguir(caixa) {
      const ultimo = i === D.length - 1;
      caixa.append(el('div', { class: 'acoes' }, el('button', { class: 'botao', type: 'button', onclick: () => { i++; desenhar(); raiz.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, ultimo ? 'Ver meu resultado' : 'Próximo desafio')));
    }
    function desenhar() {
      raiz.innerHTML = '';
      if (!comecou) { raiz.append(formIdentificacao(() => { comecou = true; desenhar(); })); return; }
      if (i >= D.length) return final();
      const d = D[i];
      const caixa = el('div', { class: 'desafio' }, ...cabecalho(d));
      raiz.append(caixa);
      ({ mcq, vf: mcq, categorizar, pareamento, sequencia })[d.tipo](d, caixa);
    }

    // múltipla escolha e verdadeiro ou falso: o erro sempre explica o porquê
    function mcq(d, caixa) {
      let q = 0;
      const area = el('div');
      caixa.append(area);
      function pergunta() {
        area.innerHTML = '';
        const p = d.perguntas[q];
        const opcoes = d.tipo === 'vf'
          ? [{ t: 'Verdadeiro', c: p.correta === true }, { t: 'Falso', c: p.correta === false }]
          : embaralhar(p.opcoes.map((t, k) => ({ t, c: k === p.correta, porque: (p.porque || [])[k] })));
        area.append(el('p', null, negrito(`${q + 1}. `), p.enunciado));
        const grade = el('div', { class: 'opcoes' });
        opcoes.forEach(o => {
          const b = el('button', { class: 'opcao', type: 'button' }, o.t);
          b.addEventListener('click', () => {
            grade.querySelectorAll('button').forEach(x => x.disabled = true);
            const certa = opcoes.find(x => x.c);
            if (o.c) {
              acertos++; b.classList.add('certo'); b.append(el('span', { class: 'marca-res' }, '✓'));
              area.append(retorno(true, [negrito('Isso mesmo. '), p.explicacao]));
            } else {
              b.classList.add('errado'); b.append(el('span', { class: 'marca-res' }, '✗'));
              grade.querySelectorAll('button').forEach((x, k) => { if (opcoes[k].c) x.classList.add('certo'); });
              if (d.tipo === 'vf') area.append(retorno(false, [negrito(`Você respondeu "${o.t}", mas a frase é ${p.correta ? 'verdadeira' : 'falsa'}. `)], p.explicacao));
              else area.append(retorno(false, [negrito(`Você marcou "${o.t}". `), o.porque || 'Essa não é a resposta desta pergunta.'], [negrito(`A certa é "${certa.t}". `), p.explicacao]));
            }
            if (q < d.perguntas.length - 1) area.append(el('div', { class: 'acoes' }, el('button', { class: 'botao vazado', type: 'button', onclick: () => { q++; pergunta(); } }, 'Próxima pergunta')));
            else botaoSeguir(area);
          });
          grade.append(b);
        });
        area.append(grade);
      }
      pergunta();
    }

    // classificar itens em categorias, um de cada vez
    function categorizar(d, caixa) {
      const itens = embaralhar(d.itens);
      let k = 0;
      const atual = el('div', { class: 'item-atual', 'aria-live': 'polite' });
      const botoes = el('div', { class: 'opcoes' });
      const cols = el('div', { class: 'categorias' });
      const destino = {};
      d.categorias.forEach(c => {
        const col = el('div', { class: 'categoria' }, el('h4', null, c));
        destino[c] = col; cols.append(col);
        botoes.append(el('button', { class: 'opcao', type: 'button', onclick: () => escolher(c) }, 'Colocar em: ' + c));
      });
      const ret = el('div');
      caixa.append(atual, botoes, ret, cols);
      function mostrar() {
        if (k >= itens.length) { atual.remove(); botoes.remove(); botaoSeguir(caixa); return; }
        atual.textContent = itens[k].texto;
      }
      function escolher(c) {
        const it = itens[k];
        const ok = c === it.categoria;
        if (ok) acertos++;
        destino[it.categoria].append(el('div', { class: 'ficha ' + (ok ? 'certo' : 'errado') }, (ok ? '✓ ' : '✗ ') + it.texto));
        ret.innerHTML = '';
        ret.append(ok ? retorno(true, [negrito('Certo. '), it.explicacao])
          : retorno(false, [negrito(`Você colocou "${it.texto}" em "${c}", mas ele vai em "${it.categoria}". `)], [negrito('Por quê? '), it.explicacao]));
        k++; mostrar();
      }
      mostrar();
    }

    // ligar pares: toque num item à esquerda e depois no par à direita
    function pareamento(d, caixa) {
      const esq = el('div', { class: 'opcoes' }), dir = el('div', { class: 'opcoes' });
      caixa.append(el('div', { class: 'pares' }, el('div', null, el('h4', null, d.colunaA), esq), el('div', null, el('h4', null, d.colunaB), dir)));
      const ret = el('div');
      caixa.append(ret);
      let sel = null, feitos = 0;
      const idx = d.pares.map((p, k) => ({ ...p, k }));
      const btA = {}, btB = {};
      embaralhar(idx).forEach(p => {
        const b = el('button', { class: 'opcao', type: 'button' }, p.a); btA[p.k] = b;
        b.onclick = () => { if (b.disabled) return; Object.values(btA).forEach(x => x.classList.remove('escolhida')); b.classList.add('escolhida'); sel = p.k; };
        esq.append(b);
      });
      embaralhar(idx).forEach(p => {
        const b = el('button', { class: 'opcao', type: 'button' }, p.b); btB[p.k] = b;
        b.onclick = () => {
          if (b.disabled) return;
          if (sel == null) { ret.innerHTML = ''; ret.append(el('div', { class: 'retorno' }, 'Primeiro toque num item da coluna da esquerda.')); return; }
          const ok = sel === p.k;
          const parCerto = d.pares[sel];
          btA[sel].classList.remove('escolhida');
          ret.innerHTML = '';
          if (ok) { acertos++; ret.append(retorno(true, [negrito('Par certo. '), parCerto.explicacao || ''])); }
          else ret.append(retorno(false, [negrito(`Você ligou "${parCerto.a}" a "${p.b}". `), `Isso combina com "${p.a}", não com "${parCerto.a}".`], [negrito(`${parCerto.a}: `), parCerto.b + '. ', parCerto.explicacao || '']));
          btA[sel].disabled = true; btB[sel].disabled = true;
          btA[sel].classList.add(ok ? 'certo' : 'errado'); btB[sel].classList.add(ok ? 'certo' : 'errado');
          sel = null; feitos++;
          if (feitos === d.pares.length) botaoSeguir(caixa);
        };
        dir.append(b);
      });
    }

    // colocar em ordem tocando nos passos; no erro, aponta qual passo e por quê
    function sequencia(d, caixa) {
      const ordem = [];
      const lista = el('ol', { class: 'ordem-lista' });
      const banco = el('div', { class: 'opcoes' });
      const ret = el('div');
      const embaralhados = embaralhar(d.itens);
      let tentativas = 0;
      caixa.append(lista, banco, ret);
      function montar(conferir) {
        lista.innerHTML = ''; banco.innerHTML = ''; ret.innerHTML = '';
        ordem.forEach((t, k) => {
          const li = el('li', null, el('span', { class: 'pos' }, k + 1), t);
          if (conferir) li.classList.add(t === d.itens[k] ? 'certo' : 'errado');
          lista.append(li);
        });
        embaralhados.filter(t => !ordem.includes(t)).forEach(t => banco.append(el('button', { class: 'opcao', type: 'button', onclick: () => { ordem.push(t); montar(ordem.length === d.itens.length); } }, t)));
        if (ordem.length === d.itens.length) {
          tentativas++;
          if (ordem.every((t, k) => t === d.itens[k])) {
            if (tentativas === 1) acertos++;
            ret.append(retorno(true, [negrito(tentativas === 1 ? 'Ordem certa de primeira. ' : 'Agora sim. '), d.feedbackOk]));
            botaoSeguir(caixa);
          } else {
            const k = ordem.findIndex((t, j) => t !== d.itens[j]);
            const certos = ordem.filter((t, j) => t === d.itens[j]).length;
            if (tentativas === 1) ret.append(el('p', { class: 'nota' }, 'O ponto deste desafio vale só se acertar de primeira, mas refaça para fixar a ordem.'));
            ret.append(retorno(false,
              [negrito(`${certos} de ${d.itens.length} no lugar certo. `), `O primeiro erro está no passo ${k + 1}: você colocou "${ordem[k]}", mas ali vem "${d.itens[k]}".`],
              [negrito('Dica: '), d.dicas[k]]),
              el('div', { class: 'acoes' }, el('button', { class: 'botao vazado', type: 'button', onclick: () => { ordem.length = 0; montar(); } }, 'Refazer a ordem')));
          }
        } else if (ordem.length) {
          ret.append(el('div', { class: 'acoes' }, el('button', { class: 'botao vazado', type: 'button', onclick: () => { ordem.pop(); montar(); } }, 'Desfazer o último')));
        }
      }
      montar();
    }

    function final() {
      const pct = Math.round(acertos / total * 100);
      const anterior = estado.carimbos[cfg.parada];
      if (!anterior || acertos >= anterior.acertos) {
        estado.carimbos[cfg.parada] = { acertos, total, pct, quando: new Date().toISOString() };
        gravar(estado);
      }
      const status = el('p', { class: 'status-envio', role: 'status' });
      const dados = {
        nome: estado.aluno.nome, matricula: 'EBD Jovens', disciplina: DISCIPLINA,
        aula: 'Lição ' + cfg.parada, atividade: 'Expedição Filipos: ' + cfg.lugar,
        acertos, total, pontuacao: pct, timestamp: new Date().toISOString(),
      };
      raiz.innerHTML = '';
      raiz.append(el('div', { class: 'placar' },
        el('div', { html: seloSVG(cfg.parada, 'selo-final') }),
        el('h3', null, 'Passaporte carimbado: ' + cfg.lugar),
        el('p', { class: 'grande' }, pct + '%'),
        el('p', null, `${estado.aluno.nome}, você acertou ${acertos} de ${total}.`),
        status,
        el('div', { class: 'acoes centro' },
          el('button', { class: 'botao vazado', type: 'button', onclick: () => enviarResultado(dados, status) }, 'Enviar de novo'),
          el('button', { class: 'botao vazado', type: 'button', onclick: () => { i = 0; acertos = 0; desenhar(); } }, 'Refazer os desafios'),
          el('a', { class: 'botao', href: 'index.html#passaporte-secao' }, 'Ver meu passaporte'))));
      enviarResultado(dados, status);
    }

    desenhar();
  }

  /* ---------- diário de bordo: marcar lido e ler o texto aqui mesmo ---------- */
  function iniciarDiario(parada) {
    const lista = $('#lista-diario');
    if (!lista) return;
    const marcados = estado.diario[parada] || [];
    lista.querySelectorAll('.dia-item').forEach((item, k) => {
      const cb = item.querySelector('input[type=checkbox]');
      cb.checked = !!marcados[k];
      cb.addEventListener('change', () => {
        const arr = estado.diario[parada] || [];
        arr[k] = cb.checked; estado.diario[parada] = arr; gravar(estado);
      });
      const bt = item.querySelector('.ler'), txt = item.querySelector('.dia-texto');
      bt.addEventListener('click', () => {
        const abrir = txt.hidden;
        txt.hidden = !abrir;
        bt.setAttribute('aria-expanded', String(abrir));
        bt.textContent = abrir ? 'Fechar' : 'Ler aqui';
      });
    });
  }

  /* ---------- cartões que viram ---------- */
  function iniciarCartoes() {
    document.querySelectorAll('.cartao').forEach(c => {
      const virar = () => { c.classList.toggle('virado'); c.setAttribute('aria-pressed', c.classList.contains('virado')); };
      c.addEventListener('click', (ev) => { if (!ev.target.closest('a')) virar(); });
      c.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && !ev.target.closest('a')) { ev.preventDefault(); virar(); } });
    });
  }

  /* ---------- vídeos: só carregam o YouTube quando o aluno toca ---------- */
  function iniciarVideos() {
    document.querySelectorAll('.video[data-yt]').forEach(v => {
      const id = v.dataset.yt;
      const titulo = (v.dataset.titulo || 'Vídeo').replace(/"/g, '');
      const capa = el('button', { class: 'video-capa', type: 'button', 'aria-label': 'Assistir: ' + titulo }, el('span', null, '▶ Assistir'));
      capa.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
      capa.onclick = () => { v.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${titulo}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`; };
      v.append(capa);
    });
  }

  /* ---------- menu do site e saída da conta ---------- */
  function montarMenu() {
    const botao = $('#abrirMenu'), painel = $('#menuSite'), fundo = $('#menuFundo');
    if (!botao || !painel) return;
    const abrir = () => { pintarConta(); marcarParadas(); painel.hidden = false; fundo.hidden = false; botao.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-aberto'); const f = $('#fecharMenu'); if (f) f.focus(); };
    const fechar = () => { painel.hidden = true; fundo.hidden = true; botao.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-aberto'); botao.focus(); };
    botao.addEventListener('click', abrir);
    fundo.addEventListener('click', fechar);
    $('#fecharMenu').addEventListener('click', fechar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !painel.hidden) fechar(); });
    painel.addEventListener('click', (e) => { if (e.target.closest('a')) { painel.hidden = true; fundo.hidden = true; botao.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-aberto'); } });
  }
  function marcarParadas() {
    document.querySelectorAll('.menu-paradas a[data-n]').forEach(a => a.classList.toggle('feito', !!estado.carimbos[a.dataset.n]));
  }
  function pintarConta() {
    const box = $('#menuConta'); if (!box) return;
    box.innerHTML = '';
    const n = Object.keys(estado.carimbos).length;
    if (estado.aluno) {
      box.append(el('p', null, 'Você está como ', el('b', null, estado.aluno.nome)));
      box.append(el('p', { class: 'menu-sub' }, `${n} de 13 carimbos neste aparelho.`));
      const sair = el('button', { class: 'botao', type: 'button' }, 'Sair');
      sair.addEventListener('click', () => {
        delete estado.aluno; gravar(estado); atualizarViajante();
        if ($('#expedicao')) { location.reload(); return; }
        pintarConta();
        box.prepend(el('p', { class: 'menu-aviso', role: 'status' }, 'Você saiu. O nome será pedido de novo nos próximos desafios.'));
      });
      const apagar = el('button', { class: 'menu-apagar', type: 'button' }, 'Sair e apagar meus carimbos deste aparelho');
      let confirmar = false;
      apagar.addEventListener('click', () => {
        if (!confirmar) { confirmar = true; apagar.textContent = 'Tem certeza? Toque de novo para apagar'; apagar.classList.add('confirmar'); return; }
        try { localStorage.removeItem(CHAVE); } catch (e) { /* ok */ }
        location.reload();
      });
      box.append(el('div', { class: 'menu-acoes' }, sair, apagar));
      box.append(el('p', { class: 'menu-sub' }, 'Ao sair, seus carimbos continuam salvos neste aparelho. Use a segunda opção se o aparelho for de outra pessoa.'));
    } else {
      box.append(el('p', null, 'Você ainda não se identificou.'));
      box.append(el('p', { class: 'menu-sub' }, n ? `${n} de 13 carimbos neste aparelho. O nome é pedido na hora dos desafios.` : 'O nome é pedido na hora dos desafios de cada parada.'));
    }
  }

  function iniciar() {
    montarTema();
    montarMenu();
    const fl = $('.voltar-flutuante');
    if (fl) { const ver = () => fl.classList.toggle('visivel', window.scrollY > 600); window.addEventListener('scroll', ver, { passive: true }); ver(); }
    atualizarViajante();
    const m = $('#mapa'); if (m) animarMapa(m);
    renderPassaporte($('#passaporte'));
    iniciarVideos();
    iniciarCartoes();
  }

  window.Expedicao = { iniciar, iniciarExpedicao, iniciarDiario, mapa: animarMapa };
})();
