(function () {
  "use strict";

  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function svgEl(tag, attrs) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function chevronIcon() {
    var svg = svgEl("svg", { viewBox: "0 0 16 16", width: "14", height: "14", "aria-hidden": "true", "class": "chevron" });
    svg.appendChild(svgEl("path", { d: "M5 3l5 5-5 5", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round" }));
    return svg;
  }

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "grafico";
  }

  function downloadName(chart) {
    var label = chart.title + (chart.subtitle ? " " + chart.subtitle : "");
    var ext = (chart.image.match(/\.[a-zA-Z0-9]+$/) || [".png"])[0].toLowerCase();
    return slugify(label) + ext;
  }

  /* ============================== lightbox (zoom / fullscreen) ============================== */
  var lightbox = null;

  /* Fullscreen API com o prefixo do Safari. `requestFullscreen` devolve
     Promise nos navegadores atuais e `undefined` nos antigos, daí o teste
     antes do .catch — uma recusa do navegador (foco fora do gesto do
     usuário, política de permissão) não deve virar erro no console. */
  function fullscreenEl() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function fullscreenSuportado(node) {
    return !!(node.requestFullscreen || node.webkitRequestFullscreen);
  }

  function entrarFullscreen(node) {
    var p = node.requestFullscreen ? node.requestFullscreen()
          : node.webkitRequestFullscreen ? node.webkitRequestFullscreen()
          : null;
    if (p && p.catch) p.catch(function () {});
  }

  function sairFullscreen() {
    if (!fullscreenEl()) return;
    var p = document.exitFullscreen ? document.exitFullscreen()
          : document.webkitExitFullscreen ? document.webkitExitFullscreen()
          : null;
    if (p && p.catch) p.catch(function () {});
  }

  // Freehand annotation layer over the lightbox image. Strokes are kept as
  // vector point lists (in the image's natural-pixel coordinate space) and
  // fully replayed on every redraw — that's what lets the canvas match the
  // image's real resolution (crisp at any zoom) while still scaling
  // responsively with pure CSS, with no resize-recalculation needed: pointer
  // coordinates are mapped through the canvas's current on-screen rect at
  // the moment of each event.
  function setupAnnotation(canvas, img) {
    var ctx = canvas.getContext("2d");
    var strokes = [];
    var current = null;

    function brandColor() {
      var v = getComputedStyle(document.documentElement).getPropertyValue("--brand");
      return v && v.trim() ? v.trim() : "#2a78d6"; // azul FtM, mesmo do logo
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = brandColor();
      ctx.lineWidth = Math.max(3, canvas.width / 350);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      strokes.forEach(function (stroke) {
        if (stroke.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (var i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
        ctx.stroke();
      });
    }

    function resize() {
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 800;
      redraw();
    }

    function pointFromEvent(evt) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    canvas.addEventListener("pointerdown", function (evt) {
      evt.preventDefault();
      canvas.setPointerCapture(evt.pointerId);
      current = [pointFromEvent(evt)];
      strokes.push(current);
    });
    canvas.addEventListener("pointermove", function (evt) {
      if (!current) return;
      current.push(pointFromEvent(evt));
      redraw();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
      canvas.addEventListener(type, function () { current = null; });
    });

    img.addEventListener("load", resize);

    return {
      reset: function () { strokes = []; current = null; redraw(); },
      undo: function () { strokes.pop(); redraw(); },
      hasStrokes: function () { return strokes.length > 0; },
      desenhando: function () { return !!current; }
    };
  }

  function buildLightbox() {
    var box = el("div", "lightbox");
    box.id = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Imagem em tela cheia");
    box.hidden = true;

    var closeBtn = el("button", "lightbox-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Fechar");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", closeLightbox);

    var stage = el("div", "lightbox-stage");

    var img = document.createElement("img");
    img.className = "lightbox-img";
    img.id = "lightbox-img";
    img.alt = "";

    var canvas = el("canvas", "lightbox-canvas");
    canvas.setAttribute("aria-hidden", "true");

    stage.appendChild(img);
    stage.appendChild(canvas);

    var annotate = setupAnnotation(canvas, img);

    var toolbar = el("div", "lightbox-toolbar");

    /* Tela cheia vai no `box` inteiro, não só na imagem: em tela cheia o
       navegador só pinta o elemento promovido, então mandar a <img> sozinha
       levaria embora a barra de ferramentas, o ✕ e o botão de baixar. */
    var fsBtn = el("button", "lightbox-tool-btn");
    fsBtn.type = "button";
    fsBtn.textContent = "Tela cheia";
    fsBtn.setAttribute("aria-pressed", "false");
    fsBtn.hidden = !fullscreenSuportado(box);   // iOS antigo não tem a API em <div>
    fsBtn.addEventListener("click", function () {
      if (fullscreenEl()) sairFullscreen();
      else entrarFullscreen(box);
    });

    /* Em tela cheia os controles passam a ficar sobre o gráfico — não há mais
       véu escuro em volta para eles ocuparem. Então se escondem sozinhos
       depois de um tempo parado e voltam a qualquer movimento, toque ou foco
       de teclado, como nos controles de um player de vídeo.

       Por que não só aparecer no hover: numa tela de toque não existe hover, e
       um controle invisível até o ponteiro achar a faixa certa não é
       descobrível. Assim eles aparecem primeiro e só depois somem.

       Fora da tela cheia nada disso vale: lá os controles ficam na margem
       escura, longe da imagem — a classe só tem efeito sob :fullscreen. */
    var OCULTAR_APOS = 2600;
    var timerChrome = null;

    /* `:focus-visible`, não `:focus`: openLightbox foca o ✕ ao abrir e um
       clique de mouse também deixa o botão focado, então "tem foco dentro"
       valeria sempre e os controles nunca sumiriam. O que precisa segurá-los
       é só o foco de teclado — esse sim ficaria preso num botão invisível. */
    function focoDeTecladoEmControle() {
      var a = document.activeElement;
      if (!a || a === box || !box.contains(a)) return false;
      try { return a.matches(":focus-visible"); }
      catch (e) { return false; }   // navegador sem :focus-visible: deixa ocultar
    }

    function mostrarChrome(agendarOcultar) {
      box.classList.remove("chrome-oculto");
      if (timerChrome) { clearTimeout(timerChrome); timerChrome = null; }
      if (!agendarOcultar || !fullscreenEl()) return;
      timerChrome = setTimeout(function () {
        timerChrome = null;
        // Sumir com o foco do teclado dentro deixaria o usuário num botão
        // invisível; o focusout reinicia a contagem quando ele sair.
        if (focoDeTecladoEmControle()) return;
        box.classList.add("chrome-oculto");
      }, OCULTAR_APOS);
    }

    box.addEventListener("pointermove", function () {
      if (annotate.desenhando()) return;   // no meio de um rabisco, não atrapalha
      mostrarChrome(true);
    });
    box.addEventListener("pointerdown", function () { mostrarChrome(true); });
    // `true` também aqui: quem decide se o foco segura os controles é o timer,
    // que consulta :focus-visible. Mostrar sem agendar deixaria os controles
    // presos na tela depois de um foco vindo de clique.
    box.addEventListener("focusin", function () { mostrarChrome(true); });
    box.addEventListener("focusout", function () { mostrarChrome(true); });

    // O usuário também sai da tela cheia por Escape ou F11, sem passar pelo
    // botão — então quem manda no rótulo é o evento do navegador, não o clique.
    function syncFsBtn() {
      var ativo = !!fullscreenEl();
      fsBtn.textContent = ativo ? "Sair da tela cheia" : "Tela cheia";
      fsBtn.setAttribute("aria-pressed", ativo ? "true" : "false");
      mostrarChrome(ativo);   // entrou: mostra e agenda; saiu: mostra e fica
    }
    ["fullscreenchange", "webkitfullscreenchange"].forEach(function (tipo) {
      document.addEventListener(tipo, syncFsBtn);
    });

    var undoBtn = el("button", "lightbox-tool-btn");
    undoBtn.type = "button";
    undoBtn.textContent = "Desfazer";
    undoBtn.addEventListener("click", function () { annotate.undo(); });
    var clearBtn = el("button", "lightbox-tool-btn");
    clearBtn.type = "button";
    clearBtn.textContent = "Limpar anotações";
    clearBtn.addEventListener("click", function () { annotate.reset(); });
    var hint = el("span", "lightbox-hint");
    hint.textContent = "Arraste sobre o gráfico para anotar";
    toolbar.appendChild(fsBtn);
    toolbar.appendChild(undoBtn);
    toolbar.appendChild(clearBtn);
    toolbar.appendChild(hint);

    var download = document.createElement("a");
    download.className = "lightbox-download";
    download.id = "lightbox-download";
    download.textContent = "Baixar imagem";

    box.appendChild(closeBtn);
    box.appendChild(toolbar);
    box.appendChild(stage);
    box.appendChild(download);
    box.addEventListener("click", function (evt) {
      if (evt.target === box) closeLightbox();
    });
    document.body.appendChild(box);

    document.addEventListener("keydown", function (evt) {
      if (evt.key !== "Escape" || box.hidden) return;
      // Em tela cheia, Escape significa "sair da tela cheia" — fechar o
      // lightbox junto tiraria o gráfico da tela em um passo só.
      if (fullscreenEl()) { sairFullscreen(); return; }
      closeLightbox();
    });

    lightbox = { box: box, img: img, download: download, annotate: annotate,
                 fsBtn: fsBtn, mostrarChrome: mostrarChrome, trigger: null };
  }

  function openLightbox(chart, triggerEl) {
    if (!lightbox) return;
    lightbox.annotate.reset();
    lightbox.img.src = chart.image;
    lightbox.img.alt = chart.title;
    lightbox.download.href = chart.image;
    lightbox.download.setAttribute("download", downloadName(chart));
    lightbox.trigger = triggerEl || null;
    lightbox.mostrarChrome(false);   // abre sempre com os controles à vista
    lightbox.box.hidden = false;
    document.body.classList.add("lightbox-open");
    lightbox.box.querySelector(".lightbox-close").focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.box.hidden) return;
    // Sem isto, fechar pelo ✕ estando em tela cheia deixaria o navegador em
    // tela cheia exibindo um elemento já escondido — tela preta.
    sairFullscreen();
    lightbox.mostrarChrome(false);   // limpa o timer pendente
    lightbox.box.hidden = true;
    lightbox.img.src = "";
    lightbox.annotate.reset();
    document.body.classList.remove("lightbox-open");
    if (lightbox.trigger) lightbox.trigger.focus();
  }

  /* ============================== repo discovery (GitHub file tree -> sections/charts) ============================== */
  var IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

  // "01 - Título - Subtítulo" -> {order, title, subtitle}. Missing leading
  // number, or missing subtitle, degrade gracefully instead of failing.
  function parseOrderedName(raw) {
    var parts = raw.split(" - ").map(function (p) { return p.trim(); }).filter(Boolean);
    var order = 999;
    if (parts.length && /^\d+$/.test(parts[0])) {
      order = parseInt(parts[0], 10);
      parts.shift();
    }
    var title = parts.shift() || raw;
    var subtitle = parts.length ? parts.join(" - ") : "";
    return { order: order, title: title, subtitle: subtitle };
  }

  // "02 Conta corrente" -> {order: 2, label: "Conta corrente"}
  function parseSectionFolder(name) {
    var m = name.match(/^(\d+)\s+(.+)$/);
    if (m) return { order: parseInt(m[1], 10), label: m[2].trim() };
    return { order: 999, label: name };
  }

  // manifest.json is regenerated on every push that touches charts/ (see
  // .github/workflows/manifest.yml) and served from this same Pages site, so
  // reading it costs nothing against the GitHub API's 60-requests-per-hour
  // per-IP limit. It deliberately mirrors the shape of the API response
  // ({path, type} entries), so buildSectionsAndCharts() cannot tell which of
  // the two produced the list.
  async function fetchManifestTree() {
    var res = await fetch("manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("manifest.json respondeu " + res.status);
    var data = await res.json();
    if (!data || !Array.isArray(data.tree)) throw new Error("manifest.json não tem a lista 'tree'");
    if (!data.tree.length) throw new Error("manifest.json está vazio");
    return data.tree;
  }

  async function fetchRepoTree() {
    var rc = window.REPO_CONFIG || {};
    var cacheKey = "chartbook-tree:" + rc.owner + "/" + rc.repo + "/" + rc.branch;
    try {
      var cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Date.now() - parsed.t < 5 * 60 * 1000) return parsed.tree;
      }
    } catch (e) { /* sessionStorage unavailable (private mode etc.) — just skip the cache */ }

    // Manifest first, API second. A missing manifest is an expected, fully
    // recoverable state (a checkout where the workflow never ran, a branch
    // that predates it), so this warns and falls through instead of failing.
    try {
      var manifestTree = await fetchManifestTree();
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), tree: manifestTree })); } catch (e2) {}
      return manifestTree;
    } catch (e) {
      console.warn("manifest.json indisponível — usando a API do GitHub:", e.message);
    }

    var url = "https://api.github.com/repos/" + rc.owner + "/" + rc.repo + "/git/trees/" + rc.branch + "?recursive=1";
    var res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok && res.status === 404 && rc.repo === "ftm-chartbook") {
      var fallbackUrl = "https://api.github.com/repos/" + rc.owner + "/norte-chartbook/git/trees/" + rc.branch + "?recursive=1";
      var fallbackRes = await fetch(fallbackUrl, { headers: { Accept: "application/vnd.github+json" } });
      if (fallbackRes.ok) {
        res = fallbackRes;
      }
    }
    if (!res.ok) throw new Error("API do GitHub respondeu " + res.status + (res.status === 403 ? " (provavelmente limite de requisições — tente de novo em alguns minutos)" : ""));
    var data = await res.json();
    var tree = data.tree || [];
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), tree: tree })); } catch (e) {}
    return tree;
  }

  // Walks the repo tree and turns charts/ into { sections, charts }. Every
  // chart lives in its own "slot" folder — the slot folder's name (not the
  // image file's name) is the chart's identity, parsed with the same
  // "NN - Título - Subtítulo" convention filenames used before this change.
  // The file inside the slot can be named anything; only its extension is
  // checked. Two folder depths are understood, and can be mixed freely:
  //   charts/<NN Tema>/<NN - Título - Subtítulo>/<qualquer-nome>.png              (ungrouped)
  //   charts/<NN Assunto>/<NN Tema>/<NN - Título - Subtítulo>/<qualquer-nome>.png (agrupado)
  // The leading "NN " on any folder orders it among its own siblings — groups
  // and top-level (ungrouped) themes share that same ordering slot, since both
  // are direct children of charts/. A slot with more than one image is a user
  // error (forgot to delete the old file before uploading a differently-named
  // replacement) — we deterministically show the alphabetically-first image
  // and flag the rest via chart.extraImagesWarning instead of silently
  // dropping the slot or silently picking one with no indication.
  function buildSectionsAndCharts(tree) {
    var rc = window.REPO_CONFIG || {};
    var prefix = (rc.chartsPath || "charts").replace(/\/$/, "") + "/";
    var groupsByName = {};
    var sectionsByKey = {};
    var slotsByKey = {};

    function ensureGroup(name) {
      if (!groupsByName[name]) {
        var g = parseSectionFolder(name);
        groupsByName[name] = { id: slugify(name), order: g.order, label: g.label };
      }
      return groupsByName[name];
    }
    function ensureSection(key, name, group) {
      if (!sectionsByKey[key]) {
        var s = parseSectionFolder(name);
        sectionsByKey[key] = { id: slugify(key), order: s.order, label: s.label, group: group };
      }
      return sectionsByKey[key];
    }

    tree.forEach(function (entry) {
      if (entry.type !== "blob" || !entry.path.startsWith(prefix)) return;
      var segs = entry.path.slice(prefix.length).split("/");
      var fileName = segs[segs.length - 1];
      if (!IMAGE_EXT.test(fileName)) return;

      var slotName, slotKey, section;
      if (segs.length === 3) {
        slotName = segs[1];
        slotKey = segs[0] + "/" + segs[1];
        section = ensureSection(segs[0], segs[0], null);
      } else if (segs.length === 4) {
        slotName = segs[2];
        slotKey = segs[0] + "/" + segs[1] + "/" + segs[2];
        section = ensureSection(segs[0] + "/" + segs[1], segs[1], ensureGroup(segs[0]));
      } else {
        return; // unsupported depth: legacy flat file directly in a theme folder, or nested too deep inside a slot
      }

      if (!slotsByKey[slotKey]) slotsByKey[slotKey] = { slotName: slotName, section: section, files: [] };
      slotsByKey[slotKey].files.push({ name: fileName, path: entry.path });
    });

    var charts = Object.keys(slotsByKey).map(function (key) {
      var slot = slotsByKey[key];
      // Deterministic, not "most recent": plain alphabetical order of the
      // filenames actually present. Only matters when a slot has 2+ images.
      var files = slot.files.slice().sort(function (a, b) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      });
      var chosen = files[0];
      var parsed = parseOrderedName(slot.slotName);
      var chart = {
        id: "chart-" + slugify(key),
        section: slot.section.id,
        order: parsed.order,
        title: parsed.title,
        subtitle: parsed.subtitle,
        image: chosen.path.split("/").map(encodeURIComponent).join("/")
      };
      if (files.length > 1) {
        var extra = files.slice(1).map(function (f) { return f.name; });
        chart.extraImagesWarning = "Mais de um arquivo encontrado nesta pasta — exibindo \"" + chosen.name +
          "\". Remova o(s) arquivo(s) extra para não haver ambiguidade: " + extra.join(", ") + ".";
      }
      return chart;
    });

    var sections = Object.keys(sectionsByKey).map(function (k) { return sectionsByKey[k]; });
    function topOrder(s) { return s.group ? s.group.order : s.order; }
    function withinOrder(s) { return s.group ? s.order : 0; }
    sections.sort(function (a, b) {
      return topOrder(a) - topOrder(b)
        || (a.group && b.group ? a.group.label.localeCompare(b.group.label, "pt-BR") : 0)
        || withinOrder(a) - withinOrder(b)
        || a.label.localeCompare(b.label, "pt-BR");
    });
    charts.sort(function (a, b) { return a.order - b.order || a.title.localeCompare(b.title, "pt-BR"); });
    return { sections: sections, charts: charts };
  }

  /* ============================== gallery (image cards) ============================== */
  function buildCard(chart) {
    var card = el("div", "chart-card");
    card.id = chart.id;

    var head = el("div", "chart-card-head");
    var titleWrap = document.createElement("div");
    var h3 = el("h3", "chart-title");
    h3.textContent = chart.title;
    titleWrap.appendChild(h3);
    if (chart.subtitle) {
      var sub = el("div", "chart-subtitle");
      sub.textContent = chart.subtitle;
      titleWrap.appendChild(sub);
    }
    head.appendChild(titleWrap);
    card.appendChild(head);

    if (chart.extraImagesWarning) {
      var warn = el("div", "chart-warning");
      warn.textContent = chart.extraImagesWarning;
      card.appendChild(warn);
    }

    var imgWrap = el("div", "chart-image-wrap");
    var zoomBtn = el("button", "chart-image-btn");
    zoomBtn.type = "button";
    zoomBtn.setAttribute("aria-label", "Ampliar: " + chart.title);
    var img = document.createElement("img");
    img.src = chart.image;
    img.alt = chart.title;
    img.loading = "lazy";
    var imageOk = true;
    img.addEventListener("error", function () {
      imageOk = false;
      imgWrap.innerHTML = "";
      var ph = el("div", "chart-placeholder");
      var strong = document.createElement("strong");
      strong.textContent = "Imagem não encontrada";
      var code = document.createElement("code");
      code.textContent = chart.image;
      var hint = document.createElement("span");
      hint.textContent = "Suba uma imagem dentro dessa pasta-slot (qualquer nome de arquivo serve — veja o README.md).";
      ph.appendChild(strong); ph.appendChild(code); ph.appendChild(hint);
      imgWrap.appendChild(ph);
    }, { once: true });
    zoomBtn.appendChild(img);
    zoomBtn.addEventListener("click", function () {
      if (imageOk) openLightbox(chart, zoomBtn);
    });
    imgWrap.appendChild(zoomBtn);
    card.appendChild(imgWrap);

    var actions = el("div", "chart-actions");
    // "Ampliar", não "Tela cheia": este botão abre o lightbox, e é lá dentro
    // que existe a tela cheia de verdade. Dois rótulos iguais para ações
    // diferentes confundiriam.
    var zoomLink = el("button", "chart-action");
    zoomLink.type = "button";
    zoomLink.textContent = "Ampliar";
    zoomLink.addEventListener("click", function () {
      if (imageOk) openLightbox(chart, zoomLink);
    });
    var downloadLink = el("a", "chart-action");
    downloadLink.href = chart.image;
    downloadLink.setAttribute("download", downloadName(chart));
    downloadLink.textContent = "Baixar";
    actions.appendChild(zoomLink);
    actions.appendChild(downloadLink);
    card.appendChild(actions);

    var footer = el("div", "chart-footer");
    var src = document.createElement("span");
    src.textContent = "Fonte: " + (chart.source || (window.SITE_CONFIG || {}).sourceLabel || "FtM");
    var upd = document.createElement("span");
    upd.textContent = chart.updated ? ("Atualizado " + chart.updated) : "";
    footer.appendChild(src); footer.appendChild(upd);
    card.appendChild(footer);

    return card;
  }

  function buildGallery(SECTIONS, CHARTS) {
    var host = document.getElementById("chart-sections");
    var nav = document.getElementById("nav-sections");
    if (!host) return;
    host.innerHTML = "";
    if (nav) nav.innerHTML = "";

    // Total chart count per group, for the group heading's count badge —
    // computed up front since the render loop below only sees one section
    // (and its own chart count) at a time.
    var groupTotals = {};
    SECTIONS.forEach(function (sec) {
      if (!sec.group) return;
      var n = CHARTS.filter(function (c) { return c.section === sec.id; }).length;
      groupTotals[sec.group.id] = (groupTotals[sec.group.id] || 0) + n;
    });

    var currentGroupId = undefined; // undefined ≠ null: forces the first iteration to (re)start a group
    var groupHost = host, navGroupHost = nav;

    SECTIONS.forEach(function (sec, si) {
      var chartsInSection = CHARTS.filter(function (c) { return c.section === sec.id; });
      if (!chartsInSection.length) return;

      var groupId = sec.group ? sec.group.id : null;
      if (groupId !== currentGroupId) {
        currentGroupId = groupId;
        if (sec.group) {
          // A group is a native <details> disclosure — closed by default,
          // click (or Enter/Space) on its <summary> heading opens it, no
          // extra JS needed for the toggle itself. This applies to every
          // group automatically, current or future, since it's driven by
          // folder discovery, not a hardcoded name.
          var groupWrap = el("details", "chart-group");
          var groupHeading = el("summary", "group-heading");
          var gh1 = document.createElement("h2");
          gh1.textContent = sec.group.label;
          var groupCount = el("span", "count");
          var total = groupTotals[sec.group.id] || 0;
          groupCount.textContent = total + (total === 1 ? " gráfico" : " gráficos");
          groupHeading.appendChild(gh1);
          groupHeading.appendChild(groupCount);
          groupHeading.appendChild(chevronIcon());
          groupWrap.appendChild(groupHeading);
          host.appendChild(groupWrap);
          groupHost = groupWrap;

          if (nav) {
            var navGroupWrap = el("details", "nav-supergroup");
            var navGroupLabel = el("summary", "nav-supergroup-label");
            var navGroupText = document.createElement("span");
            navGroupText.textContent = sec.group.label;
            navGroupLabel.appendChild(navGroupText);
            navGroupLabel.appendChild(chevronIcon());
            navGroupWrap.appendChild(navGroupLabel);
            nav.appendChild(navGroupWrap);
            navGroupHost = navGroupWrap;

            // The main-content group and its sidebar mirror share one open
            // state — toggling either one opens/closes both.
            groupWrap.addEventListener("toggle", function () {
              if (navGroupWrap.open !== groupWrap.open) navGroupWrap.open = groupWrap.open;
            });
            navGroupWrap.addEventListener("toggle", function () {
              if (groupWrap.open !== navGroupWrap.open) groupWrap.open = navGroupWrap.open;
            });
          }
        } else {
          groupHost = host;
          navGroupHost = nav;
        }
      }

      // The tema (subtópico) is a <details> too, same as its assunto one
      // level up — closed by default, its own chart grid is what gets
      // disclosed. Synced below with the sidebar's mirror of this same tema.
      var section = el("details", "theme-section");
      section.id = sec.id;
      var heading = el("summary", "section-heading");
      var h2 = document.createElement("h2");
      h2.textContent = sec.label;
      var count = el("span", "count");
      count.textContent = chartsInSection.length + (chartsInSection.length === 1 ? " gráfico" : " gráficos");
      heading.appendChild(h2); heading.appendChild(count); heading.appendChild(chevronIcon());
      section.appendChild(heading);

      var grid = el("div", "chart-grid");
      chartsInSection.forEach(function (chart) { grid.appendChild(buildCard(chart)); });
      section.appendChild(grid);
      groupHost.appendChild(section);

      if (nav) {
        // A tema (subtópico) is also a native <details> disclosure, nested
        // one level inside its assunto (or standalone, if ungrouped) — same
        // closed-by-default, no-extra-JS pattern as the assunto level above.
        // What it discloses is one link per chart, jumping straight to that
        // chart's card via the id buildCard() gave it.
        var navGroup = el("details", "nav-group");
        var navGroupLabel = el("summary", "nav-group-label");
        var labelText = document.createElement("span");
        labelText.textContent = sec.label;
        var n = el("span", "n");
        n.textContent = String(chartsInSection.length).padStart(2, "0");
        navGroupLabel.appendChild(labelText);
        navGroupLabel.appendChild(n);
        navGroupLabel.appendChild(chevronIcon());
        navGroup.appendChild(navGroupLabel);

        var links = el("div", "nav-chart-links");
        chartsInSection.forEach(function (chart, ci) {
          var link = document.createElement("a");
          link.className = "nav-link" + (si === 0 && ci === 0 ? " active" : "");
          link.href = "#" + chart.id;
          link.textContent = chart.title;
          links.appendChild(link);
        });
        navGroup.appendChild(links);

        navGroupHost.appendChild(navGroup);

        // Same one-state-two-mirrors trick as the assunto level: opening
        // either the sidebar's tema disclosure or the main content one
        // opens both.
        section.addEventListener("toggle", function () {
          if (navGroup.open !== section.open) navGroup.open = section.open;
        });
        navGroup.addEventListener("toggle", function () {
          if (section.open !== navGroup.open) section.open = navGroup.open;
        });
      }
    });
  }

  function applyBranding() {
    var cfg = window.SITE_CONFIG || {};
    document.title = cfg.brandName || "Chart Book";
    var map = {
      "brand-name": cfg.brandName, "brand-tag": cfg.tagline,
      "page-title": cfg.pageTitle, "page-lede": cfg.lede
    };
    Object.keys(map).forEach(function (id) {
      var node = document.getElementById(id);
      if (node && map[id]) node.textContent = map[id];
    });
    var srcNodes = document.querySelectorAll("[data-source-label]");
    srcNodes.forEach(function (n) { n.textContent = "Fonte: " + (cfg.sourceLabel || "FtM"); });
    var updatedNodes = document.querySelectorAll("[data-updated-label]");
    var todayStr = new Date().toLocaleDateString("pt-BR");
    updatedNodes.forEach(function (n) { n.textContent = "Atualizado " + todayStr; });
  }

  async function init() {
    applyBranding();
    buildLightbox();

    var host = document.getElementById("chart-sections");
    if (host) {
      host.innerHTML = "";
      host.appendChild(el("p", "state-message"));
      host.firstChild.textContent = "Carregando gráficos…";
    }

    try {
      var tree = await fetchRepoTree();
      var built = buildSectionsAndCharts(tree);
      if (!built.charts.length) {
        if (host) host.innerHTML = '<p class="state-message">Nenhum gráfico encontrado em <code>charts/</code> ainda. Veja o README.md para o formato esperado de pastas e nomes de arquivo.</p>';
        return;
      }
      buildGallery(built.sections, built.charts);
    } catch (e) {
      console.error("Falha ao listar os gráficos:", e);
      if (host) {
        host.innerHTML = "";
        var box = el("div", "state-message error");
        var strong = document.createElement("strong");
        strong.textContent = "Não foi possível carregar a lista de gráficos.";
        var msg = document.createElement("p");
        msg.textContent = e.message + " — recarregue a página em alguns minutos.";
        box.appendChild(strong); box.appendChild(msg);
        host.appendChild(box);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
