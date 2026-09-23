/* Editor do blog de sebastrogers.github.io
 *
 * Publica direto no repositório via API do GitHub, sem git local:
 *   posts/<slug>.html          página do post, no mesmo modelo dos posts atuais
 *   blog.html                  lista do blog (ordenada por data)
 *   index.html                 bloco "Textos recentes" (3 mais novos)
 *   _editor/posts/<slug>.md    texto-fonte em Markdown (o GitHub Pages ignora pastas com "_")
 *   assets/blog/<slug>/...     imagens e vídeos enviados
 * Tudo sai em um único commit.
 */
(() => {
  "use strict";

  const CFG = {
    owner: "sebastrogers",
    repo: "sebastrogers.github.io",
    branch: "main",
    site: "https://sebastrogers.github.io",
    srcDir: "_editor/posts",
    assetDir: "assets/blog",
    api: "https://api.github.com",
  };
  const MESES = ["jan", "fev", "mar", "abr", "maio", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const TOKEN_KEY = "sr-editor-token";
  const LOCAL_KEY = "sr-editor-local:";

  // CSS do conteúdo do post: vai embutido em cada post publicado e também na pré-visualização.
  const POST_CSS = `
      .post-header { text-align: center; }
      .post-header h1 { max-width: none; font-size: clamp(2.2rem, 5vw, 3.4rem); line-height: 1.1; margin: 14px auto 0; text-wrap: balance; }
      .post-content h2 { margin: 18px 0 0; font-size: 1.75rem; line-height: 1.2; color: var(--ink); }
      .post-content h3 { margin: 18px 0 0; font-size: 1.45rem; line-height: 1.25; color: var(--ink); }
      .post-content h4 { margin: 12px 0 0; font-size: 1.15rem; color: var(--ink); }
      .post-content a { color: var(--teal-dark); text-decoration: underline; text-underline-offset: 3px; }
      .post-content a.button { text-decoration: none; }
      .post-content a.button.primary { color: var(--bg); }
      .post-content ol { margin: 0; }
      .post-content strong { color: var(--ink); }
      .post-content hr { width: 100%; border: 0; border-top: 1px solid var(--line); margin: 8px 0; }
      .post-content code { padding: 2px 6px; border-radius: 5px; background: var(--surface); border: 1px solid var(--line); font-size: 0.88em; }
      .post-content pre { margin: 0; padding: 16px 18px; overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); font-size: 0.9rem; line-height: 1.55; }
      .post-content pre code { padding: 0; border: 0; background: none; font-size: inherit; }
      .post-content table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
      .post-content th, .post-content td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; }
      .post-content th { color: var(--ink); }
      .post-figure, .post-video { margin: 8px 0 0; }
      .post-figure img { width: 100%; height: auto; border: 1px solid var(--line); border-radius: var(--radius); }
      .post-video video, .post-video iframe { display: block; width: 100%; aspect-ratio: 16 / 9; background: #111820; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
      .post-figure figcaption, .post-video figcaption { margin-top: 10px; color: var(--muted); font-size: 0.94rem; font-weight: 700; }
      .post-actions { display: flex; flex-wrap: wrap; gap: 12px; }
      .post-note { padding: 14px 18px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); font-size: 0.98rem; }
      .post-ref { padding-top: 22px; border-top: 1px solid var(--line); font-size: 0.92rem; }`;

  // ---------------------------------------------------------------- estado
  let token = null;
  let posts = []; // {slug,title,category,date,summary,cover,published,draft}
  const cur = {
    slug: null, // slug já existente no repositório (null = post novo)
    published: false,
    legacy: false,
    thumbNum: null,
    cover: "", // caminho relativo à raiz: assets/blog/...
    slugTouched: false,
  };
  const pending = new Map(); // caminho na raiz -> {blob, url}
  let busy = false;

  // ---------------------------------------------------------------- utilidades
  const $ = (s) => document.querySelector(s);
  const el = {
    login: $("#login"), app: $("#app"), tokenInput: $("#tokenInput"), remember: $("#rememberInput"),
    loginButton: $("#loginButton"), loginError: $("#loginError"), status: $("#status"),
    draftButton: $("#draftButton"), publishButton: $("#publishButton"), themeButton: $("#themeButton"),
    logoutButton: $("#logoutButton"), newButton: $("#newButton"), sidebar: $("#sidebar"),
    toggleSidebar: $("#toggleSidebar"), publishedList: $("#publishedList"), draftList: $("#draftList"),
    notice: $("#notice"), title: $("#fTitle"), category: $("#fCategory"), categoryList: $("#categoryList"),
    date: $("#fDate"), slug: $("#fSlug"), slugHint: $("#slugHint"), summary: $("#fSummary"),
    coverImg: $("#coverImg"), coverButton: $("#coverButton"), coverRemove: $("#coverRemove"),
    coverInput: $("#coverInput"), body: $("#fBody"), toolbar: $("#toolbar"), mediaInput: $("#mediaInput"),
    counter: $("#counter"), pMeta: $("#pMeta"), pTitle: $("#pTitle"), pBody: $("#pBody"),
    panes: document.querySelector(".panes"), removeButton: $("#removeButton"),
  };

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const unesc = (s) => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };

  function slugify(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
  }
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  function fmtDate(iso) { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MESES[m - 1]} ${y}`; }
  function parsePtDate(s) {
    const m = String(s).trim().match(/^(\d{1,2})\s+([a-zç]+)\.?\s+(\d{4})$/i);
    if (!m) return null;
    const mes = m[2].toLowerCase().slice(0, 3);
    const i = MESES.findIndex((x) => x.slice(0, 3) === mes);
    if (i < 0) return null;
    return `${m[3]}-${String(i + 1).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  const words = (md) => (md.replace(/<[^>]+>/g, " ").replace(/[#*_>`\[\]()!-]/g, " ").match(/\S+/g) || []).length;
  const readMin = (md) => Math.max(1, Math.round(words(md) / 200));

  function b64ToText(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  function blobToB64(blob) {
    return new Promise((ok, fail) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(",")[1]);
      r.onerror = fail;
      r.readAsDataURL(blob);
    });
  }

  function setStatus(text, kind = "") { el.status.textContent = text; el.status.className = "status " + kind; }
  function showNotice(html, kind = "") {
    if (!html) { el.notice.hidden = true; return; }
    el.notice.innerHTML = html; el.notice.className = "notice " + kind; el.notice.hidden = false;
  }

  // ---------------------------------------------------------------- GitHub
  async function gh(path, opts = {}) {
    const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
    if (opts.body) headers["Content-Type"] = "application/json";
    const res = await fetch(CFG.api + path, { ...opts, headers, cache: "no-store" });
    if (!res.ok) {
      let msg = ""; try { msg = (await res.json()).message; } catch (_) {}
      const e = new Error(`GitHub ${res.status}${msg ? ": " + msg : ""}`);
      e.status = res.status; throw e;
    }
    return res.status === 204 ? null : res.json();
  }
  const repoPath = (p) => `/repos/${CFG.owner}/${CFG.repo}${p}`;
  const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");

  async function getText(path) {
    try {
      const j = await gh(repoPath(`/contents/${encPath(path)}?ref=${CFG.branch}`));
      if (j.content !== undefined && j.encoding === "base64") return b64ToText(j.content);
      const blob = await gh(repoPath(`/git/blobs/${j.sha}`)); // arquivos > 1 MB
      return b64ToText(blob.content);
    } catch (e) { if (e.status === 404) return null; throw e; }
  }
  async function listDir(path) {
    try { return await gh(repoPath(`/contents/${encPath(path)}?ref=${CFG.branch}`)); }
    catch (e) { if (e.status === 404) return []; throw e; }
  }

  /** files: [{path, text}] ou [{path, blob}] — grava tudo em um commit. */
  async function commitFiles(files, message) {
    const ref = await gh(repoPath(`/git/ref/heads/${CFG.branch}`));
    const head = ref.object.sha;
    const commit = await gh(repoPath(`/git/commits/${head}`));
    const tree = [];
    for (const f of files) {
      if (f.remove) {
        tree.push({ path: f.path, mode: "100644", type: "blob", sha: null });
      } else if (f.blob) {
        setStatus(`Enviando ${f.path.split("/").pop()}…`);
        const b = await gh(repoPath("/git/blobs"), { method: "POST", body: JSON.stringify({ content: await blobToB64(f.blob), encoding: "base64" }) });
        tree.push({ path: f.path, mode: "100644", type: "blob", sha: b.sha });
      } else {
        tree.push({ path: f.path, mode: "100644", type: "blob", content: f.text });
      }
    }
    setStatus("Gravando commit…");
    const newTree = await gh(repoPath("/git/trees"), { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
    const newCommit = await gh(repoPath("/git/commits"), { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [head] }) });
    await gh(repoPath(`/git/refs/heads/${CFG.branch}`), { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha, force: false }) });
    return newCommit.sha;
  }

  // ---------------------------------------------------------------- fonte .md
  function buildSource(m, md) {
    const fm = { titulo: m.title, categoria: m.category, data: m.date, resumo: m.summary, capa: m.cover || "", rascunho: !!m.draft };
    if (m.thumbNum) fm.numero = m.thumbNum;
    const lines = Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
    return `---\n${lines.join("\n")}\n---\n\n${md.trim()}\n`;
  }
  function parseSource(text) {
    const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) return { meta: {}, md: text };
    const meta = {};
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":"); if (i < 0) continue;
      const k = line.slice(0, i).trim(); const raw = line.slice(i + 1).trim();
      try { meta[k] = JSON.parse(raw); } catch (_) { meta[k] = raw; }
    }
    return { meta, md: m[2].replace(/^\n+/, "") };
  }

  // ---------------------------------------------------------------- markdown -> HTML
  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  function renderBody(md, { preview = false } = {}) {
    const html = window.marked ? marked.parse(md) : `<pre>${esc(md)}</pre>`;
    const box = document.createElement("div");
    box.innerHTML = html;
    // parágrafo só com imagem -> <figure> com legenda (título da imagem)
    box.querySelectorAll("p").forEach((p) => {
      const kids = [...p.childNodes].filter((n) => !(n.nodeType === 3 && !n.textContent.trim()));
      if (kids.length === 1 && kids[0].nodeName === "IMG") {
        const img = kids[0];
        const fig = document.createElement("figure"); fig.className = "post-figure";
        img.setAttribute("loading", "lazy");
        fig.appendChild(img);
        const cap = img.getAttribute("title");
        if (cap) { img.removeAttribute("title"); const fc = document.createElement("figcaption"); fc.textContent = cap; fig.appendChild(fc); }
        p.replaceWith(fig);
      }
    });
    box.querySelectorAll("pre code").forEach((c) => { c.textContent = c.textContent.replace(/\n+$/, ""); });
    // links externos em nova aba
    box.querySelectorAll("a[href^='http']").forEach((a) => {
      if (!a.href.startsWith(CFG.site)) { a.target = "_blank"; a.rel = "noopener"; }
    });
    if (preview) {
      box.querySelectorAll("img[src], video[poster], source[src]").forEach((n) => {
        const attr = n.hasAttribute("poster") ? "poster" : "src";
        const p = rootPath(n.getAttribute(attr));
        if (p && pending.has(p)) n.setAttribute(attr, pending.get(p).url);
      });
    }
    return box.innerHTML.trim();
  }
  // "../assets/x.jpg" -> "assets/x.jpg"
  function rootPath(src) { if (!src) return null; const m = src.match(/^(?:\.\.\/)(.+)$/); return m ? m[1] : null; }

  // ---------------------------------------------------------------- modelos
  function thumbHtml(m) {
    if (m.cover) {
      return `<a class="article-thumb" href="posts/${m.slug}.html" aria-hidden="true" tabindex="-1" style="overflow:hidden;padding:0"><img src="${esc(m.cover)}" alt="" style="width:100%;height:100%;object-fit:cover" /></a>`;
    }
    return `<div class="article-thumb" aria-hidden="true">${esc(m.thumbNum || "01")}</div>`;
  }
  const metaLine = (m) => `${esc(m.category)} · ${fmtDate(m.date)} · ${m.minutes} min de leitura`;

  function postPage(m, bodyHtml) {
    const url = `${CFG.site}/posts/${m.slug}.html`;
    const ogImg = m.cover ? `\n    <meta property="og:image" content="${CFG.site}/${esc(m.cover)}" />` : "";
    const body = bodyHtml.split("\n").map((l) => (l ? "          " + l : l)).join("\n");
    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(m.title)} | Sebastião Rogério</title>
    <meta name="description" content="${esc(m.summary)}" />
    <meta property="og:title" content="${esc(m.title)}" />
    <meta property="og:description" content="${esc(m.summary)}" />${ogImg}
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <link rel="canonical" href="${url}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="../styles.css" />
    <style>${POST_CSS}
    </style>
  </head>
  <body>
    <header class="site-header" id="topo">
      <nav class="nav" aria-label="Navegação principal">
        <a class="brand" href="../index.html"><span class="brand-mark">SR</span><span>Sebastião Rogério</span></a>
        <div class="menu" id="menu">
          <a href="../sobre.html">Sobre</a><a href="../materiais.html">Materiais</a><a href="../blog.html">Blog</a><a href="../publicacoes.html">Publicações</a><a href="../contato.html">Contato</a>
        </div>
        <div class="nav-tools">
          <a class="lang-switch" href="../en/blog.html" aria-label="View English version">EN</a>
          <button class="theme-toggle" type="button" aria-label="Alternar tema claro ou escuro"><span class="theme-icon" aria-hidden="true">☾</span></button>
          <button class="menu-button" type="button" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
        </div>
      </nav>
    </header>
    <main class="post-shell">
      <article>
        <header class="post-header">
          <p class="post-meta">${metaLine(m)}</p>
          <h1>${esc(m.title)}</h1>
        </header>
        <div class="post-content">
