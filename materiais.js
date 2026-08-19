/* Materiais didáticos.
   Toda a lista vem de materiais.json. Para publicar um material novo,
   basta acrescentar um item lá e subir o PDF. Este arquivo não precisa mudar. */
(function () {
  "use strict";

  var TIPOS = ["Todos", "Cronograma", "Aula", "Roteiro", "Apoio"];
  var estado = { tipo: "Todos", busca: "" };
  var dados = null;

  var elLista = document.getElementById("listaMateriais");
  var elFiltros = document.getElementById("tipoFiltros");
  var elBusca = document.getElementById("materialSearch");
  var elVazio = document.getElementById("semResultado");
  var elErro = document.getElementById("erroCarga");
  var elAtualizado = document.getElementById("ultimaAtualizacao");

  if (!elLista) return;

  function texto(v) {
    return (v === null || v === undefined) ? "" : String(v);
  }

  function semAcento(s) {
    return texto(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function criar(tag, classe, conteudo) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (conteudo !== undefined) el.textContent = conteudo;
    return el;
  }

  function classeTag(tipo) {
    var t = semAcento(tipo);
    if (t.indexOf("aula") === 0) return "tag tag-aula";
    if (t.indexOf("roteiro") === 0) return "tag tag-roteiro";
    if (t.indexOf("cronograma") === 0) return "tag tag-cronograma";
    return "tag tag-apoio";
  }

  function montarCard(material) {
    var card = criar("article", "material-card");
    card.dataset.tipo = texto(material.tipo);
    card.dataset.busca = semAcento(
      [material.titulo, material.descricao, material.tipo, material.tags].join(" ")
    );

    var topo = criar("div", "material-top");
    topo.appendChild(criar("span", classeTag(material.tipo), texto(material.tipo)));
    if (material.data) topo.appendChild(criar("span", "material-date", texto(material.data)));
    card.appendChild(topo);

    card.appendChild(criar("h3", null, texto(material.titulo)));
    if (material.descricao) card.appendChild(criar("p", null, texto(material.descricao)));

    var acoes = criar("div", "material-actions");

    var abrir = criar("a", "strong", "Abrir PDF");
    abrir.href = texto(material.arquivo);
    abrir.target = "_blank";
    abrir.rel = "noreferrer";
    acoes.appendChild(abrir);

    var baixar = criar("a", null, "Baixar");
    baixar.href = texto(material.arquivo);
    baixar.setAttribute("download", "");
    acoes.appendChild(baixar);

    if (material.extra && material.extra.url) {
      var extra = criar("a", null, texto(material.extra.rotulo || "Ver mais"));
      extra.href = material.extra.url;
      extra.target = "_blank";
      extra.rel = "noreferrer";
      acoes.appendChild(extra);
    }

    card.appendChild(acoes);
    return card;
  }

  function montarDisciplina(disciplina) {
    var bloco = criar("section", "discipline");
    bloco.id = texto(disciplina.id);

    var head = criar("div", "discipline-head");
    head.appendChild(criar("h2", null, texto(disciplina.nome)));

    var metaPartes = [disciplina.periodo, disciplina.dia, disciplina.instituicao].filter(Boolean);
    if (metaPartes.length) head.appendChild(criar("p", "discipline-meta", metaPartes.join("  ·  ")));
    bloco.appendChild(head);

    if (disciplina.resumo) bloco.appendChild(criar("p", "discipline-lead", texto(disciplina.resumo)));

    var grid = criar("div", "material-grid");
    (disciplina.materiais || []).forEach(function (m) {
      grid.appendChild(montarCard(m));
    });
    bloco.appendChild(grid);
    return bloco;
  }

  function aplicarFiltros() {
    var alvo = semAcento(estado.busca);
    var tipoAlvo = semAcento(estado.tipo);
    var visiveisTotal = 0;

    var blocos = elLista.querySelectorAll(".discipline");
    Array.prototype.forEach.call(blocos, function (bloco) {
      var visiveis = 0;
      var cards = bloco.querySelectorAll(".material-card");
      Array.prototype.forEach.call(cards, function (card) {
        var casaTipo = tipoAlvo === "todos" || semAcento(card.dataset.tipo) === tipoAlvo;
        var casaBusca = !alvo || card.dataset.busca.indexOf(alvo) !== -1;
        var mostrar = casaTipo && casaBusca;
        card.hidden = !mostrar;
        if (mostrar) visiveis++;
      });
      bloco.hidden = visiveis === 0;
      visiveisTotal += visiveis;
    });

    if (elVazio) elVazio.hidden = visiveisTotal > 0;
  }

  function montarFiltros() {
    if (!elFiltros) return;
    TIPOS.forEach(function (tipo) {
      var botao = criar("button", "chip", tipo);
      botao.type = "button";
      botao.setAttribute("aria-pressed", tipo === estado.tipo ? "true" : "false");
      botao.addEventListener("click", function () {
        estado.tipo = tipo;
        Array.prototype.forEach.call(elFiltros.querySelectorAll(".chip"), function (b) {
          b.setAttribute("aria-pressed", b === botao ? "true" : "false");
        });
        aplicarFiltros();
      });
      elFiltros.appendChild(botao);
    });
  }

  function renderizar() {
    elLista.innerHTML = "";
    (dados.disciplinas || []).forEach(function (d) {
      elLista.appendChild(montarDisciplina(d));
    });

    if (elAtualizado && dados.atualizado) {
      elAtualizado.textContent = "Última atualização: " + dados.atualizado + ".";
    }

    montarFiltros();
    aplicarFiltros();
  }

  if (elBusca) {
    elBusca.addEventListener("input", function (e) {
      estado.busca = e.target.value || "";
      aplicarFiltros();
    });
  }

  if (window.__MATERIAIS__) {
    dados = window.__MATERIAIS__;
    renderizar();
    return;
  }

  fetch("materiais.json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (json) {
      dados = json;
      renderizar();
    })
    .catch(function (erro) {
      if (elErro) elErro.hidden = false;
      if (elVazio) elVazio.hidden = true;
      console.error("Falha ao carregar materiais.json:", erro);
    });
})();
