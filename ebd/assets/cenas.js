/* Cenas e ícones animados em SVG, desenhados por código (sem imagens externas) */
(function () {
  'use strict';
  const C = {
    ceu1: '#F8E3BC', ceu2: '#F2B47E', sol: '#F39A4A', longe: '#B4BCA6', monte: '#80977F', colina: '#62806A',
    terra: '#D8C397', areia: '#E8D6AA', pedra: '#F1E8D5', sombra: '#CDBB98', telha: '#B5543C', mar: '#2E6D84',
    mar2: '#3E8AA1', espuma: '#DCEEEF', vela: '#5E1F4F', casco: '#6B3F2A', tinta: '#2B2633', noite: '#22344A',
  };
  let seq = 0;

  // ondas: arcos repetidos que deslizam para a esquerda
  function ondas(y, largura, cor, classe, opac) {
    let d = '';
    for (let x = -40; x < largura + 120; x += 40) d += `M${x} ${y} q10 -6 20 0 q10 6 20 0 `;
    return `<path class="a-onda ${classe || ''}" d="${d}" fill="none" stroke="${cor}" stroke-width="2.4" stroke-linecap="round" opacity="${opac || 1}"/>`;
  }

  function barco(escala) {
    const s = escala || 1;
    return `<g transform="scale(${s})"><g class="a-boia">
      <path d="M-62 0 L62 0 L48 22 L-46 22 Z" fill="${C.casco}"/>
      <path d="M-62 0 L62 0 L58 6 L-58 6 Z" fill="#8A5638"/>
      <circle cx="-30" cy="-6" r="5" fill="${C.tinta}"/><circle cx="-16" cy="-6" r="5" fill="#4A3A2E"/>
      <circle cx="18" cy="-6" r="5" fill="${C.tinta}"/><circle cx="32" cy="-6" r="5" fill="#4A3A2E"/>
      <rect x="-2" y="-92" width="4" height="92" fill="${C.tinta}"/>
      <path d="M2 -86 Q40 -60 34 -14 L2 -14 Z" fill="${C.vela}"/>
      <path d="M-2 -80 Q-34 -56 -30 -18 L-2 -18 Z" fill="#7E3369"/>
      <g transform="translate(2,-92)"><path class="a-bandeira" d="M0 0 L18 4 L0 9 Z" fill="${C.sol}"/></g>
    </g></g>`;
  }

  function cidadeNoMonte() {
    // Filipos no alto: muralha, casas, templo e colunas
    return `<g>
      <path d="M150 182 L300 182 L300 170 L290 170 L290 164 L280 164 L280 170 L170 170 L170 164 L160 164 L160 170 L150 170 Z" fill="${C.sombra}"/>
      <rect x="168" y="150" width="22" height="20" fill="${C.pedra}"/><path d="M165 150 L179 140 L193 150 Z" fill="${C.telha}"/>
      <rect x="196" y="156" width="18" height="14" fill="${C.pedra}"/><path d="M193 156 L205 148 L217 156 Z" fill="${C.telha}"/>
      <rect x="252" y="152" width="24" height="18" fill="${C.pedra}"/><path d="M249 152 L264 142 L279 152 Z" fill="${C.telha}"/>
      <path d="M216 128 L240 116 L264 128 Z" fill="${C.pedra}"/>
      <rect x="218" y="128" width="44" height="4" fill="${C.pedra}"/>
      <rect x="221" y="132" width="4" height="22" fill="${C.pedra}"/><rect x="230" y="132" width="4" height="22" fill="${C.pedra}"/>
      <rect x="239" y="132" width="4" height="22" fill="${C.pedra}"/><rect x="248" y="132" width="4" height="22" fill="${C.pedra}"/>
      <rect x="257" y="132" width="4" height="22" fill="${C.pedra}"/>
      <rect x="216" y="154" width="48" height="16" fill="${C.pedra}"/>
    </g>`;
  }

  /* cena grande: modo 'chegada' (barco chega e para) ou 'panorama' (barco atravessa sem parar) */
  function cena(modo) {
    const id = 'c' + (++seq);
    const panorama = modo === 'panorama';
    const W = 960, H = 400;
    const nuvem = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="0" cy="0" rx="46" ry="14" fill="#FFF6E6"/><ellipse cx="-18" cy="-10" rx="22" ry="14" fill="#FFF6E6"/><ellipse cx="14" cy="-12" rx="26" ry="16" fill="#FFF6E6"/></g>`;
    const ave = (x, y, d) => `<g transform="translate(${x},${y})"><g class="a-ave" style="animation-delay:${d}s"><g class="a-asa"><path d="M0 0 q6 -7 12 0 q6 -7 12 0" fill="none" stroke="${C.tinta}" stroke-width="2" stroke-linecap="round"/></g></g></g>`;
    const casas = [[300, 268, 30, 26], [336, 274, 24, 20], [366, 262, 34, 32], [406, 276, 26, 18], [438, 270, 22, 24]]
      .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.pedra}"/><path d="M${x - 3} ${y} L${x + w / 2} ${y - 11} L${x + w + 3} ${y} Z" fill="${C.telha}"/><rect x="${x + w / 2 - 3}" y="${y + h - 10}" width="6" height="10" fill="${C.sombra}"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}t">
      <title id="${id}t">${panorama ? 'Ilustração animada: um barco atravessa o mar Egeu rumo a Neápolis, com Filipos no alto do monte.' : 'Ilustração animada: o barco de Paulo chega ao porto de Neápolis e a estrada sobe até Filipos.'}</title>
      <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ceu2}"/><stop offset=".75" stop-color="${C.ceu1}"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#${id}g)"/>
      <g class="a-sol"><circle cx="740" cy="128" r="70" fill="#F7C58A" opacity=".5"/><circle cx="740" cy="128" r="46" fill="${C.sol}"/></g>
      <g class="a-nuvem">${nuvem(220, 70, 1)}${nuvem(560, 52, .8)}${nuvem(980, 80, 1.1)}${nuvem(1320, 60, .9)}${nuvem(1580, 74, 1)}</g>
      <path d="M0 214 L110 128 L200 176 L330 96 L470 196 L560 160 L700 222 L960 206 L960 280 L0 280Z" fill="${C.longe}"/>
      <rect x="0" y="250" width="${W}" height="150" fill="${C.mar}"/>
      <rect x="0" y="250" width="${W}" height="18" fill="${C.mar2}"/>
      ${panorama ? `<path d="M760 262 Q800 222 836 238 Q870 226 900 262 Z" fill="${C.monte}"/><text x="830" y="282" font-family="Cinzel,serif" font-size="13" fill="${C.espuma}" text-anchor="middle">Samotrácia</text>` : ''}
      <path d="M0 262 Q110 150 250 168 Q360 182 440 262 Z" fill="${C.monte}"/>
      <path d="M0 270 Q90 200 180 214 Q240 224 300 270 Z" fill="${C.colina}"/>
      ${cidadeNoMonte()}
      <path d="M0 300 Q210 262 440 282 Q500 296 540 330 L540 400 L0 400Z" fill="${C.terra}"/>
      <path d="M0 330 Q240 300 520 340 L540 400 L0 400Z" fill="${C.areia}"/>
      ${casas}
      <rect x="470" y="318" width="150" height="10" rx="3" fill="${C.pedra}"/>
      <rect x="606" y="292" width="14" height="28" fill="${C.pedra}"/><rect x="603" y="286" width="20" height="8" fill="${C.telha}"/>
      <path class="${panorama ? '' : 'a-traco'}" d="M384 300 C 360 270 330 262 300 246 S 250 214 240 172" fill="none" stroke="#FBF3E2" stroke-width="5" stroke-linecap="round" stroke-dasharray="${panorama ? '10 8' : ''}"/>
      <g class="${panorama ? '' : 'a-surgir'}">
        <text x="236" y="106" font-family="Cinzel,serif" font-weight="700" font-size="22" fill="${C.vela}" text-anchor="middle">Filipos</text>
        <text x="372" y="352" font-family="Cinzel,serif" font-weight="700" font-size="17" fill="${C.tinta}" text-anchor="middle">Neápolis</text>
        <text x="318" y="232" font-family="Atkinson Hyperlegible,sans-serif" font-size="13" fill="${C.tinta}" transform="rotate(-38 318 232)">Via Egnatia</text>
      </g>
      <g opacity=".85">${ondas(296, W, C.espuma, '', .9)}</g>
      <g opacity=".6">${ondas(330, W, C.espuma, 'lenta', .8)}</g>
      <g transform="translate(${panorama ? 1000 : 700},334)"><g class="${panorama ? 'a-travessia' : 'a-chegada'}">${barco(1)}</g></g>
      <g opacity=".7">${ondas(372, W, C.espuma, '', .9)}</g>
      ${ave(980, 120, 0)}${ave(1010, 140, 2.5)}${ave(1050, 100, 6)}
    </svg>`;
  }

  /* ícones das 13 paradas, 120x80, cada um com um detalhe que se mexe */
  const fundo = (cor) => `<rect width="120" height="80" fill="${cor || C.ceu1}"/>`;
  const chao = (cor, y) => `<rect y="${y || 62}" width="120" height="${80 - (y || 62)}" fill="${cor || C.terra}"/>`;
  const ICONES = {
    1: () => fundo() + `<circle cx="96" cy="20" r="10" fill="${C.sol}"/><rect y="50" width="120" height="30" fill="${C.mar}"/><g opacity=".9">${ondas(60, 120, C.espuma)}</g><g transform="translate(56,52)">${barco(.42)}</g><g opacity=".8">${ondas(72, 120, C.espuma, 'lenta')}</g>`,
    2: () => fundo() + chao() + `<path d="M30 62 L30 26 L90 26 L90 62 L74 62 L74 44 Q60 30 46 44 L46 62 Z" fill="${C.pedra}"/><rect x="26" y="20" width="68" height="8" fill="${C.sombra}"/><rect x="59" y="4" width="2" height="18" fill="${C.tinta}"/><g transform="translate(61,5)"><path class="a-bandeira" d="M0 0 L20 4 L0 9 Z" fill="${C.vela}"/></g>`,
    3: () => fundo() + `<circle class="a-brilho" cx="60" cy="34" r="30" fill="#FFE2A8"/>` + chao() + `<path d="M28 24 L60 10 L92 24 Z" fill="${C.pedra}"/><rect x="28" y="24" width="64" height="5" fill="${C.sombra}"/>${[34, 48, 62, 76].map(x => `<rect x="${x}" y="29" width="7" height="30" fill="${C.pedra}"/>`).join('')}<rect x="24" y="58" width="72" height="5" fill="${C.sombra}"/>`,
    4: () => fundo(C.noite) + `${[[14, 14, ''], [40, 8, 'd2'], [70, 16, 'd3'], [100, 10, ''], [86, 26, 'd2'], [24, 30, 'd3']].map(([x, y, d]) => `<circle class="a-pisca ${d}" cx="${x}" cy="${y}" r="1.8" fill="#FFF3C8"/>`).join('')}<circle cx="100" cy="24" r="7" fill="#F3E7C2"/><path d="M0 80 L0 60 Q40 34 70 40 Q100 46 120 62 L120 80 Z" fill="#3E5A55"/><path d="M48 38 L62 30 L76 38 Z" fill="${C.pedra}"/><rect x="49" y="38" width="26" height="12" fill="${C.pedra}"/><rect x="58" y="42" width="6" height="8" fill="#F7C873"/>`,
    5: () => fundo() + chao(C.colina, 44) + `<path d="M48 44 L72 44 L110 80 L10 80 Z" fill="#E9DCC0"/><path d="M60 46 L60 52 M60 58 L60 66 M60 72 L60 80" stroke="${C.sombra}" stroke-width="3"/><g transform="translate(0,56)"><g class="a-anda"><circle cx="0" cy="-10" r="4" fill="${C.tinta}"/><rect x="-3" y="-6" width="6" height="12" rx="2" fill="${C.vela}"/></g></g>`,
    6: () => fundo() + chao() + `<path d="M10 62 L10 30 L20 30 L20 24 L30 24 L30 30 L44 30 L44 24 L54 24 L54 30 L68 30 L68 24 L78 24 L78 30 L92 30 L92 24 L102 24 L102 30 L110 30 L110 62 Z" fill="${C.pedra}"/><path d="M10 44 L110 44 M40 30 L40 62 M80 30 L80 62" stroke="${C.sombra}" stroke-width="1.5"/><rect x="58" y="14" width="3" height="14" fill="${C.casco}"/><g transform="translate(59.5,15)"><path class="a-chama" d="M0 0 C -6 -6 -2 -12 0 -16 C 2 -12 6 -6 0 0 Z" fill="${C.sol}"/></g>`,
    7: () => fundo() + `<rect y="40" width="120" height="40" fill="#C9875F"/><path d="M0 50 L120 50 M0 60 L120 60 M0 70 L120 70" stroke="#F4E3CF" stroke-width="1.5"/><rect x="100" y="40" width="3" height="40" fill="#fff"/><g transform="translate(-20,52)"><g class="a-corre"><circle cx="0" cy="-16" r="4.5" fill="${C.tinta}"/><path d="M0 -12 L0 -2 M0 -9 L-6 -4 M0 -9 L6 -12 M0 -2 L-6 6 M0 -2 L6 4" stroke="${C.tinta}" stroke-width="3" stroke-linecap="round"/></g></g>`,
    8: () => fundo() + chao(C.colina, 34) + `<path d="M0 50 Q30 40 60 50 T120 48 L120 66 Q90 60 60 68 T0 64 Z" fill="${C.mar2}"/><g opacity=".9">${ondas(56, 120, C.espuma, 'lenta')}</g>${[12, 18, 100, 106].map(x => `<path d="M${x} 46 L${x} 32" stroke="#4E6B3E" stroke-width="2"/>`).join('')}<g transform="translate(78,40)"><circle cx="0" cy="-12" r="4" fill="${C.tinta}"/><path d="M-6 6 L0 -8 L6 6 Z" fill="${C.vela}"/></g>`,
    9: () => fundo('#3A3340') + `<rect x="14" y="14" width="92" height="56" fill="#2A2430"/>${[24, 40, 56, 72, 88].map(x => `<rect x="${x}" y="14" width="4" height="56" fill="#8A8F99"/>`).join('')}<rect x="14" y="12" width="92" height="5" fill="#8A8F99"/><rect x="14" y="68" width="92" height="5" fill="#8A8F99"/><text class="a-sobe" x="34" y="56" font-size="16" fill="#F7C873">♪</text><text class="a-sobe d2" x="62" y="60" font-size="14" fill="#F7C873">♫</text><text class="a-sobe d3" x="82" y="54" font-size="16" fill="#F7C873">♪</text>`,
    10: () => fundo() + chao() + `<g transform="translate(36,62)"><circle cx="0" cy="-26" r="6" fill="${C.tinta}"/><path d="M-9 0 L0 -20 L9 0 Z" fill="${C.egeu || '#1F4E6B'}"/></g><g transform="translate(84,62)"><circle cx="0" cy="-26" r="6" fill="#4A3A2E"/><path d="M-9 0 L0 -20 L9 0 Z" fill="${C.vela}"/></g><g class="a-fala"><rect x="10" y="6" width="38" height="18" rx="7" fill="#fff"/><path d="M30 24 L34 30 L36 24" fill="#fff"/><path d="M16 15 L42 15" stroke="${C.sombra}" stroke-width="2"/></g><g class="a-fala d2"><rect x="70" y="6" width="38" height="18" rx="7" fill="#fff"/><path d="M84 24 L82 30 L90 24" fill="#fff"/><path d="M76 15 L102 15" stroke="${C.sombra}" stroke-width="2"/></g>`,
    11: () => fundo() + `<rect x="0" y="0" width="120" height="14" fill="${C.telha}"/>${[0, 20, 40, 60, 80, 100].map(x => `<path d="M${x} 14 q10 8 20 0" fill="${C.pedra}"/>`).join('')}` + chao() + `<rect x="58" y="22" width="4" height="40" fill="${C.casco}"/><rect x="48" y="60" width="24" height="4" fill="${C.casco}"/><g transform="translate(60,24)"><g class="a-balanca"><rect x="-30" y="-1" width="60" height="3" fill="${C.casco}"/><path d="M-28 2 L-34 18 M-28 2 L-22 18 M28 2 L22 18 M28 2 L34 18" stroke="${C.casco}" stroke-width="1.2"/><path d="M-38 18 L-18 18 Q-28 26 -38 18Z" fill="${C.sol}"/><path d="M18 18 L38 18 Q28 26 18 18Z" fill="${C.sol}"/><circle cx="-28" cy="15" r="3" fill="#E9C46A"/></g></g>`,
    12: () => fundo() + chao() + `<rect x="24" y="30" width="72" height="32" fill="${C.pedra}"/><path d="M18 30 L60 8 L102 30 Z" fill="${C.telha}"/><rect x="54" y="44" width="12" height="18" fill="${C.casco}"/><path d="M30 34 L50 34" stroke="${C.tinta}" stroke-width="1.5"/><g transform="translate(32,34)"><path class="a-pende" d="M0 0 L16 0 L16 18 Q8 22 0 18 Z" fill="${C.vela}"/></g><rect x="74" y="38" width="14" height="10" fill="#F7C873"/>`,
    13: () => fundo() + `<g transform="translate(60,32)"><g class="a-gira">${[0, 30, 60, 90, 120, 150].map(a => `<rect x="-1.5" y="-46" width="3" height="92" fill="#FFE2A8" transform="rotate(${a})"/>`).join('')}</g></g>` + chao() + `<path d="M26 62 L26 34 L60 18 L94 34 L94 62 Z" fill="${C.pedra}"/><path d="M50 62 L50 44 Q60 36 70 44 L70 62 Z" fill="${C.sombra}"/><rect x="58" y="6" width="4" height="14" fill="${C.casco}"/><rect x="54" y="10" width="12" height="4" fill="${C.casco}"/>`,
  };
  function icone(n) {
    const f = ICONES[n];
    return f ? `<svg viewBox="0 0 120 80" aria-hidden="true">${f()}</svg>` : '';
  }

  window.Cenas = { cena, icone };
})();
