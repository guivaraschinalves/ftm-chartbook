# Chart Book

Site estático (HTML/CSS/JS puro, sem build, sem dependências) que publica
gráficos exportados como **imagem do PowerPoint** — no estilo do chart book
da Yardeni Research: uma galeria organizada por tema, não gráficos
interativos reconstruídos em código.

## Por que imagem, e não gráfico interativo

Uma versão anterior deste projeto redesenhava cada gráfico em código
(SVG/JS), tentando reproduzir o visual do Excel/PowerPoint — o que só
funciona bem se você reconstrói cada gráfico à mão, o que não escala.
Sites como o do Yardeni fazem o oposto: o gráfico é desenhado **uma vez**,
na ferramenta que já se conhece (aqui, PowerPoint), e o site só exibe a
imagem exportada. Atualizar = reexportar e trocar o arquivo.

## Por que pastas, e não um arquivo de configuração

Uma versão anterior listava cada gráfico manualmente em `config.js`. Isso
quebrava assim que o projeto precisasse de mais de um assunto (não só
Balanço de Pagamentos), a ordem dos slides no PowerPoint mudasse, ou o
número de gráficos passasse de umas dezenas — qualquer uma dessas coisas
exigia editar código.

Agora **o site lê a estrutura de pastas do próprio repositório** (via API
do GitHub) e monta a galeria sozinho: uma pasta por tema, um arquivo por
gráfico, o nome de cada um já diz onde ele entra. Adicionar, remover,
renomear ou reordenar um gráfico é só mexer em arquivos — direto pela
interface do GitHub, sem editar nenhum código. Veja `charts/README.md`
para o formato exato.

## Estrutura

```
index.html    → casca da página (sidebar, cabeçalho) — não precisa editar
styles.css    → visual (cores, tipografia, layout)
app.js        → descobre os gráficos (lê o manifest.json) e monta a galeria
config.js     → ← É AQUI que você mexe: marca do site e qual repositório ler
charts/       → ← os PNGs entram aqui, organizados por pasta (veja charts/README.md)
manifest.json → lista dos gráficos, gerada automaticamente — não edite à mão
scripts/      → o gerador do manifest.json (roda na Action, não no seu PC)
powerpoint/   → a macro do PowerPoint que exporta e publica (veja powerpoint/README.md)
calendario.html → página do calendário econômico
calendar.js   → monta o calendário (lê os JSON locais, sem API do GitHub)
calendar/     → ← os eventos entram aqui, um JSON por mês (veja calendar/README.md)
README.md     → este arquivo
```

## Calendário econômico

Além da galeria de gráficos, o site publica um **calendário econômico** em
`calendario.html` (link no topo da barra lateral). Ele mostra uma semana por
vez — da semana corrente até 4 semanas à frente — com as divulgações de Brasil,
Estados Unidos, Argentina, China e Japão.

Diferente da galeria, o calendário **não usa a API do GitHub**: ele lê arquivos
JSON locais (`calendar/AAAA-MM.json`), então carrega na hora e não consome o
limite de requisições. Os dados são mantidos manualmente — veja
`calendar/README.md` para o formato e para as fontes.

## Como exportar os gráficos do PowerPoint

Exporte do jeito que for mais fácil — **o nome do arquivo exportado não
importa mais**, só o nome da pasta-slot onde ele entra (veja abaixo).

**Se o slide tem só o gráfico** (a maioria dos casos):
`Arquivo → Exportar → Alterar Tipo de Arquivo → PNG` (ou `Salvar Como` →
formato PNG) → escolha **"Todos os Slides"**. O PowerPoint salva cada
slide como um PNG separado numa pasta, com nomes genéricos
(`Slide1.PNG`, `Slide2.PNG`...) — pode subir exatamente assim, sem
renomear.

**Se o slide tem outros elementos junto** (título solto, nota de rodapé
fora do gráfico): clique direito em cima do gráfico → **Salvar como
Imagem** — exporta só o gráfico, recortado, sem o resto do slide.

## Gerenciando os gráficos pelo GitHub (sem terminal)

Cada gráfico é uma **pasta-slot** (`charts/<tema>/<Título - Subtítulo>/`)
com uma imagem dentro — o nome da pasta é a identidade do gráfico; o nome
do arquivo de imagem lá dentro não importa. Veja `charts/README.md` para
o formato completo (inclui como agrupar vários temas sob um assunto
maior). Resumo do dia a dia:

