# Caixa de entrada (temporária)

Pasta só pra você soltar os PNGs exportados do PowerPoint todo mês.
Não faz parte do site — é só um ponto de entrega pro Claude organizar
depois.

## Como usar

1. No PowerPoint: **Arquivo → Exportar → Alterar Tipo de Arquivo → PNG →
   Todos os Slides**. Isso gera `Slide1.PNG`, `Slide2.PNG`, ... na ordem
   do deck.
2. Aqui nesta pasta (`_inbox/`), no GitHub: **Add file → Upload files**,
   arraste todos os PNGs de uma vez, **Commit changes**.
3. Avise que subiu — o Claude puxa (`git pull`), distribui cada imagem
   pro slot certo em `charts/`, comita, faz push, e esvazia esta pasta
   de novo.

Não precisa renomear nada antes de subir — os nomes `SlideN.PNG` bastam.
