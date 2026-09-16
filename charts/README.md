# Pasta de gráficos

O site descobre os gráficos sozinho a partir da estrutura desta pasta —
**não existe nenhum arquivo de configuração para manter atualizado.**
Adicionar, remover, renomear ou reordenar um gráfico é só mexer nos
arquivos aqui (direto pela interface do GitHub, sem precisar de terminal).

## Estrutura esperada

```
charts/
  01 Visão geral/
    01 - Balanço de Pagamentos do Brasil - Acumulado em 12 meses/
      grafico.png
    02 - Balanço de Pagamentos do Brasil - Acumulado em 3 meses/
      grafico.png
    ...
  02 Conta corrente/
    01 - Conta Corrente do Brasil - Acumulado em 12 meses/
      grafico.png
    ...
```

Três regras:

1. **Uma pasta por tema**, nomeada `"NN Nome do tema"` — o número controla a
   ordem do tema no menu lateral e na página; o texto depois do número é o
   nome exibido.
2. **Uma pasta por gráfico** (o "slot"), nomeada `"NN - Título -
   Subtítulo"` — o número controla a ordem dentro do tema; título e
   subtítulo (opcional) são exibidos no card. Se não tiver subtítulo, é só
   `"NN - Título"`. **Essa pasta é a identidade do gráfico** — é o nome
   dela, não o do arquivo lá dentro, que define título/ordem/tema.
3. **Um arquivo de imagem dentro de cada pasta-slot** — o nome do arquivo
   não importa (pode ser o nome que o PowerPoint exportou, tipo
   `Slide7.PNG`, sem precisar renomear); só a extensão precisa ser uma das
   aceitas.

## Por que uma pasta a mais (e não só o nome do arquivo)?

Antes, o nome do **arquivo** era a identidade do gráfico — pra atualizar,
era preciso renomear o PNG exportado pra bater exatamente com o nome já
existente, ou virava um gráfico duplicado em vez de substituir. Agora a
identidade é o nome da **pasta** (o "slot"), criada uma vez; o arquivo
dentro dela pode ter qualquer nome. Isso separa duas coisas que antes
estavam presas juntas: nomear o gráfico (acontece uma vez, ao criar o
slot) e subir uma imagem nova (acontece toda vez que atualiza).

## Atualizando um gráfico existente

1. Abra a pasta-slot do gráfico (dentro da pasta do tema).
2. **"Add file" → "Upload files"**, arraste a imagem nova.
   - Se você sempre subir com o **mesmo nome de arquivo** (sugestão:
     `grafico.png`, sempre), o GitHub substitui o conteúdo automaticamente
     num commit só.
   - Se subir com um nome diferente do que já está lá, os dois arquivos
     ficam na pasta — o site mostra o gráfico normalmente, mas com um
     aviso visível dizendo que tem arquivo sobrando. Apague o antigo pra
     tirar o aviso.

## Criando um gráfico novo

1. Em **"Add file" → "Upload files"**, no campo de nome digite o caminho
   completo incluindo a pasta-slot nova, ex:
   `02 Conta corrente/03 - Novo Gráfico - Detalhe/grafico.png` — o GitHub
   cria as pastas que ainda não existem ao subir o primeiro arquivo nelas.
2. Pronto — nenhum outro arquivo do projeto precisa mudar.

## Reordenando ou renomeando um slot

O GitHub não tem um botão de "renomear pasta". Duas formas de fazer:

- **Mais simples**: abra o único arquivo dentro do slot, clique no ícone
  de lápis (editar), e mude o **caminho completo** que aparece no campo de
  nome no topo (não só o nome do arquivo) — isso move o arquivo pra uma
  pasta com nome novo, efetivamente renomeando o slot.
- **Alternativa**: apague a pasta-slot inteira e suba de novo com o
  nome/número certo.

## Agrupando vários temas sob um assunto maior (opcional)

Se um assunto (ex: Balanço de Pagamentos) tem vários temas e você quer que
eles apareçam juntos, visualmente separados de outros assuntos, crie mais
um nível de pasta acima do tema:

```
charts/
  01 Balanço de Pagamentos - Brasil/
    01 Visão geral/
      01 - Balanço de Pagamentos do Brasil - Acumulado em 12 meses/
        grafico.png
      ...
    02 Conta corrente/
      ...
  02 Outro Assunto/
    01 Algum tema/
      01 - Gráfico/
        grafico.png
```

O número no início de `"01 Balanço de Pagamentos - Brasil"` ordena esse
assunto entre os outros assuntos (e entre temas soltos, se você tiver
algum) — mesma regra do número em qualquer nível de pasta, um nível acima
do tema. Temas sem esse nível extra continuam funcionando normalmente (dá
pra misturar temas soltos com assuntos agrupados).

### Destacando um assunto especial (edição/evento)

Termine o nome da pasta do assunto com `!` (ex: `"00 Superquarta - 16 de
Setembro !"`) para que ele apareça em azul, em destaque, no menu lateral —
útil pra uma edição especial ligada a um evento (decisão de juros, dado
extraordinário) que você quer que salte aos olhos entre os assuntos de
sempre. O `!` não aparece no nome exibido; sem ele, o assunto é tratado
normalmente.

A ordem dos níveis é sempre **assunto → tema → slot → gráfico** — não crie
pastas dentro da pasta-slot (o nível mais profundo é sempre o arquivo de
imagem).

## O que isso resolve

- **Atualizar um gráfico não exige mais acertar o nome na régua** — o
  título já está fixo no nome da pasta-slot; a imagem nova pode ter
  qualquer nome.
- **Novo tema que não é do Balanço de Pagamentos?** Crie uma pasta nova
  (`06 Nome do tema`) e coloque slots dentro — o site já reconhece na
  próxima visita, sem precisar editar nada.
- **A ordem ou composição dos gráficos do PowerPoint mudou?** Não importa
  — o número no nome da pasta-slot é escolhido por você, não pelo
  PowerPoint.
- **Vai ter mais de 100 gráficos?** Cada tema é uma pasta separada — dá pra
  navegar e substituir arquivos pelo GitHub sem precisar rolar uma lista
  gigante de nomes genéricos.

## Cuidados ao nomear

- As regras abaixo valem pro nome das **pastas** (tema, assunto, slot) —
  o nome do **arquivo de imagem** dentro do slot não segue regra nenhuma,
  pode ser qualquer coisa.
- Evite `%` no nome da pasta (alguns sistemas tratam como código de
  escape) — troque por "pct" ou reescreva.
- `/` não pode aparecer no nome (viraria mais uma subpasta).
- Acentos e espaços funcionam normalmente.
- Extensões de imagem aceitas: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`.

## Um gráfico não aparece / aparece com nome estranho

- Confira se a imagem está dentro de uma pasta-slot, dentro de uma pasta
  de tema (`charts/<tema>/<slot>/<arquivo>`) — uma imagem solta direto na
  pasta do tema, sem a pasta-slot, não aparece mais (formato antigo,
  aposentado).
- Mais de uma imagem na mesma pasta-slot? O gráfico aparece com um aviso
  no card dizendo qual arquivo está sobrando — apague o extra.
- Sem o número inicial (`NN - `) no nome da pasta-slot, o gráfico ainda
  aparece, só entra por último e usa o nome da pasta inteiro como título —
  funciona como fallback, mas o ideal é sempre nomear com o padrão acima.

## Como exportar do PowerPoint

Veja o README.md na raiz do projeto.
