# O lado PowerPoint do chartbook

Este diretório guarda a macro VBA que leva os gráficos do PowerPoint até o
site, e o registro de como o processo funciona. O repositório em si é o
site; aqui é a ferramenta que o alimenta.

- **`Modulo1.bas`** — a macro. Cole o conteúdo num módulo do VBA do seu
  `.pptm` (`Alt+F11` → `Inserir → Módulo`).

## O fluxo mensal, em dois passos

1. Atualize os dados na planilha do Excel.
2. No PowerPoint: `Alt+F8` → **`AtualizarEPublicarSlides`** → Executar.

Isso atualiza os gráficos a partir do Excel vinculado, move os rótulos para
o último ponto de cada série, exporta cada slide em PNG 1920x1080, e publica
cada um direto na sua pasta-slot no GitHub — tudo em **um commit**. A Action
regenera o `manifest.json` e o GitHub Pages republica sozinho.

Se você costuma arrastar rótulos à mão para não sobrepor linha, rode
`AtualizarRotulos` sozinho primeiro, ajuste o que precisar, e só então
`PublicarNoGithub`. Na macro mestre as duas coisas acontecem em sequência,
sem parada no meio.

## As macros

| Macro | Para quê |
|---|---|
| `AtualizarEPublicarSlides` | o fluxo mensal inteiro |
| `AtualizarRotulos` | só os rótulos, mostrando o resumo |
| `ExportarSlidesPNG` | só exporta local e abre a pasta + github.dev (plano B se a API falhar) |
| `PublicarNoGithub` | só publica |
| `DefinirSlotsDosSlides` | uma vez por deck: grava o destino em cada slide |
| `VerificarSlots` | confere os destinos contra o repositório, sem publicar nada |
| `TestarConexaoGithub` | testa token e branch, sem publicar nada |

Só aparecem no `Alt+F8` as `Sub` sem nenhum parâmetro — é por isso que
existem macros curtas que só chamam outra passando um argumento.

## Configuração, antes do primeiro uso

No topo do módulo, preencha:

- **`pastaExportacao`** — pasta local onde os PNGs são gravados antes de
  subir. Precisa terminar com `\`.
- **`GITHUB_TOKEN_FILE`** — caminho de um arquivo de texto contendo **só** o
  Personal Access Token, na primeira linha.

O token deve ser **fine-grained**, com o `ftm-chartbook` explicitamente
selecionado em "Repository access", permissão **Contents: Read and write**, e
uma data de expiração. Selecionar o repositório é o passo que quase todo
mundo esquece — sem ele a API responde `404`, não `403`.

**Nunca coloque o token dentro do `.pptm` nem em nenhum arquivo deste
repositório.** Ele fica num arquivo local, fora de qualquer pasta
sincronizada.

## Como adicionar um tópico novo

Este é o roteiro reusável. Suponha um tema novo, "Emprego - Brasil".

**1. Monte o deck.** Um gráfico por slide. Slides marcados como ocultos são
pulados na exportação — é assim que você tira capa, sumário ou rascunho do
publish sem mexer em código.

**2. Crie as pastas-slot** em `charts/`, seguindo o formato descrito em
[`../charts/README.md`](../charts/README.md):

```
charts/Emprego - Brasil/01 Visão geral/01 - Taxa de Desemprego - PNAD Contínua/grafico.png
```

O nome da **pasta-slot** é a identidade do gráfico — é ele que define
título, subtítulo e ordem no site. O nome do arquivo dentro dela não
importa, mas use sempre `grafico.png`: assim a atualização do mês seguinte
substitui o conteúdo em vez de deixar dois arquivos no slot.

Duas restrições ao nomear pastas: sem `:` (caractere inválido em nome de
arquivo no Windows, quebra o checkout do repositório) e sem `%` (alguns
sistemas tratam como código de escape). Acento e espaço funcionam.

**3. Acrescente as linhas em `DefinirSlotsDosSlides`**, uma por slide:

```vb
Const A As String = "charts/Emprego - Brasil/"
DefinirSlot 1, A & "01 Visão geral/01 - Taxa de Desemprego - PNAD Contínua"
```

O caminho é a **pasta-slot**, sem o `/grafico.png` no fim — a macro
acrescenta isso.

**4. Rode `DefinirSlotsDosSlides`** uma vez, e depois **`VerificarSlots`**.
O relatório deve mostrar todos os slides com slot válido e zero
"NAO EXISTE NO REPO". Se aparecer algum inexistente, o caminho está errado
ou a pasta ainda não foi criada.

**5. Rode `AtualizarEPublicarSlides`.**

O passo 4 não vale pular: ele não escreve nada e é o único jeito de
descobrir um caminho errado antes de publicar.

## Por que as coisas são assim

Cada decisão abaixo veio de um problema real.

**Um commit para o lote inteiro, não um por arquivo.** A Contents API do
GitHub cria um commit por arquivo. Com 12 gráficos isso virava 12 commits em
30 segundos, e cada commit dispara um build do GitHub Pages: **11 dos 12
builds falhavam** e o site ficava fora do ar nesse intervalo. A macro usa a
Git Data API — sobe os PNGs como *blobs* (que não criam commit), monta uma
*tree*, cria um commit e move a branch. A branch só se move no último passo,
então uma falha no meio não deixa o repositório com metade dos gráficos
novos.

**O destino mora dentro do slide, não numa tabela por número.** Cada slide
guarda seu caminho numa `Slide.Tags` (chave `FTMSLOT`), invisível e salva no
arquivo. Um mapeamento por índice de slide quebraria em silêncio na primeira
vez que você reordenasse os slides, mandando o gráfico para o slot errado.

**A macro valida o slot contra a árvore real do repositório** antes de
escrever. Sem isso, um caminho digitado torto cria uma pasta nova em
silêncio — foi exatamente o que aconteceu quando a macro apontava para
`inbox/` em vez de `_inbox/`. Slot que não existe cai no `_inbox` e a macro
avisa quais foram.

**Slot inexistente vai para o `_inbox`, não dá erro.** Gráfico novo ainda
não tem slot; ele precisa de um lugar seguro para pousar em vez de sumir ou
criar pasta errada.

**96 DPI.** O slide tem 20 polegadas de largura, então 96 DPI dá exatamente
1920x1080, a mesma resolução dos gráficos que já estavam no site. Com 144
DPI saíam 2880x1620 e ~1 MB por arquivo — o dobro do peso, sem ganho visível
numa página web.

**Rótulos só onde já existe rótulo.** A versão antiga apagava todos os
rótulos da série antes de religar um, o que destruía qualquer ajuste manual.
Agora: série sem rótulo nenhum fica intacta (foi silenciada de propósito), e
série cujo rótulo já está no último ponto não é recriada, preservando
posição arrastada à mão. Rodar a macro duas vezes sem dado novo não muda
nada.

**Nada é commitado se nada mudou.** Se a *tree* nova sair idêntica à
anterior, os PNGs não mudaram de conteúdo e a macro não cria commit — senão
sobrariam commits vazios no histórico e builds do Pages à toa.

**O JSON vai em ASCII puro.** Os caminhos dos slots têm acento ("Visão
geral", "Núcleos") e o WinHttp não é confiável ao enviar string não-ASCII no
corpo da requisição. A macro converte cada acento em `\uXXXX`.

## Armadilhas do VBA que custaram tempo

**`Const` só na seção de declarações, no topo do módulo.** Uma `Const` de
nível de módulo colocada depois de qualquer `Sub`/`Function` gera o erro
"Somente comentários podem aparecer após End Sub, End Function ou End
Property" — a mensagem é literal, mas aponta para a linha da `Const`, que
parece perfeita. O erro é a *posição*, não o conteúdo.

**Compile antes de rodar.** `Debug → Compile VBA Project` pega erro de
digitação na hora, em vez de no meio de uma publicação.

## Armadilhas da API do GitHub

**`GET /git/ref/...` no singular, `PATCH /git/refs/...` no plural.** Não é
erro de digitação, é assim mesmo.

**A resposta de um commit traz o sha dele antes do sha da tree.** Pegar o
primeiro `"sha"` da resposta devolve o commit, não a tree. A macro tem um
extrator que aceita "procure só depois desta chave".

**`404` costuma significar permissão, não caminho errado.** A API responde
404 em vez de 403 para não revelar se um recurso existe. Um `404` no PUT
quase sempre é token sem acesso ao repositório — ou, como já aconteceu aqui,
uma branch que não existe (o repositório usa `master`, não `main`).

**Leia o corpo da resposta em caso de erro.** `Status` e `StatusText` não
dizem nada; o corpo diz "Bad credentials", "Branch not found",
"Resource not accessible by personal access token".