**Atualizar um gráfico existente** (a tarefa mais comum):
1. No repositório, entre em `charts/` → pasta do tema → pasta do gráfico
   (o slot) → você vai ver a imagem atual.
2. Clique em **"Add file" → "Upload files"** (canto superior direito da
   lista de arquivos).
3. Arraste a imagem nova. Se você sempre usar o mesmo nome de arquivo
   (sugestão: `grafico.png`, sempre), o GitHub substitui o conteúdo num
   commit só. Se usar um nome diferente, os dois ficam na pasta e o site
   mostra um aviso no card — aí é só apagar o antigo depois.
4. Role até o fim, clique **"Commit changes"**. Em ~1 minuto o GitHub
   Pages já republicou. Se abrir o site e a imagem parecer a mesma de
   antes, é cache do navegador — dá um `Ctrl+Shift+R` (ou `Cmd+Shift+R`
   no Mac) pra forçar recarregar.

**Gráfico novo**: em "Add file → Upload files", digite no campo de nome o
caminho completo incluindo a pasta-slot nova, ex:
`02 Conta corrente/03 - Novo Gráfico - Detalhe/grafico.png` — o GitHub
cria as pastas que faltarem ao subir o primeiro arquivo nelas.

**Tema novo**: mesma ideia, um nível acima:
`06 Nome do Tema/01 - Primeiro Gráfico/grafico.png`.

**Reordenar ou renomear um slot**: o GitHub não tem botão de "renomear
pasta". Abra o arquivo de dentro do slot, clique no lápis (editar), e
mude o **caminho completo** no campo de nome no topo (não só o nome do
arquivo) — isso move o arquivo pra uma pasta com nome novo. Ou, mais
simples: apague a pasta-slot inteira e suba de novo com o nome certo.

**Remover**: apague o arquivo de dentro do slot — a pasta some sozinha
(o git não guarda pasta vazia).

## Testar localmente

```
cd ftm-chartbook
python3 -m http.server 8000
```

Abra `http://localhost:8000`. Como a lista de gráficos vem da API pública
do GitHub, o teste local já reflete o que está publicado no repositório
(não o que está só no seu disco, se ainda não deu `git push`).

## Publicar

```
cd ftm-chartbook
git add .
git commit -m "Atualiza gráficos"
git push
```

O GitHub Pages já está configurado neste repositório — o site atualiza
sozinho alguns minutos depois do push. Sem terminal? Dá pra fazer tudo
(criar pasta, subir arquivo, renomear, apagar) direto pela interface do
GitHub, sem nunca abrir um terminal.

## Como o site sabe quais gráficos existem (`manifest.json`)

O site lê a lista de gráficos de um arquivo estático, o `manifest.json`,
servido pelo próprio GitHub Pages. Ele é **gerado automaticamente**: a Action
em `.github/workflows/manifest.yml` roda `scripts/gerar_manifest.py` a cada
push que mexe em `charts/` e comita o arquivo atualizado. Você nunca precisa
editá-lo à mão — continua valendo que organizar gráfico é só mexer em pasta.

Antes, essa lista vinha da API pública do GitHub a cada visita. O problema é
que essa API permite **60 requisições por hora por IP** sem login, e esse
teto é compartilhado por tudo que sai pelo mesmo IP — num escritório atrás
de um NAT, a extensão de IDE de um colega, um `npm install` ou o navegador
de outra pessoa consomem o mesmo saldo. Quando estoura, a API responde 403 e
a galeria não desenha nada: o site parece "não abrir", sem que ninguém tenha
sequer visitado ele. Lendo um arquivo da mesma origem, esse limite deixa de
existir (e a lista ficou ~6x menor de baixar).

A chamada à API foi **mantida como fallback**: se o `manifest.json` não
existir ou vier inválido, o `app.js` avisa no console e volta a consultar a
API, como antes. Um checkout onde a Action nunca rodou continua funcionando.

**Se um gráfico novo não aparecer no site**, confira na aba Actions se a
execução do "Atualiza o manifest.json" passou — é ela que registra o arquivo
novo na lista.