${body}
        </div>
      </article>
      <a class="section-link" href="../blog.html">Voltar ao blog</a>
    </main>
    <footer class="footer"><p>© <span id="year"></span> Sebastião Rogério.</p><a href="../index.html">Início</a></footer>
    <script src="../script.js"></script>
  </body>
</html>
`;
  }

  function articleBlock(m) {
    return `          <article class="article-preview">
            <div>
              <p class="article-meta">${metaLine(m)}</p>
              <h2><a href="posts/${m.slug}.html">${esc(m.title)}</a></h2>
              <p>${esc(m.summary)}</p>
              <a class="section-link" href="posts/${m.slug}.html">Ler post</a>
            </div>
            ${thumbHtml(m)}
          </article>`;
  }

  // ---------------------------------------------------------------- blog.html / index.html
  const LIST_RE = /(<div class="article-list">)([\s\S]*?)(\n[ \t]*<\/div>\s*<\/section>)/;
  const GRID_RE = /(<div class="blog-grid">)([\s\S]*?)(\n[ \t]*<\/div>\s*<\/section>)/;

  function parseBlog(html) {
    const m = html.match(LIST_RE);
    if (!m) throw new Error("Não achei a lista de posts no blog.html (div.article-list).");
    const blocks = m[2].match(/[ \t]*<article class="article-preview">[\s\S]*?<\/article>/g) || [];
    return blocks.map((block) => {
      const d = new DOMParser().parseFromString(block, "text/html");
      const href = d.querySelector("h2 a")?.getAttribute("href") || "";
      const slug = (href.match(/posts\/(.+?)\.html/) || [])[1] || "";
      const metaParts = (d.querySelector(".article-meta")?.textContent || "").split("·").map((s) => s.trim());
      const summaryEl = [...d.querySelectorAll("p")].find((p) => !p.classList.contains("article-meta"));
      const thumbImg = d.querySelector(".article-thumb img");
      const thumbTxt = d.querySelector("div.article-thumb")?.textContent.trim();
      return {
        block: block.replace(/^[ \t]*/, "          "), slug,
        title: d.querySelector("h2")?.textContent.trim() || slug,
        category: metaParts[0] || "", date: parsePtDate(metaParts[1] || "") || "1970-01-01",
        minutes: parseInt(metaParts[2], 10) || 1,
        summary: summaryEl?.textContent.trim() || "",
        cover: thumbImg?.getAttribute("src") || "", thumbNum: /^\d+$/.test(thumbTxt || "") ? thumbTxt : null,
      };
    });
  }
  const sortByDate = (list) => list.map((x, i) => [x, i]).sort((a, b) => (b[0].date.localeCompare(a[0].date)) || (a[1] - b[1])).map((x) => x[0]);

  function nextThumbNum(entries) {
    const n = entries.map((e) => parseInt(e.thumbNum, 10)).filter(Number.isFinite);
    return String((n.length ? Math.max(...n) : 0) + 1).padStart(2, "0");
  }

  function updateBlog(html, m) {
    let entries = parseBlog(html);
    const mine = { ...m, block: articleBlock(m) };
    const i = entries.findIndex((e) => e.slug === m.slug);
    if (i >= 0) entries[i] = mine; else entries.unshift(mine); // post novo fica no topo entre os do mesmo dia
    entries = sortByDate(entries);
    const inner = "\n" + entries.map((e) => e.block).join("\n");
    return { html: html.replace(LIST_RE, (_, a, __, c) => a + inner + c), entries };
  }

  function removeFromBlog(html, slug) {
    const entries = parseBlog(html).filter((e) => e.slug !== slug);
    const inner = entries.length ? "\n" + entries.map((e) => e.block).join("\n") : "";
    return { html: html.replace(LIST_RE, (_, a, __, c) => a + inner + c), entries };
  }

  function updateIndex(html, entries) {
    if (!html || !GRID_RE.test(html)) return null;
    const cards = entries.slice(0, 3).map((e) => `          <article class="blog-card">
            <p class="blog-meta">${esc(e.category)} · ${fmtDate(e.date)}</p>
            <h3>${esc(e.title)}</h3>
            <p>${esc(e.summary)}</p>
            <a href="posts/${e.slug}.html">Ler texto</a>
          </article>`);
    return html.replace(GRID_RE, (_, a, __, c) => a + "\n" + cards.join("\n") + c);
  }

  // ---------------------------------------------------------------- formulário
  function readForm() {
    const md = el.body.value;
    let summary = el.summary.value.trim();
    if (!summary) {
      const first = md.split(/\n\s*\n/).map((b) => b.trim()).find((b) => b && !/^(#|!\[|<|>|```|[-*]\s|\d+\.)/.test(b)) || "";
      summary = first.replace(/[*_`]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").slice(0, 220);
      if (summary.length === 220) summary = summary.replace(/\s+\S*$/, "") + "…";
    }
    return {
      title: el.title.value.trim(), category: el.category.value.trim() || "Blog",
      date: el.date.value || todayISO(), slug: slugify(el.slug.value || el.title.value),
      summary, cover: cur.cover, thumbNum: cur.thumbNum, minutes: readMin(md), md,
    };
  }

  function fillForm(meta, md) {
    el.title.value = meta.title || "";
    el.category.value = meta.category || "";
    el.date.value = meta.date || todayISO();
    el.slug.value = meta.slug || "";
    el.summary.value = meta.summary || "";
    el.body.value = md || "";
    setCover(meta.cover || "");
    updateSlugLock();
    renderPreview();
  }

  function setCover(path) {
    cur.cover = path;
    if (path) {
      el.coverImg.src = pending.has(path) ? pending.get(path).url : "../" + path;
      el.coverImg.hidden = false; el.coverRemove.hidden = false; el.coverButton.textContent = "Trocar";
    } else {
      el.coverImg.hidden = true; el.coverRemove.hidden = true; el.coverButton.textContent = "Escolher imagem";
    }
  }

  function updateSlugLock() {
    const locked = !!cur.slug || pending.size > 0;
    el.slug.readOnly = locked;
    el.slugHint.textContent = cur.slug ? "(fixo depois de salvo)" : pending.size ? "(fixo: já há mídia enviada)" : "";
  }

  let previewTimer = null;
  function renderPreview() {
    const m = readForm();
    el.pTitle.textContent = m.title;
    el.pMeta.textContent = `${m.category} · ${fmtDate(m.date)} · ${m.minutes} min de leitura`;
    el.pBody.innerHTML = renderBody(m.md, { preview: true });
    el.counter.textContent = `${words(m.md)} palavras · ${m.minutes} min de leitura · Markdown`;
  }
  function schedule() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { renderPreview(); saveLocal(); }, 250);
  }

  // rascunho local (protege contra fechar a aba sem querer)
  const localKey = () => LOCAL_KEY + (cur.slug || "novo");
  function saveLocal() {
    try {
      const m = readForm();
      localStorage.setItem(localKey(), JSON.stringify({ t: Date.now(), title: el.title.value, category: el.category.value, date: el.date.value, slug: el.slug.value, summary: el.summary.value, md: el.body.value, cover: pending.has(cur.cover) ? "" : cur.cover }));
      if (!busy && m.md) setStatus("Salvo neste navegador");
    } catch (_) {}
  }
  function loadLocal(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; } }
  function clearLocal(key) { try { localStorage.removeItem(key); } catch (_) {} }

  // ---------------------------------------------------------------- lista lateral
  async function refreshList() {
    const [blog, srcFiles] = await Promise.all([getText("blog.html"), listDir(CFG.srcDir)]);
    const published = blog ? parseBlog(blog) : [];
    const srcSlugs = new Set(srcFiles.filter((f) => f.name.endsWith(".md")).map((f) => f.name.slice(0, -3)));
    const draftSlugs = [...srcSlugs].filter((s) => !published.some((p) => p.slug === s));
    const drafts = await Promise.all(draftSlugs.map(async (slug) => {
      const t = await getText(`${CFG.srcDir}/${slug}.md`);
      const { meta } = parseSource(t || "");
      return { slug, title: meta.titulo || slug, date: meta.data || "", category: meta.categoria || "", draft: true };
    }));
    posts = [...published.map((p) => ({ ...p, published: true, hasSource: srcSlugs.has(p.slug) })), ...drafts];

    const cats = [...new Set(posts.map((p) => p.category).filter(Boolean))];
    el.categoryList.innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join("");

    const item = (p) => `<li><button type="button" data-slug="${esc(p.slug)}" class="${p.slug === cur.slug ? "is-current" : ""}">${esc(p.title)}<small>${esc(p.category)}${p.date ? " · " + fmtDate(p.date) : ""}</small></button></li>`;
    el.publishedList.innerHTML = published.length ? sortByDate(posts.filter((p) => p.published)).map(item).join("") : `<li class="muted">Nenhum ainda</li>`;
    el.draftList.innerHTML = drafts.length ? drafts.map(item).join("") : `<li class="muted">Nenhum</li>`;
  }

  function markCurrent() {
    document.querySelectorAll(".post-list button").forEach((b) => b.classList.toggle("is-current", b.dataset.slug === cur.slug));
  }

  // ---------------------------------------------------------------- abrir / novo
  function resetPending() { pending.forEach((v) => URL.revokeObjectURL(v.url)); pending.clear(); }

  function newPost() {
    if (!confirmDiscard()) return;
    resetPending();
    Object.assign(cur, { slug: null, published: false, legacy: false, thumbNum: null, cover: "", slugTouched: false });
    showNotice("");
    const local = loadLocal(LOCAL_KEY + "novo");
    if (local && (local.md || local.title)) {
      fillForm({ title: local.title, category: local.category, date: local.date, slug: local.slug, summary: local.summary, cover: local.cover }, local.md);
      cur.slugTouched = !!local.slug && local.slug !== slugify(local.title);
      showNotice(`Recuperei o rascunho que estava neste navegador. <a href="#" id="discardLocal">Começar do zero</a>`, "warn");
      $("#discardLocal").onclick = (e) => { e.preventDefault(); clearLocal(LOCAL_KEY + "novo"); dirty = false; newPost(); };
    } else {
      fillForm({ date: todayISO() }, "");
    }
    dirty = false;
    markCurrent(); updateRemoveButton();
    closeSidebar();
    el.title.focus();
  }

  async function openPost(slug) {
    if (!confirmDiscard()) return;
    const p = posts.find((x) => x.slug === slug);
    if (!p) return;
    closeSidebar();
    setStatus("Abrindo…");
    resetPending();
    let meta, md, legacy = false;
    const src = await getText(`${CFG.srcDir}/${slug}.md`);
    if (src) {
      const s = parseSource(src);
      meta = { title: s.meta.titulo, category: s.meta.categoria, date: s.meta.data, summary: s.meta.resumo, cover: s.meta.capa, thumbNum: s.meta.numero || null };
      md = s.md;
    } else {
      // post antigo, escrito à mão: importa o HTML para Markdown
      const html = await getText(`posts/${slug}.html`);
      if (!html) throw new Error(`Não encontrei posts/${slug}.html`);
      md = htmlToMarkdown(html);
      meta = { title: p.title, category: p.category, date: p.date, summary: p.summary, cover: p.cover };
      legacy = true;
    }
    if (p.published) { meta.cover = meta.cover || p.cover; meta.thumbNum = p.thumbNum || meta.thumbNum; }
    Object.assign(cur, { slug, published: !!p.published, legacy, thumbNum: meta.thumbNum || null, cover: "", slugTouched: true });
    fillForm({ ...meta, slug }, md);

    const local = loadLocal(LOCAL_KEY + slug);
    if (local && local.md !== md && local.md) {
      showNotice(`Há alterações não publicadas deste post guardadas neste navegador. <a href="#" id="restoreLocal">Recuperar</a> · <a href="#" id="dropLocal">Descartar</a>`, "warn");
      $("#restoreLocal").onclick = (e) => { e.preventDefault(); fillForm({ ...local, slug, cover: local.cover || cur.cover }, local.md); showNotice(""); dirty = true; };
      $("#dropLocal").onclick = (e) => { e.preventDefault(); clearLocal(LOCAL_KEY + slug); showNotice(""); };
    } else if (legacy) {
      showNotice("Este post foi escrito antes do editor. Converti o HTML para Markdown; confira a pré-visualização antes de publicar de novo.", "warn");
    } else if (!p.published) {
      showNotice("Rascunho: ainda não aparece no blog. Quando estiver pronto, clique em <strong>Publicar</strong>.");
    } else {
      showNotice(`Publicado em <a href="${CFG.site}/posts/${slug}.html" target="_blank" rel="noopener">${CFG.site.replace("https://", "")}/posts/${slug}.html</a>`);
    }
    dirty = false;
    markCurrent(); updateRemoveButton();
    setStatus("");
  }

  function htmlToMarkdown(html) {
    const d = new DOMParser().parseFromString(html, "text/html");
    const content = d.querySelector(".post-content");
    if (!content) return "";
    if (!window.TurndownService) return content.innerHTML.trim();
    const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", emDelimiter: "*", bulletListMarker: "-" });
    td.keep(["video", "iframe", "table"]);
    td.addRule("htmlBlocks", {
      filter: (n) => (n.nodeName === "FIGURE" && !n.classList.contains("post-figure")) || (n.nodeName === "DIV") || (n.nodeName === "P" && n.className),
      replacement: (_, n) => "\n\n" + n.outerHTML.replace(/\n\s*/g, "\n") + "\n\n",
    });
    td.addRule("postFigure", {
      filter: (n) => n.nodeName === "FIGURE" && n.classList.contains("post-figure"),
      replacement: (_, n) => {
        const img = n.querySelector("img"); const cap = n.querySelector("figcaption")?.textContent.trim();
        return `\n\n![${img?.alt || ""}](${img?.getAttribute("src") || ""}${cap ? ` "${cap.replace(/"/g, "'")}"` : ""})\n\n`;
      },
    });
    return td.turndown(content.innerHTML).trim() + "\n";
  }

  let dirty = false;
  function confirmDiscard() {
    if (!dirty) return true;
    return confirm("Há alterações que ainda não foram salvas no GitHub (continuam guardadas neste navegador). Trocar de post mesmo assim?");
  }

  // ---------------------------------------------------------------- salvar / publicar
  async function save({ publish }) {
    if (busy) return;
    const m = readForm();
    if (!m.title) { el.title.focus(); return setStatus("Falta o título.", "err"); }
    if (!m.slug) { el.slug.focus(); return setStatus("Falta o endereço do post.", "err"); }
    if (!m.md.trim()) { el.body.focus(); return setStatus("O texto está vazio.", "err"); }
    if (!cur.slug && posts.some((p) => p.slug === m.slug)) {
      el.slug.focus();
      return setStatus(`Já existe um post com o endereço "${m.slug}". Troque o endereço.`, "err");
    }
    if (publish && !cur.published && !confirm(`Publicar "${m.title}" no blog agora?`)) return;

    busy = true; el.publishButton.disabled = el.draftButton.disabled = true;
    const localKeyBefore = localKey();
    try {
      // mídia enviada que continua sendo usada no texto ou como capa
      const used = [...pending.entries()].filter(([path]) => m.md.includes(path) || m.cover === path);
      const media = used.map(([path, v]) => ({ path, blob: v.blob }));

      for (let attempt = 1; attempt <= 3; attempt++) {
        setStatus(attempt > 1 ? "O site mudou no meio do caminho, tentando de novo…" : "Preparando…");
        const files = [...media];
        const wasPublished = cur.published;
        const willBePublished = publish || wasPublished;
        let thumbNum = m.thumbNum;

        if (publish) {
          const blog = await getText("blog.html");
          if (!blog) throw new Error("Não consegui ler o blog.html");
          if (!thumbNum && !m.cover) thumbNum = nextThumbNum(parseBlog(blog));
          const meta = { ...m, thumbNum };
          const { html: blogHtml, entries } = updateBlog(blog, meta);
          files.push({ path: `posts/${m.slug}.html`, text: postPage(meta, renderBody(m.md)) });
          files.push({ path: "blog.html", text: blogHtml });
          const index = updateIndex(await getText("index.html"), entries);
          if (index) files.push({ path: "index.html", text: index });
        }
        files.push({ path: `${CFG.srcDir}/${m.slug}.md`, text: buildSource({ ...m, thumbNum, draft: !willBePublished }, m.md) });

        const verb = publish ? (wasPublished ? "atualiza" : "publica") : "rascunho";
        try {
          await commitFiles(files, `blog: ${verb} "${m.title}"\n\nEnviado pelo editor do site (admin/).`);
        } catch (e) {
          if ((e.status === 422 || e.status === 409) && attempt < 3) continue;
          throw e;
        }
        cur.thumbNum = thumbNum;
        break;
      }

      if (publish) cur.published = true;
      cur.slug = m.slug; cur.legacy = false;
      resetPending(); setCover(m.cover);
      clearLocal(localKeyBefore); clearLocal(localKey());
      dirty = false;
      updateSlugLock();
      await refreshList(); markCurrent(); updateRemoveButton();
      const url = `${CFG.site}/posts/${m.slug}.html`;
      if (publish) {
        setStatus("Publicado ✓", "ok");
        showNotice(`<strong>Publicado.</strong> O GitHub Pages leva 1 a 2 minutos para atualizar: <a href="${url}" target="_blank" rel="noopener">abrir o post</a> · <a href="${CFG.site}/blog.html" target="_blank" rel="noopener">ver o blog</a>. Se aparecer a versão antiga, recarregue com Cmd + Shift + R.`);
      } else {
        setStatus("Rascunho salvo no GitHub ✓", "ok");
        showNotice(cur.published
          ? "Texto salvo no GitHub. <strong>O post publicado não mudou</strong>: para atualizar o site, clique em Publicar."
          : "Rascunho salvo no GitHub. Ele ainda não aparece no blog; dá para continuar de outro computador ou do celular.");
      }
    } catch (e) {
      console.error(e);
      setStatus("Não deu certo", "err");
      let hint = "";
      if (e.status === 401) hint = " O token expirou ou foi revogado: clique em Sair e entre de novo.";
      if (e.status === 403 || e.status === 404) hint = " Confira se o token tem permissão <em>Contents: Read and write</em> no repositório.";
      showNotice(`<strong>Erro ao salvar:</strong> ${esc(e.message)}.${hint} Seu texto continua guardado neste navegador.`, "err");
    } finally {
      busy = false; el.publishButton.disabled = el.draftButton.disabled = false;
    }
  }

  // ---------------------------------------------------------------- tirar do ar / apagar
  function askRemove() {
    if (!cur.slug || busy) return;
    const p = posts.find((x) => x.slug === cur.slug) || {};
    const title = esc(el.title.value || cur.slug);
    showNotice(`<strong>O que fazer com “${title}”?</strong><div class="notice-actions">`
      + (cur.published ? `<button type="button" class="button secondary small" id="doUnpublish">Tirar do ar (vira rascunho)</button>` : "")
      + `<button type="button" class="button small danger" id="doDelete">Apagar de vez</button>`
      + `<button type="button" class="link-btn muted" id="doCancel">Cancelar</button></div>`
      + `<small class="muted">${cur.published ? "Tirar do ar remove o post do site e da página inicial, mas guarda o texto nos rascunhos. " : ""}Apagar de vez remove também o texto e as imagens enviadas pelo editor. Dá para recuperar pelo histórico do GitHub, mas não pelo editor.</small>`, "warn");
    $("#doCancel").onclick = () => showNotice("");
    $("#doDelete").onclick = () => { if (confirm(`Apagar “${el.title.value || cur.slug}” de vez?`)) removePost({ hard: true, hasSource: p.hasSource !== false }); };
    const u = $("#doUnpublish"); if (u) u.onclick = () => removePost({ hard: false });
    el.notice.scrollIntoView({ block: "nearest" });
  }

  async function removePost({ hard, hasSource = true }) {
    const slug = cur.slug; const m = readForm();
    busy = true; el.publishButton.disabled = el.draftButton.disabled = true;
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        setStatus("Preparando…");
        const files = [];
        if (cur.published) {
          const blog = await getText("blog.html");
          const { html, entries } = removeFromBlog(blog, slug);
          files.push({ path: "blog.html", text: html });
          const index = updateIndex(await getText("index.html"), entries);
          if (index) files.push({ path: "index.html", text: index });
          if (await getText(`posts/${slug}.html`) !== null) files.push({ path: `posts/${slug}.html`, remove: true });
        }
        if (hard) {
          if (await getText(`${CFG.srcDir}/${slug}.md`) !== null) files.push({ path: `${CFG.srcDir}/${slug}.md`, remove: true });
          const media = await listDir(`${CFG.assetDir}/${slug}`);
          for (const f of Array.isArray(media) ? media : []) if (f.type === "file") files.push({ path: `${CFG.assetDir}/${slug}/${f.name}`, remove: true });
        } else {
          files.push({ path: `${CFG.srcDir}/${slug}.md`, text: buildSource({ ...m, slug, draft: true }, m.md) });
        }
        if (!files.length) break;
        try {
          await commitFiles(files, `blog: ${hard ? "apaga" : "tira do ar"} "${m.title || slug}"\n\nEnviado pelo editor do site (admin/).`);
        } catch (e) {
          if ((e.status === 422 || e.status === 409) && attempt < 3) continue;
          throw e;
        }
        break;
      }
      clearLocal(LOCAL_KEY + slug);
      if (hard) {
        dirty = false; newPost();
        setStatus("Post apagado ✓", "ok");
        showNotice(`“${esc(m.title || slug)}” foi apagado. O site atualiza em 1 a 2 minutos.`);
      } else {
        cur.published = false; dirty = false;
        setStatus("Post tirado do ar ✓", "ok");
        showNotice("O post saiu do site e agora está nos rascunhos. Para voltar, é só clicar em <strong>Publicar</strong>.");
      }
      await refreshList(); markCurrent(); updateRemoveButton();
    } catch (e) {
      console.error(e);
      setStatus("Não deu certo", "err");
      showNotice(`<strong>Erro:</strong> ${esc(e.message)}`, "err");
    } finally {
      busy = false; el.publishButton.disabled = el.draftButton.disabled = false;
    }
  }
  function updateRemoveButton() { el.removeButton.hidden = !cur.slug; }

  // ---------------------------------------------------------------- mídia
  async function prepareImage(file) {
    const type = file.type || "";
    if (/gif|svg/.test(type)) return { blob: file, ext: type.includes("svg") ? "svg" : "gif" };
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (_) { return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase() }; }
    const max = 1600;
    const ext0 = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    if (bmp.width <= max && file.size < 450 * 1024) return { blob: file, ext: ext0 };
    const scale = Math.min(1, max / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const want = type.includes("jpeg") || type.includes("jpg") ? "image/jpeg" : "image/webp";
    const blob = await new Promise((ok) => c.toBlob(ok, want, 0.85));
    if (!blob) return { blob: file, ext: ext0 };
    const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
    return { blob, ext };
  }

  function mediaSlug() {
    const s = slugify(el.slug.value || el.title.value);
    if (!s) { setStatus("Dê um título ao post antes de enviar imagens.", "err"); el.title.focus(); return null; }
    if (!el.slug.value) el.slug.value = s;
    return s;
  }

  async function addMedia(file) {
    const slug = mediaSlug(); if (!slug) return null;
    const isVideo = (file.type || "").startsWith("video/");
    if (isVideo && file.size > 95 * 1024 * 1024) { setStatus("Vídeo grande demais (o GitHub aceita até ~95 MB). Use o YouTube.", "err"); return null; }
    if (isVideo && file.size > 40 * 1024 * 1024) setStatus("Vídeo grande: vai demorar um pouco para enviar ao publicar.");
    const prep = isVideo ? { blob: file, ext: (file.name.split(".").pop() || "mp4").toLowerCase() } : await prepareImage(file);
    const base = slugify(file.name.replace(/\.[^.]+$/, "")) || (isVideo ? "video" : "imagem");
    const path = `${CFG.assetDir}/${slug}/${base}-${Math.random().toString(36).slice(2, 6)}.${prep.ext}`;
    pending.set(path, { blob: prep.blob, url: URL.createObjectURL(prep.blob) });
    updateSlugLock();
    dirty = true;
    return { path, isVideo };
  }

  function insertAtCursor(text, selectInner) {
    const t = el.body; t.focus();
    const s = t.selectionStart, e = t.selectionEnd;
    t.setRangeText(text, s, e, "end");
    if (selectInner) { const i = text.indexOf(selectInner); if (i >= 0) t.setSelectionRange(s + i, s + i + selectInner.length); }
    t.dispatchEvent(new Event("input"));
  }
  function blockInsert(text) {
    const t = el.body; const before = t.value.slice(0, t.selectionStart);
    const pre = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    insertAtCursor(pre + text + "\n\n");
  }

  async function insertFiles(files) {
    for (const f of files) {
      if (!/^(image|video)\//.test(f.type)) continue;
      const r = await addMedia(f); if (!r) continue;
      if (r.isVideo) {
        const cap = prompt("Legenda do vídeo (opcional):", "") || "";
        blockInsert(`<figure class="post-video">\n<video controls preload="metadata" playsinline>\n<source src="../${r.path}" type="${f.type || "video/mp4"}" />\nSeu navegador não conseguiu reproduzir o vídeo.\n</video>${cap ? `\n<figcaption>${esc(cap)}</figcaption>` : ""}\n</figure>`);
      } else {
        const cap = prompt("Legenda da imagem (opcional):", "") ?? "";
        blockInsert(`![${cap.replace(/[\[\]]/g, "")}](../${r.path}${cap ? ` "${cap.replace(/"/g, "'")}"` : ""})`);
      }
    }
  }

  // ---------------------------------------------------------------- barra de formatação
  function wrap(before, after, placeholder) {
    const t = el.body; const s = t.selectionStart, e = t.selectionEnd;
    const sel = t.value.slice(s, e) || placeholder;
    t.focus(); t.setRangeText(before + sel + after, s, e, "end");
    t.setSelectionRange(s + before.length, s + before.length + sel.length);
    t.dispatchEvent(new Event("input"));
  }
  function prefixLines(prefix, numbered) {
    const t = el.body; const v = t.value;
    const s = v.lastIndexOf("\n", t.selectionStart - 1) + 1;
    let e = v.indexOf("\n", t.selectionEnd); if (e < 0) e = v.length;
    const lines = v.slice(s, e).split("\n").map((l, i) => (numbered ? `${i + 1}. ` : prefix) + l.replace(/^(#{1,6}\s|>\s|[-*]\s|\d+\.\s)/, ""));
    t.focus(); t.setRangeText(lines.join("\n"), s, e, "end"); t.dispatchEvent(new Event("input"));
  }

  const commands = {
    h2: () => prefixLines("## "), h3: () => prefixLines("### "),
    bold: () => wrap("**", "**", "texto"), italic: () => wrap("*", "*", "texto"),
    link: () => { const url = prompt("Endereço do link:", "https://"); if (url) wrap("[", `](${url})`, "texto do link"); },
    ul: () => prefixLines("- "), ol: () => prefixLines("", true), quote: () => prefixLines("> "),
    code: () => {
      const t = el.body; const sel = t.value.slice(t.selectionStart, t.selectionEnd);
      if (sel.includes("\n") || !sel) wrap("```\n", "\n```", "código"); else wrap("`", "`", "código");
    },
    image: () => { el.mediaInput.accept = "image/*"; el.mediaInput.click(); },
    video: () => { el.mediaInput.accept = "video/mp4,video/webm"; el.mediaInput.click(); },
    youtube: () => {
      const url = prompt("Link do vídeo no YouTube:"); if (!url) return;
      const id = (url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1];
      if (!id) return setStatus("Não reconheci esse link do YouTube.", "err");
      blockInsert(`<figure class="post-video">\n<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Vídeo do YouTube" loading="lazy" allowfullscreen></iframe>\n</figure>`);
    },
    button: () => {
      const text = prompt("Texto do botão:", "Acessar"); if (!text) return;
      const url = prompt("Endereço do botão:", "https://"); if (!url) return;
      blockInsert(`<div class="post-actions">\n<a class="button primary" href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>\n</div>`);
    },
    note: () => blockInsert(`<p class="post-note">Escreva aqui a observação.</p>`),
  };

  // ---------------------------------------------------------------- eventos
  function bind() {
    el.toolbar.addEventListener("click", (e) => { const b = e.target.closest("button[data-cmd]"); if (b) commands[b.dataset.cmd](); });
    el.mediaInput.addEventListener("change", async () => { await insertFiles([...el.mediaInput.files]); el.mediaInput.value = ""; });

    el.body.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); commands.bold(); }
      if (mod && e.key.toLowerCase() === "i") { e.preventDefault(); commands.italic(); }
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); commands.link(); }
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveLocal(); setStatus("Salvo neste navegador (use Salvar rascunho para guardar no GitHub)"); }
    });
    el.body.addEventListener("paste", (e) => {
      const files = [...(e.clipboardData?.files || [])];
      if (files.some((f) => f.type.startsWith("image/"))) { e.preventDefault(); insertFiles(files); }
    });
    el.body.addEventListener("dragover", (e) => { e.preventDefault(); el.body.classList.add("dragging"); });
    el.body.addEventListener("dragleave", () => el.body.classList.remove("dragging"));
    el.body.addEventListener("drop", (e) => {
      el.body.classList.remove("dragging");
      const files = [...(e.dataTransfer?.files || [])];
      if (files.length) { e.preventDefault(); insertFiles(files); }
    });

    for (const f of [el.body, el.summary, el.category, el.date]) f.addEventListener("input", () => { dirty = true; schedule(); });
    el.title.addEventListener("input", () => {
      dirty = true;
      if (!cur.slug && !cur.slugTouched && !pending.size) el.slug.value = slugify(el.title.value);
      schedule();
    });
    el.slug.addEventListener("input", () => { cur.slugTouched = true; dirty = true; schedule(); });
    el.slug.addEventListener("blur", () => { el.slug.value = slugify(el.slug.value); });

    el.coverButton.addEventListener("click", () => el.coverInput.click());
    el.coverInput.addEventListener("change", async () => {
      const f = el.coverInput.files[0]; el.coverInput.value = "";
      if (!f) return;
      const r = await addMedia(f); if (r) { setCover(r.path); schedule(); }
    });
    el.coverRemove.addEventListener("click", () => { setCover(""); dirty = true; schedule(); });

    el.publishButton.addEventListener("click", () => save({ publish: true }));
    el.draftButton.addEventListener("click", () => save({ publish: false }));
    el.newButton.addEventListener("click", newPost);
    el.removeButton.addEventListener("click", askRemove);
    el.sidebar.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-slug]");
      if (b) openPost(b.dataset.slug).catch((err) => { setStatus("Não consegui abrir o post", "err"); showNotice(esc(err.message), "err"); });
    });
    el.toggleSidebar.addEventListener("click", () => el.sidebar.classList.toggle("is-open"));
    document.querySelectorAll(".mobile-tabs button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll(".mobile-tabs button").forEach((x) => x.classList.toggle("is-active", x === b));
      el.panes.dataset.show = b.dataset.pane;
      if (b.dataset.pane === "preview") renderPreview();
    }));
    el.themeButton.addEventListener("click", () => setTheme(document.body.dataset.theme === "dark" ? "light" : "dark"));
    el.logoutButton.addEventListener("click", () => {
      if (!confirm("Sair e esquecer o token neste navegador?")) return;
      try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch (_) {}
      location.reload();
    });
    window.addEventListener("beforeunload", (e) => { if (dirty || busy) { saveLocal(); e.preventDefault(); e.returnValue = ""; } });

    el.loginButton.addEventListener("click", login);
    el.tokenInput.addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
  }
  function closeSidebar() { el.sidebar.classList.remove("is-open"); }

  function setTheme(t) {
    document.body.dataset.theme = t; el.themeButton.textContent = t === "dark" ? "☀" : "☾";
    try { localStorage.setItem("theme", t); } catch (_) {}
  }

  // ---------------------------------------------------------------- entrada
  async function checkToken() {
    const repo = await gh(repoPath(""));
    if (repo.permissions && repo.permissions.push === false) throw Object.assign(new Error("Este token não tem permissão de escrita no repositório."), { status: 403 });
    return repo;
  }

  async function login() {
    const t = el.tokenInput.value.trim();
    if (!t) return;
    token = t;
    el.loginButton.disabled = true; el.loginError.textContent = "";
    try {
      await checkToken();
      try { (el.remember.checked ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); } catch (_) {}
      await startApp();
    } catch (e) {
      token = null;
      el.loginError.textContent = e.status === 401 ? "Token inválido ou expirado." : e.status === 404 ? "Token sem acesso ao repositório sebastrogers.github.io." : e.message;
    } finally { el.loginButton.disabled = false; }
  }

  async function startApp() {
    el.login.hidden = true; el.app.hidden = false;
    newPost();
    try { await refreshList(); }
    catch (e) { setStatus("Não consegui carregar a lista de posts", "err"); showNotice(esc(e.message), "err"); }
  }

  async function init() {
    let saved = null;
    try { setTheme(localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")); } catch (_) { setTheme("light"); }
    const tag = document.createElement("style"); tag.textContent = POST_CSS; document.head.appendChild(tag);
    bind();
    try { saved = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY); } catch (_) {}
    if (saved) {
      token = saved;
      try { await checkToken(); return startApp(); }
      catch (e) { token = null; el.loginError.textContent = e.status === 401 ? "O token salvo expirou. Cole um novo." : ""; }
    }
    el.login.hidden = false;
    el.tokenInput.focus();
  }

  // exposto só para os testes automatizados
  window.__editor = { parseBlog, updateBlog, updateIndex, postPage, renderBody, parseSource, buildSource, slugify, parsePtDate };

  init();
})();
