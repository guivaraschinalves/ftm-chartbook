#!/usr/bin/env python3
"""Gera o manifest.json com a lista de imagens de charts/.

Por que este arquivo existe: o site lia a lista de gráficos direto da API
pública do GitHub, que permite 60 requisições por hora **por IP** — um teto
compartilhado por todo mundo que sai pelo mesmo IP (um escritório atrás de
um NAT, por exemplo, esgota isso sem nenhuma visita ao site). Quando o teto
estoura, a API responde 403 e a galeria não desenha nada.

Com o manifest, o site lê um arquivo estático servido pelo próprio GitHub
Pages: mesma origem, sem limite, sem depender da API.

O formato imita o trecho da resposta da API que o app.js consome
(uma lista de {path, type}), de propósito: assim buildSectionsAndCharts()
não precisa mudar e a chamada à API continua funcionando como fallback,
caso o manifest não exista.
"""

import datetime
import json
import os

RAIZ = "charts"
EXTENSOES = (".png", ".jpg", ".jpeg", ".webp", ".gif")
SAIDA = "manifest.json"


def coletar(raiz):
    entradas = []
    for dirpath, dirnames, filenames in os.walk(raiz):
        dirnames.sort()
        for nome in sorted(filenames):
            if nome.lower().endswith(EXTENSOES):
                caminho = os.path.join(dirpath, nome).replace(os.sep, "/")
                entradas.append({"path": caminho, "type": "blob"})
    entradas.sort(key=lambda e: e["path"])
    return entradas


def main():
    if not os.path.isdir(RAIZ):
        raise SystemExit(f"pasta '{RAIZ}/' não encontrada — rode na raiz do repositório")

    entradas = coletar(RAIZ)
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")

    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(
            {"generated": agora, "count": len(entradas), "tree": entradas},
            f,
            ensure_ascii=False,
            indent=1,
        )
        f.write("\n")

    print(f"{SAIDA}: {len(entradas)} imagens em {RAIZ}/")


if __name__ == "__main__":
    main()
