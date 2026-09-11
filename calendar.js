(function () {
  "use strict";

  /* `el` e `svgEl` são cópias das que existem no app.js. Extrair as duas para um
     shared.js obrigaria a mexer no app.js — o arquivo mais arriscado do projeto —
     e criaria dependência de ordem de carregamento entre as duas páginas, tudo
     isso para economizar dez linhas. */
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

  /* ============================== datas ==============================
     Nunca `new Date("2026-09-11")`: essa forma é interpretada como UTC e, em
     Brasília (GMT-3), getDate() devolve 10 — todo evento apareceria um dia
     antes. E nunca somar 86400000ms para andar dias: addDays constrói a partir
     de ano/mês/dia, então atravessa horário de verão sem escorregar. */
  var WEEK_START = 1; // segunda-feira

  function parseISODate(s) {
    var p = String(s).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function dateKey(d) {
    var m = d.getMonth() + 1, dia = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (dia < 10 ? "0" + dia : dia);
  }

  function monthKey(d) {
    var m = d.getMonth() + 1;
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m);
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function startOfWeek(d) {
    var diff = (d.getDay() - WEEK_START + 7) % 7;
    return addDays(d, -diff);
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  var DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  var MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var MES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
                   "agosto", "setembro", "outubro", "novembro", "dezembro"];

  function dataCurta(iso) {
    if (!iso) return "";
    var d = parseISODate(iso);
    return d.getDate() + "/" + MES_CURTO[d.getMonth()];
  }

  /* ============================== países / bandeiras ==============================
     Emoji de bandeira está fora de questão: o Windows não tem os glifos de
     indicador regional e renderiza 🇧🇷 como as letras "BR". Arquivo de imagem
     também não: cinco requisições a mais e nenhuma adaptação ao tema. Então as
     bandeiras são SVG desenhado aqui, simplificado para o tamanho em que
     aparecem — detalhe fino (estrelas dos EUA, raios do sol argentino) vira
     ruído a 24px e foi deixado de fora de propósito.

     As cores são hex fixo, deliberadamente não variável CSS: bandeira nacional
     não muda com o tema claro/escuro. */
  var COUNTRY_NAMES = { BR: "Brasil", US: "Estados Unidos", AR: "Argentina", CN: "China", JP: "Japão" };
  var COUNTRY_ORDER = ["BR", "US", "AR", "CN", "JP"];

  function starPoints(cx, cy, rOuter, rotationDeg) {
    var pts = [], rInner = rOuter * 0.382, i, ang, r;
    for (i = 0; i < 10; i++) {
      r = (i % 2 === 0) ? rOuter : rInner;
      ang = (Math.PI / 180) * (rotationDeg - 90 + i * 36);
      pts.push((cx + r * Math.cos(ang)).toFixed(2) + "," + (cy + r * Math.sin(ang)).toFixed(2));
    }
    return pts.join(" ");
  }

  function countryFlag(code) {
    var svg = svgEl("svg", { viewBox: "0 0 24 16", "class": "cal-flag", "aria-hidden": "true" });
    var i, y;
    if (code === "BR") {
      svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 24, height: 16, fill: "#009B3A" }));
      svg.appendChild(svgEl("polygon", { points: "12,1.8 21.8,8 12,14.2 2.2,8", fill: "#FFDF00" }));
      svg.appendChild(svgEl("circle", { cx: 12, cy: 8, r: 3.1, fill: "#002776" }));
    } else if (code === "US") {
      svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 24, height: 16, fill: "#FFFFFF" }));
      for (i = 0; i < 7; i++) {
        y = i * (16 / 6.5);
        svg.appendChild(svgEl("rect", { x: 0, y: y, width: 24, height: 16 / 13, fill: "#B22234" }));
      }
      svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 9.6, height: 8.61, fill: "#3C3B6E" }));
    } else if (code === "AR") {
      svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 24, height: 16, fill: "#74ACDF" }));
      svg.appendChild(svgEl("rect", { x: 0, y: 5.333, width: 24, height: 5.333, fill: "#FFFFFF" }));
      svg.appendChild(svgEl("circle", { cx: 12, cy: 8, r: 1.55, fill: "#F6B40E" }));
    } else if (code === "CN") {
      svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 24, height: 16, fill: "#DE2910" }));
      svg.appendChild(svgEl("polygon", { points: starPoints(4.8, 4.6, 2.6, 0), fill: "#FFDE00" }));
      var smalls = [[9.6, 2.2, -25], [11.4, 4.2, 5], [11.4, 6.8, 25], [9.6, 8.8, 45]];
      for (i = 0; i < smalls.length; i++) {
        svg.appendChild(svgEl("polygon", {
          points: starPoints(smalls[i][0], smalls[i][1], 0.95, smalls[i][2]), fill: "#FFDE00"
        }));
      }
    } else if (code === "JP") {
      svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 24, height: 16, fill: "#FFFFFF" }));
      svg.appendChild(svgEl("circle", { cx: 12, cy: 8, r: 4.8, fill: "#BC002D" }));
    } else {
      // País desconhecido (erro de digitação no JSON): mostra as letras em cinza,
      // para o erro ficar visível em vez de sumir.
      svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 24, height: 16, fill: "#8a8a8a" }));
      var t = svgEl("text", { x: 12, y: 11, "text-anchor": "middle", "font-size": "8", fill: "#fff" });
      t.textContent = String(code || "??").slice(0, 2);
      svg.appendChild(t);
    }
    return svg;
  }

  /* ============================== estado ============================== */
  var HOJE = new Date();
  var HOJE_KEY = dateKey(HOJE);
  var RANGE_START = startOfWeek(HOJE);            // semana corrente
  var RANGE_END = addDays(RANGE_START, 28);       // +4 semanas (início da última)
  var SEMANAS_A_FRENTE = 4;

  var state = { anchor: RANGE_START, paises: {}, atualizando: false, aviso: "" };
  var monthCache = {};
  var meta = { fuso: "", atualizado: "", fontes: "" };

  /* ============================== carga ============================== */
  /* `forcar` é o botão "Atualizar": ignora o memo desta sessão e manda
     `cache: "reload"`, que pula o cache do navegador em vez de só revalidar.
     Também é o que permite sair de um erro de rede — sem ele, uma promessa
     rejeitada ficaria presa no memo até a página ser recarregada. */
  function loadMonth(key, forcar) {
    if (!forcar && monthCache[key]) return monthCache[key];
    // `res.text()` + JSON.parse em vez de res.json(): assim um erro de vírgula
    // no arquivo vira mensagem legível na tela, com o nome do arquivo e a
    // posição do erro, em vez de página em branco.
    var p = fetch("calendar/" + key + ".json", { cache: forcar ? "reload" : "no-cache" })
      .then(function (res) {
        if (res.status === 404) return { ausente: true, eventos: [] };
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text().then(function (txt) {
          try {
            return JSON.parse(txt);
          } catch (e) {
            throw new Error("Erro de formatação em calendar/" + key + ".json — " + e.message);
          }
        });
      });
    monthCache[key] = p;
    return p;
  }

  function eventosDaSemana(inicio, forcar) {
    var chaves = {}, d, i;
    for (i = 0; i < 7; i++) {
      d = addDays(inicio, i);
      chaves[monthKey(d)] = true;
    }
    var pedidos = [];
    for (var k in chaves) pedidos.push(loadMonth(k, forcar));

    return Promise.all(pedidos).then(function (docs) {
      var todos = [], invalidos = 0;
      docs.forEach(function (doc) {
        if (!doc || !doc.eventos) return;
        if (doc.fuso) meta.fuso = doc.fuso;
        if (doc.atualizado) meta.atualizado = doc.atualizado;
        if (doc.fontes) meta.fontes = doc.fontes;
        doc.eventos.forEach(function (e) {
          if (!e || !e.data || !/^\d{4}-\d{2}-\d{2}$/.test(e.data)) { invalidos++; return; }
          todos.push(e);
        });
      });
      return { eventos: todos, invalidos: invalidos };
    });
  }

  /* ============================== helpers de exibição ============================== */
  // Aceita "alta"/"media"/"média"/"baixa" em qualquer caixa. Valor desconhecido
  // cai para "media" em vez de quebrar a renderização — é a razão de a
  // importância ser palavra e não 1/2/3: quem edita pelo GitHub não precisa
  // lembrar qual ponta da escala é a alta.
  function importanciaDe(e) {
    var v = String((e && e.importancia) || "media").toLowerCase();
    if (v.indexOf("alta") === 0) return "alta";
    if (v.indexOf("baixa") === 0) return "baixa";
    return "media";
  }

  function paisAtivo(code) {
    var algum = false, k;
    for (k in state.paises) { if (state.paises[k]) { algum = true; break; } }
    if (!algum) return true;          // nenhum filtro marcado = mostra todos
    return !!state.paises[code];
  }

  function valorOu(v, passado) {
    if (v && String(v).trim()) return { txt: String(v), vazio: false };
    return { txt: passado ? "aguardando" : "—", vazio: true, aguardando: !!passado };
  }

  // Compara projeção e efetivo só quando os dois forem numéricos. Devolve null
  // (sem rótulo) em qualquer outro caso — inclusive quando o formato não é
  // parseável, que é o comportamento certo para "3,75%–4,00%" e afins.
  function numBR(s) {
    if (!s) return null;
    var m = String(s).replace(/\./g, "").match(/-?\d+(,\d+)?/);
    if (!m) return null;
    var n = parseFloat(m[0].replace(",", "."));
    return isNaN(n) ? null : n;
  }

  function rotuloSurpresa(e) {
    var p = numBR(e.projecao), a = numBR(e.efetivo);
    if (p === null || a === null) return null;
    if (a > p) return "acima do consenso";
    if (a < p) return "abaixo do consenso";
    return "em linha com o consenso";
  }

  /* ============================== modal de detalhe ============================== */
  var modal = null;

  function trapFocus(box, evt) {
    if (evt.key !== "Tab") return;
    var alvos = box.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (!alvos.length) return;
    var primeiro = alvos[0], ultimo = alvos[alvos.length - 1];
    if (evt.shiftKey && document.activeElement === primeiro) {
      evt.preventDefault(); ultimo.focus();
    } else if (!evt.shiftKey && document.activeElement === ultimo) {
      evt.preventDefault(); primeiro.focus();
    }
  }

  function buildModal() {
    var box = el("div", "cal-modal");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Detalhe do indicador");
    box.hidden = true;

    var card = el("div", "cal-modal-card");
    var fechar = el("button", "cal-modal-close");
    fechar.type = "button";
    fechar.setAttribute("aria-label", "Fechar");
    fechar.textContent = "✕";
    fechar.addEventListener("click", closeModal);

    var corpo = el("div", "cal-modal-body");
    card.appendChild(fechar);
    card.appendChild(corpo);
    box.appendChild(card);

    box.addEventListener("click", function (evt) { if (evt.target === box) closeModal(); });
    document.addEventListener("keydown", function (evt) {
      if (box.hidden) return;
      if (evt.key === "Escape") closeModal();
      else trapFocus(box, evt);
    });
    document.body.appendChild(box);
    modal = { box: box, corpo: corpo, fechar: fechar, trigger: null };
  }

  function linhaValor(rotulo, valor) {
    var li = el("div", "cal-modal-valor");
    var r = el("span", "cal-modal-valor-rotulo");
    r.textContent = rotulo;
    var v = el("span", "cal-modal-valor-num");
    v.textContent = valor;
    li.appendChild(r); li.appendChild(v);
    return li;
  }

  function openModal(e, trigger) {
    if (!modal) return;
    var d = parseISODate(e.data);
    var passado = e.data < HOJE_KEY;
    modal.corpo.innerHTML = "";

    var dataTxt = DOW[d.getDay()] + ", " + d.getDate() + " de " + MES_LONGO[d.getMonth()] + " de " + d.getFullYear();
    var h = el("div", "cal-modal-data");
    h.textContent = dataTxt + (e.hora ? " · " + e.hora : "");
    modal.corpo.appendChild(h);

    var pais = el("div", "cal-modal-pais");
    pais.appendChild(countryFlag(e.pais));
    var nome = el("span", null);
    var imp = importanciaDe(e);
    nome.textContent = (COUNTRY_NAMES[e.pais] || e.pais) +
      " · " + (imp === "alta" ? "Alta relevância" : imp === "baixa" ? "Baixa relevância" : "Relevância média");
    pais.appendChild(nome);
    modal.corpo.appendChild(pais);

    var titulo = el("h2", "cal-modal-titulo");
    titulo.textContent = e.indicador || "—";
    modal.corpo.appendChild(titulo);

    if (e.referencia) {
      var ref = el("div", "cal-modal-ref");
      ref.textContent = "Referência: " + e.referencia;
      modal.corpo.appendChild(ref);
    }

    var vals = el("div", "cal-modal-valores");
    vals.appendChild(linhaValor("Anterior", valorOu(e.anterior, false).txt));
    vals.appendChild(linhaValor("Projeção", e.projecao && String(e.projecao).trim() ? e.projecao : "sem consenso divulgado"));
    vals.appendChild(linhaValor("Efetivo", valorOu(e.efetivo, passado).txt));
    modal.corpo.appendChild(vals);

    var surp = rotuloSurpresa(e);
    if (surp) {
      var s = el("div", "cal-surpresa");
      s.textContent = surp;
      modal.corpo.appendChild(s);
    }

    var rodape = el("div", "cal-modal-rodape");
    var partes = [];
    if (e.fonte) partes.push("Fonte: " + e.fonte);
    if (e.obs) partes.push(e.obs);
    if (meta.fuso) partes.push(meta.fuso);
    rodape.textContent = partes.join(" · ");
    modal.corpo.appendChild(rodape);

    modal.trigger = trigger || null;
    modal.box.hidden = false;
    document.body.classList.add("cal-modal-open");
    modal.fechar.focus();
  }

  function closeModal() {
    if (!modal || modal.box.hidden) return;
    modal.box.hidden = true;
    modal.corpo.innerHTML = "";
    document.body.classList.remove("cal-modal-open");
    if (modal.trigger) modal.trigger.focus();
  }

  /* ============================== render ============================== */
  function rotuloSemana(inicio) {
    var fim = addDays(inicio, 6);
    if (inicio.getMonth() === fim.getMonth()) {
      return inicio.getDate() + " – " + fim.getDate() + " de " + MES_LONGO[fim.getMonth()] + " de " + fim.getFullYear();
    }
    return inicio.getDate() + " de " + MES_CURTO[inicio.getMonth()] + " – " +
           fim.getDate() + " de " + MES_CURTO[fim.getMonth()] + " de " + fim.getFullYear();
  }

  function mensagem(host, texto, tipo) {
    var p = el("p", "state-message" + (tipo === "erro" ? " error" : ""));
    p.textContent = texto;
    host.appendChild(p);
    return p;
  }

  function buildToolbar(host) {
    var barra = el("div", "cal-toolbar");

    var nav = el("div", "cal-nav");
    var ant = el("button", "cal-nav-btn");
    ant.type = "button";
    ant.textContent = "‹";
    ant.setAttribute("aria-label", "Semana anterior");
    ant.disabled = dateKey(state.anchor) <= dateKey(RANGE_START);
    ant.addEventListener("click", function () { irPara(addDays(state.anchor, -7)); });

    var rotulo = el("div", "cal-periodo");
    rotulo.setAttribute("aria-live", "polite");
    rotulo.textContent = rotuloSemana(state.anchor);

    var prox = el("button", "cal-nav-btn");
    prox.type = "button";
    prox.textContent = "›";
    prox.setAttribute("aria-label", "Próxima semana");
    prox.disabled = dateKey(state.anchor) >= dateKey(RANGE_END);
    prox.addEventListener("click", function () { irPara(addDays(state.anchor, 7)); });

    nav.appendChild(ant); nav.appendChild(rotulo); nav.appendChild(prox);
    barra.appendChild(nav);

    var hoje = el("button", "chart-action");
    hoje.type = "button";
    hoje.textContent = "Esta semana";
    hoje.disabled = dateKey(state.anchor) === dateKey(RANGE_START);
    hoje.addEventListener("click", function () { irPara(RANGE_START); });
    barra.appendChild(hoje);

    /* "Atualizar" rebusca os arquivos publicados no repositório. Ele não gera
       dado novo — quem gera é a rotina de segunda-feira; o botão serve para
       pegar o que já foi publicado sem depender do cache do navegador. O
       estado vive em `state` porque render() remonta a barra inteira. */
    var atualizar = el("button", "chart-action cal-atualizar");
    atualizar.type = "button";
    atualizar.textContent = state.atualizando ? "Atualizando…" : "Atualizar";
    atualizar.disabled = state.atualizando;
    atualizar.title = "Rebusca os dados publicados, ignorando o cache do navegador.";
    atualizar.addEventListener("click", function () {
      state.atualizando = true;
      state.aviso = "";
      render(true);
    });
    barra.appendChild(atualizar);

    var aviso = el("div", "cal-aviso");
    aviso.setAttribute("aria-live", "polite");
    aviso.textContent = state.aviso || "";
    barra.appendChild(aviso);

    var fuso = el("div", "cal-fuso");
    fuso.textContent = meta.fuso || "";
    barra.appendChild(fuso);

    host.appendChild(barra);
  }

  function buildEventoRow(e) {
    var passado = e.data < HOJE_KEY;
    var btn = el("button", "cal-event imp-" + importanciaDe(e) + (passado ? " cal-event--passado" : ""));
    btn.type = "button";
    btn.setAttribute("aria-label",
      (e.hora ? e.hora + ", " : "") + (COUNTRY_NAMES[e.pais] || e.pais) + ", " + (e.indicador || ""));

    var hora = el("span", "cal-ev-hora");
    hora.textContent = e.hora || "no dia";
    btn.appendChild(hora);

    btn.appendChild(countryFlag(e.pais));

    var nome = el("span", "cal-ev-nome");
    var t = el("span", "cal-ev-titulo");
    t.textContent = e.indicador || "—";
    nome.appendChild(t);
    if (e.referencia) {
      var r = el("span", "cal-ev-ref");
      r.textContent = e.referencia;
      nome.appendChild(r);
    }
    btn.appendChild(nome);

    function coluna(rotulo, valor, classe) {
      var c = el("span", "cal-ev-val " + classe);
      var micro = el("span", "cal-ev-micro");
      micro.textContent = rotulo;
      var v = el("span", null);
      var info = valorOu(valor, false);
      if (classe === "is-efetivo") info = valorOu(valor, passado);
      v.textContent = info.txt;
      if (info.vazio) v.className = info.aguardando ? "cal-aguardando" : "cal-vazio";
      c.appendChild(micro); c.appendChild(v);
      return c;
    }
    btn.appendChild(coluna("Anterior", e.anterior, "is-anterior"));
    btn.appendChild(coluna("Projeção", e.projecao, "is-projecao"));
    btn.appendChild(coluna("Efetivo", e.efetivo, "is-efetivo"));

    btn.addEventListener("click", function () { openModal(e, btn); });
    return btn;
  }

  function buildSemana(host, eventos) {
    var porDia = {};
    eventos.forEach(function (e) {
      if (!paisAtivo(e.pais)) return;
      (porDia[e.data] = porDia[e.data] || []).push(e);
    });

    var grade = el("div", "cal-week");

    var cabecalho = el("div", "cal-week-head");
    var vazio = el("span", null);
    cabecalho.appendChild(vazio);
    ["Anterior", "Projeção", "Efetivo"].forEach(function (r) {
      var c = el("span", "cal-head-col");
      c.textContent = r;
      cabecalho.appendChild(c);
    });
    grade.appendChild(cabecalho);

    var algumEvento = false;
    for (var i = 0; i < 7; i++) {
      var d = addDays(state.anchor, i);
      var k = dateKey(d);
      var doDia = (porDia[k] || []).sort(function (a, b) {
        return (a.hora || "99:99") < (b.hora || "99:99") ? -1 : 1;
      });
      if (doDia.length) algumEvento = true;

      var faixa = el("div", "cal-band" + (k === HOJE_KEY ? " cal-band--hoje" : "") +
                              (d.getDay() === 0 || d.getDay() === 6 ? " cal-band--fds" : ""));
      var trilho = el("div", "cal-rail");
      var dow = el("span", "cal-rail-dow"); dow.textContent = DOW[d.getDay()];
      var num = el("span", "cal-rail-num"); num.textContent = d.getDate();
      var mes = el("span", "cal-rail-mes"); mes.textContent = MES_CURTO[d.getMonth()];
      trilho.appendChild(dow); trilho.appendChild(num); trilho.appendChild(mes);
      faixa.appendChild(trilho);

      var corpo = el("div", "cal-band-body");
      if (doDia.length) {
        doDia.forEach(function (e) { corpo.appendChild(buildEventoRow(e)); });
      } else {
        var vaz = el("div", "cal-band-vazio");
        vaz.textContent = "Sem indicadores";
        corpo.appendChild(vaz);
      }
      faixa.appendChild(corpo);
      grade.appendChild(faixa);
    }

    host.appendChild(grade);
    return algumEvento;
  }

  function buildFiltros() {
    var host = document.getElementById("cal-country-filters");
    if (!host) return;
    host.innerHTML = "";
    COUNTRY_ORDER.forEach(function (code) {
      var b = el("button", "cal-filtro" + (state.paises[code] ? " is-on" : ""));
      b.type = "button";
      b.setAttribute("aria-pressed", state.paises[code] ? "true" : "false");
      b.appendChild(countryFlag(code));
      var s = el("span", null);
      s.textContent = COUNTRY_NAMES[code];
      b.appendChild(s);
      b.addEventListener("click", function () {
        state.paises[code] = !state.paises[code];
        syncUrl();
        buildFiltros();
        render();
      });
      host.appendChild(b);
    });
  }

  function irPara(novaData) {
    var k = dateKey(novaData);
    if (k < dateKey(RANGE_START)) novaData = RANGE_START;
    if (k > dateKey(RANGE_END)) novaData = RANGE_END;
    state.anchor = startOfWeek(novaData);
    syncUrl();
    render();
  }

  /* Estado na URL com replaceState (não pushState): recarregar mantém a
     posição sem encher o botão "voltar" de passos de navegação semanal. */
  function syncUrl() {
    if (!window.history || !window.history.replaceState) return;
    var ps = [];
    COUNTRY_ORDER.forEach(function (c) { if (state.paises[c]) ps.push(c); });
    var q = "?s=" + dateKey(state.anchor) + (ps.length ? "&p=" + ps.join(",") : "");
    window.history.replaceState(null, "", q);
  }

  function readUrl() {
    var q = window.location.search || "";
    var ms = q.match(/[?&]s=(\d{4}-\d{2}-\d{2})/);
    if (ms) {
      var d = parseISODate(ms[1]);
      if (!isNaN(d.getTime())) {
        var k = dateKey(startOfWeek(d));
        // Fora do intervalo coberto volta para a semana corrente em silêncio,
        // em vez de mostrar uma semana vazia sem explicação.
        if (k >= dateKey(RANGE_START) && k <= dateKey(RANGE_END)) state.anchor = startOfWeek(d);
      }
    }
    var mp = q.match(/[?&]p=([A-Z,]+)/);
    if (mp) {
      mp[1].split(",").forEach(function (c) {
        if (COUNTRY_NAMES[c]) state.paises[c] = true;
      });
    }
  }

  /* Devolve a barra ao estado ocioso depois de um "Atualizar", editando os dois
     nós no lugar. Um segundo render() aqui reentraria no ciclo de carga. */
  function encerrarAtualizacao(host, texto) {
    state.atualizando = false;
    state.aviso = texto;
    var btn = host.querySelector(".cal-atualizar");
    if (btn) { btn.disabled = false; btn.textContent = "Atualizar"; }
    var av = host.querySelector(".cal-aviso");
    if (av) av.textContent = texto;
  }

  function render(forcar) {
    var host = document.getElementById("cal-root");
    if (!host) return;
    var atualizadoAntes = meta.atualizado;
    if (!forcar) state.aviso = "";   // navegar ou filtrar descarta o recado anterior
    host.innerHTML = "";
    buildToolbar(host);

    var carregando = mensagem(host, "Carregando calendário…");

    eventosDaSemana(state.anchor, forcar).then(function (res) {
      host.removeChild(carregando);

      if (res.invalidos) {
        var aviso = el("div", "cal-warning");
        aviso.textContent = res.invalidos + (res.invalidos === 1
          ? " evento ignorado por estar sem a data ou com data inválida."
          : " eventos ignorados por estarem sem a data ou com data inválida.");
        host.appendChild(aviso);
      }

      // A grade da semana sempre é desenhada: arquivo faltando tira os eventos,
      // nunca o calendário. Semana vazia comunica "nada agendado" melhor do que
      // um parágrafo solto.
      var teve = buildSemana(host, res.eventos);

      if (!teve) {
        var algumFiltro = false, k;
        for (k in state.paises) { if (state.paises[k]) { algumFiltro = true; break; } }
        if (algumFiltro) {
          var p = mensagem(host, "Nenhum indicador nesta semana para os países selecionados.");
          var limpar = el("button", "chart-action");
          limpar.type = "button";
          limpar.textContent = "Limpar filtros";
          limpar.addEventListener("click", function () {
            state.paises = {}; syncUrl(); buildFiltros(); render();
          });
          p.appendChild(document.createTextNode(" "));
          p.appendChild(limpar);
        } else {
          mensagem(host, "Nenhum indicador cadastrado para esta semana ainda. " +
            "As projeções de consenso só são publicadas nos dias que antecedem cada divulgação.");
        }
      }

      // A barra de navegação é montada antes de os dados chegarem, então o
      // fuso ainda não era conhecido lá. Preenche agora.
      var fusoEl = host.querySelector(".cal-fuso");
      if (fusoEl && meta.fuso) fusoEl.textContent = meta.fuso;

      var rodape = document.getElementById("cal-sources");
      if (rodape && meta.fontes) rodape.textContent = meta.fontes;
      var upd = document.getElementById("cal-updated");
      if (upd && meta.atualizado) upd.textContent = "Atualizado em " + dataCurta(meta.atualizado);

      if (state.atualizando) {
        // A data que interessa é a de publicação do arquivo, não a hora do
        // clique: dizer "atualizado agora" sugeriria dado novo quando o
        // arquivo pode ser o mesmo da semana passada.
        encerrarAtualizacao(host, meta.atualizado !== atualizadoAntes
          ? "Dados novos carregados (arquivo de " + dataCurta(meta.atualizado) + ")."
          : "Você já está com a versão mais recente" +
            (meta.atualizado ? " (arquivo de " + dataCurta(meta.atualizado) + ")." : "."));
      }
    }).catch(function (e) {
      if (carregando.parentNode) host.removeChild(carregando);
      if (state.atualizando) encerrarAtualizacao(host, "Falha ao atualizar.");
      var box = el("div", "state-message error");
      var strong = document.createElement("strong");
      strong.textContent = "Não foi possível carregar o calendário.";
      var msg = document.createElement("p");
      msg.textContent = e.message + " — veja calendar/README.md ou recarregue em alguns minutos.";
      box.appendChild(strong); box.appendChild(msg);
      host.appendChild(box);
    });
  }

  function init() {
    readUrl();
    buildModal();
    buildFiltros();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
