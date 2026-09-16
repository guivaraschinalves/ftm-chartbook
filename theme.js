(function () {
  "use strict";

  // Compartilhado por index.html e calendario.html — não depende de app.js
  // nem de calendar.js, então funciona em qualquer uma das duas páginas
  // sozinho, na ordem que for carregado.
  var STORAGE_KEY = "ftm-theme";

  function efetivo() {
    var explicito = document.documentElement.getAttribute("data-theme");
    if (explicito === "light" || explicito === "dark") return explicito;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function aplicar(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    try { localStorage.setItem(STORAGE_KEY, tema); } catch (e) { /* modo privado etc. — só não persiste */ }
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    var indoPara = tema === "dark" ? "claro" : "escuro";
    btn.setAttribute("aria-pressed", tema === "dark" ? "true" : "false");
    btn.setAttribute("aria-label", "Ativar modo " + indoPara);
    btn.title = "Ativar modo " + indoPara;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    // Sincroniza aria-pressed/label com o tema já aplicado (pelo script
    // inline no <head>, que evita o flash, ou pelo padrão do sistema).
    aplicar(efetivo());
    btn.addEventListener("click", function () {
      aplicar(efetivo() === "dark" ? "light" : "dark");
    });
  });
})();
