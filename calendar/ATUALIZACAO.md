# Como atualizar o calendário (procedimento da rotina semanal)

Este arquivo é o roteiro seguido pela rotina automática que roda **toda
segunda-feira às 7:00 (horário de Brasília)**. Ele também serve para atualizar
o calendário à mão.

Leia primeiro o `calendar/README.md` — ele define o formato dos arquivos e os
campos. Este documento é sobre **o processo**, não sobre o formato.

---

## Regras invioláveis

1. **Nunca invente data, projeção ou valor efetivo.** Se não der para confirmar
   numa fonte, deixe o campo vazio (`""`) ou não crie o evento. Este é um site
   público de finanças: dado ausente é honesto, dado inventado é dano.
2. **Não apague evento já cadastrado** só porque a fonte do momento não o
   mostra. As fontes têm janelas curtas; o evento pode ter sido cadastrado a
   partir de um calendário oficial que a fonte de consenso não cobre.
3. **Horário sempre convertido para Brasília (UTC-3, sem horário de verão)**, na
   hora de escrever o arquivo — nunca deixe a conversão para o navegador. Erro
   de fuso joga o evento para o dia errado e corrompe a grade. Divulgação
   asiática cai na véspera em horário brasileiro; registre o horário local no
   campo `obs` (ex.: `"30/09 09:30 em Pequim"`).
4. **Valores são texto entre aspas**, nunca número JSON solto: a vírgula decimal
   brasileira invalidaria o arquivo inteiro.
5. **Valide antes de commitar**: `python3 -m json.tool calendar/AAAA-MM.json`.
6. **Não faça commit vazio.** Se nada mudou, apenas relate.
7. Não mexa em nada fora de `calendar/`.

---

## Passo a passo

### 1. Delimite a janela
`date -u` para a data de hoje. A janela vai da **segunda desta semana** até
**domingo 4 semanas depois** (35 dias). Garanta que exista um
`calendar/AAAA-MM.json` para cada mês que a janela toca — se a janela entrou
num mês novo, crie o arquivo seguindo o formato dos existentes.

### 2. Atualize projeções e efetivos (fonte: Bigdata.com)
Chame `bigdata_country_tearsheet` uma vez por país: **BR, US, AR, CN, JP**.
Cada resposta traz duas seções úteis:

- **Economic Calendar - Upcoming Events** — eventos próximos, com consenso
- **Macroeconomic Overview** — eventos já divulgados, com actual / consensus /
  previous

Case pelo indicador + período de referência e preencha `projecao`, `efetivo` e
`anterior` dos eventos já cadastrados. Os horários vêm em **UTC** — converta.

Se um evento relevante aparecer na fonte e ainda não estiver cadastrado dentro
da janela, acrescente.

### 3. Complete a semana que acabou de entrar
A quinta semana da janela é nova a cada segunda. O consenso ainda não existe
para ela (ele se forma dias antes de cada divulgação) — então acrescente os
eventos **pelas datas dos calendários oficiais**, com `projecao` vazia.

### 4. Feche
- Atualize o campo `atualizado` de cada arquivo tocado.
- Valide o JSON.
- Commit e push no `master` (vai direto para o ar).
- Assine o commit com `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## Fontes que funcionam

| País | O quê | Onde |
|---|---|---|
| BR | IPCA, IPCA-15, INPC | `https://ftp.ibge.gov.br/Precos_Indices_de_Precos_ao_Consumidor/Sistema_de_Indices_de_Precos_ao_Consumidor/Calendario/ipca_inpc_ipca15_coleta_divulgacao.csv` (CSV, baixe com `curl`) |
| BR | Copom | `https://www.bcb.gov.br/controleinflacao/calendariocopom` (é SPA; se não renderizar, busque na web) |
| US | CPI, PPI, payroll, JOLTS | `https://www.bls.gov/schedule/2026/MM_sched.htm` (troque `MM` pelo mês) |
| US | PIB, PCE, balança comercial | `https://www.bea.gov/news/schedule` |
| US | FOMC | `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm` |
| AR | tudo | `https://www.indec.gob.ar/ftp/cuadros/publicaciones/calendario_2sem2026.pdf` (PDF; extraia com `pip install pypdf` + `pypdf`) |
| JP | BoJ, Tankan | `https://www.boj.or.jp/en/about/calendar/index.htm` e `https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm` |
| CN | agenda NBS | `https://www.stats.gov.cn/english/PressRelease/ReleaseCalendar/` |

## Fontes que NÃO funcionam (não perca tempo)

- **Site do IBGE** (`ibge.gov.br/calendario/...`) — responde **403** a requisição
  automatizada. Use o CSV do FTP acima.
- **API `servicodedados.ibge.gov.br`** — não resolve DNS.
- **Investing.com** — **403**, e scraping viola os termos deles.
- **Trading Economics** conta `guest` — descontinuada (**410**).
- **Página de calendário do NBS chinês** — o HTML é lido de forma inconsistente
  por leitores automáticos (leituras diferentes da mesma página se contradizem).
  Confirme padrão pela série histórica do tearsheet do Bigdata antes de usar.
  Exemplo já verificado: o PMI oficial sai **no último dia do mês**.

---

## Sobre o consenso

A projeção vem da **FXStreet** (via Bigdata.com), **não da Reuters**. Se a fonte
mudar, atualize também o campo `fontes` no topo de cada arquivo JSON — ele é
exibido no rodapé da barra lateral do site.

É normal e esperado que as semanas mais distantes fiquem com projeção vazia.
