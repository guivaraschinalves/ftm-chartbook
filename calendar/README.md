# Calendário econômico

O site lê os eventos de um arquivo JSON por mês nesta pasta — `AAAA-MM.json`.
O nome do arquivo é calculado a partir da data de hoje, então **não existe
índice nem lista para manter atualizada**: basta o arquivo existir com o nome
certo.

A página é `calendario.html`, na raiz do repositório. Ela mostra **uma semana
por vez**, navegável da semana corrente até **4 semanas à frente**.

## De onde vêm os dados

| O quê | Fonte |
|---|---|
| **Datas** das divulgações | Calendários oficiais: IBGE, BCB (Copom), BLS, BEA, Federal Reserve (FOMC), INDEC, NBS e Bank of Japan |
| **Projeção** (consenso), **anterior** e **efetivo** | FXStreet, via [Bigdata.com](https://bigdata.com) |

⚠️ **A projeção não é o consenso da Reuters.** É o consenso publicado pela
FXStreet. Se um dia a fonte mudar, troque também o texto do campo `fontes` no
topo de cada arquivo — ele é exibido no rodapé da barra lateral.

⚠️ **Consenso não existe com semanas de antecedência.** Ele se forma nos dias
que antecedem cada divulgação. É normal e esperado que as semanas mais
distantes mostrem o evento agendado com a projeção vazia (`—`).

## Formato

```json
{
  "mes": "2026-09",
  "fuso": "Horário de Brasília (GMT-3)",
  "atualizado": "2026-09-09",
  "fontes": "Datas: calendários oficiais (...). Projeções: FXStreet via Bigdata.com.",
  "eventos": [
    {
      "data": "2026-09-16",
      "hora": "18:30",
      "pais": "BR",
      "indicador": "Decisão do Copom — Taxa Selic",
      "referencia": "Reunião de 15-16/set",
      "importancia": "alta",
      "anterior": "14,00%",
      "projecao": "",
      "efetivo": "",
      "fonte": "BCB",
      "obs": "Comunicado após o fechamento do mercado"
    }
  ]
}
```

### Campos

| Campo | Obrigatório | Regra |
|---|---|---|
| `data` | sim | `"AAAA-MM-DD"`. Evento sem data válida é ignorado, com aviso na tela |
| `hora` | sim (pode ser `""`) | `"HH:MM"`, **já convertida para Brasília**. `""` aparece como "no dia" e ordena por último |
| `pais` | sim | `BR`, `US`, `AR`, `CN` ou `JP`. País desconhecido aparece com as letras em cinza, para o erro ficar visível |
| `indicador` | sim | Nome exibido |
| `referencia` | não | Período a que o dado se refere (ex.: `"Agosto/2026"`) |
| `importancia` | não | `"alta"`, `"media"` ou `"baixa"`. Padrão: `"media"` |
| `anterior` / `projecao` / `efetivo` | não | Valores como texto (ver abaixo) |
| `fonte` | não | Órgão divulgador |
| `obs` | não | Nota livre; aparece só no detalhe do evento |

### Três regras que evitam dor de cabeça

1. **Todo valor é texto, entre aspas — nunca número solto.** `"anterior": 0,26`
   é JSON inválido: a vírgula decimal quebra o arquivo inteiro. Como texto,
   `"0,26%"`, `"14,00%"`, `"-88,60 US$ bi"` e `"3,75%–4,00%"` funcionam, e você
   cola exatamente o que a fonte publicou.
2. **Vírgula entre eventos, nunca depois do último.** `}, ]` é o erro mais
   comum. Se acontecer, a página mostra o nome do arquivo e a posição do erro
   em vez de ficar em branco.
3. **Horário sempre em Brasília.** A conversão é feita na hora de escrever o
   arquivo, não no navegador: erro de fuso joga o evento para o dia errado e
   corrompe a grade inteira. Para divulgações da Ásia isso significa que o
   evento cai na **véspera** em horário brasileiro — o PMI chinês das 09:30 de
   Pequim do dia 30 vira dia 29, 22:30. Nesses casos, use o campo `obs` para
   registrar o horário local (`"30/09 09:30 em Pequim"`).

## Conferindo o arquivo

```bash
cd ~/projetos/ftm-chartbook
for f in calendar/*.json; do python3 -m json.tool "$f" >/dev/null && echo "OK  $f" || echo "ERRO $f"; done
```

## Testando localmente

```bash
cd ~/projetos/ftm-chartbook && python3 -m http.server 8000
# depois abra http://localhost:8000/calendario.html
```

> Atenção: esta página lê arquivos **locais**, então o teste local reflete o que
> está na sua pasta. Já a galeria de gráficos (`index.html`) lê o repositório
> pela API do GitHub e reflete o que **já foi enviado**. As duas se comportam
> de formas diferentes no mesmo servidor local.

## Estados que a página mostra sozinha

- Arquivo do mês inexistente → grade da semana vazia + "nenhum indicador
  cadastrado" (não é erro: mês futuro ainda não preenchido é o normal).
- JSON quebrado → mensagem nomeando o arquivo e citando o erro do parser.
- Filtro de país sem resultado → mensagem própria, distinta de "não há dado".

Quando os dados **carregam**, a grade da semana sempre aparece — arquivo do mês
faltando ou vazio tira os eventos, nunca o calendário: uma semana vazia comunica
"nada agendado" melhor do que um parágrafo solto.

Já quando a carga **falha** (JSON quebrado, erro de rede), aparece só a mensagem
de erro, sem a grade. Isso é proposital: mostrar um calendário vazio ao lado de
um erro faria parecer que não há nada agendado, quando na verdade não foi
possível saber.
