(function () {
  "use strict";

  // Compartilhado por index.html e calendario.html — tela cheia da página
  // inteira (sidebar + conteúdo), via Fullscreen API do navegador. Não
  // confundir com a tela cheia do lightbox de gráfico (essa é outra
  // funcionalidade, só dentro de app.js). Não depende de app.js nem de
  // calendar.js, então funciona em qualquer uma das duas páginas sozinho.

  function elFullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function suportado() {
    var el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  }

  function entrar() {
    var el = document.documentElement;
    var p = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen();
    if (p && p.catch) p.catch(function () { /* recusa do navegador — não é erro nosso */ });
  }

  function sair() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }

  function sincronizar(btn) {
    var ativo = !!elFullscreen();
    btn.setAttribute("aria-pressed", ativo ? "true" : "false");
    var rotulo = ativo ? "Sair da tela cheia" : "Ver a página em tela cheia";
    btn.setAttribute("aria-label", rotulo);
    btn.title = rotulo;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("page-fullscreen-toggle");
    if (!btn) return;
    if (!suportado()) { btn.hidden = true; return; }
    sincronizar(btn);
    btn.addEventListener("click", function () {
      if (elFullscreen()) sair(); else entrar();
    });
    document.addEventListener("fullscreenchange", function () { sincronizar(btn); });
    document.addEventListener("webkitfullscreenchange", function () { sincronizar(btn); });
  });
})();
