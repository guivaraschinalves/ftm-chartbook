Attribute VB_Name = "Modulo1"
Option Explicit

'================================================================
' FtM Chartbook - publicacao dos graficos do PowerPoint
'
' Cole este conteudo num modulo do VBA do seu .pptm
' (Alt+F11 -> Inserir -> Modulo) e preencha os dois caminhos marcados
' com <seu-usuario> na secao de CONFIGURACAO abaixo.
'
' Fluxo mensal: atualize os dados no Excel e rode AtualizarEPublicarSlides.
'
' Antes do primeiro uso num deck novo: rode DefinirSlotsDosSlides (uma vez)
' e depois VerificarSlots para conferir.
'
' Veja o README.md deste diretorio para o roteiro completo, inclusive como
' adicionar um topico novo e por que cada decisao foi tomada.
'================================================================

'================================================================
' CONFIGURACAO
'================================================================
' Pasta local onde os PNGs sao gravados antes de subir. Termine com "\".
Const pastaExportacao As String = "C:\Users\<seu-usuario>\Desktop\Chartbook Export\"

Const RepoGithubDevURL As String = "https://github.dev/guivaraschinalves/ftm-chartbook/tree/master/_inbox"

' 96 DPI = 1920x1080 num slide de 20 polegadas de largura.
Const DPI_EXPORTACAO As Long = 96

' --- GitHub API ---
Const GITHUB_OWNER As String = "guivaraschinalves"
Const GITHUB_REPO As String = "ftm-chartbook"
Const GITHUB_BRANCH As String = "master"

' Arquivo de texto local contendo SO o Personal Access Token, na primeira
' linha. NUNCA guarde o token dentro do .pptm nem no repositorio.
Const GITHUB_TOKEN_FILE As String = "C:\Users\<seu-usuario>\Desktop\github_token.txt"

' Onde caem os slides que ainda nao tem slot definido.
Const PASTA_DESTINO_REPO As String = "_inbox/"

' Nome do arquivo dentro de cada pasta-slot (convencao do charts/README.md).
Const ARQUIVO_NO_SLOT As String = "grafico.png"

' Chave da tag que guarda, em cada slide, a pasta-slot de destino.
' O PowerPoint guarda nomes de tag em maiusculas.
Const TAG_SLOT As String = "FTMSLOT"

'================================================================
' MACRO MESTRE - roda tudo de uma vez
'================================================================
Sub AtualizarEPublicarSlides()
    AtualizarDadosGraficos
    AtualizarRotulosGraficos False
    PublicarSlidesGithubAPI True
End Sub

'================================================================
' MACROS INDIVIDUAIS - aparecem no Alt+F8
'================================================================
Sub AtualizarRotulos()
    AtualizarRotulosGraficos True
End Sub

Sub ExportarSlidesPNG()
    ExportarSlidesParaPNG True
End Sub

Sub PublicarNoGithub()
    PublicarSlidesGithubAPI True
End Sub

'================================================================
' SLOTS - define o destino de cada slide, de uma vez
'
' Roda UMA vez. Depois disso o destino viaja dentro de cada slide, e
' reordenar, duplicar ou apagar slides no PowerPoint nao quebra o
' mapeamento (diferente de uma tabela por numero de slide).
'
' Para um tema novo: acrescente linhas aqui com o indice do slide e a
' pasta-slot correspondente no repositorio, e rode de novo.
'================================================================
Sub DefinirSlotsDosSlides()
    Const A As String = "charts/IPCA - Brasil/"

    DefinirSlot 1, A & "01 Visão geral/01 - Taxa Selic Meta, IPCA e Meta para a Inflação"
    DefinirSlot 3, A & "01 Visão geral/02 - Contribuição para o IPCA por Grupo - Acumulado em 12 meses"
    DefinirSlot 2, A & "01 Visão geral/03 - Contribuição para o IPCA por Grupo - Acumulado em 3 meses"

    DefinirSlot 4, A & "02 Aberturas/01 - IPCA Serviços - Acumulado em 12 meses"
    DefinirSlot 5, A & "02 Aberturas/02 - IPCA Serviços, Industriais e Alimentação no Domicílio - Acumulado em 12 meses"
    DefinirSlot 6, A & "02 Aberturas/03 - IPCA Comercializáveis e Não Comercializáveis - Acumulado em 12 meses"
    DefinirSlot 7, A & "02 Aberturas/04 - IPCA Não Duráveis, Semiduráveis e Duráveis - Acumulado em 12 meses"
    DefinirSlot 8, A & "02 Aberturas/05 - IPCA Administrados e Livres - Acumulado em 12 meses"

    DefinirSlot 9, A & "03 Núcleos/01 - IPCA Cheio e IPCA EX1 - Acumulado em 12 meses"
    DefinirSlot 10, A & "03 Núcleos/02 - IPCA Cheio e IPCA ex Alimentação e Energia - Acumulado em 12 meses"
    DefinirSlot 11, A & "03 Núcleos/03 - IPCA Cheio e IPCA EX3 Serviços - Acumulado em 12 meses"
    DefinirSlot 12, A & "03 Núcleos/04 - IPCA Cheio e Média dos Núcleos - Acumulado em 12 meses"

    MsgBox "Slots definidos. Rode 'VerificarSlots' para conferir contra o repositório.", _
           vbInformation, "Slots definidos"
End Sub

Private Sub DefinirSlot(indice As Long, caminhoSlot As String)
    If indice < 1 Or indice > ActivePresentation.Slides.Count Then
        MsgBox "Slide " & indice & " não existe — pulei." & vbCrLf & caminhoSlot, vbExclamation
        Exit Sub
    End If

    With ActivePresentation.Slides(indice).Tags
        On Error Resume Next
        .Delete TAG_SLOT
        On Error GoTo 0
        .Add TAG_SLOT, caminhoSlot
    End With
End Sub

'================================================================
' VERIFICAR - mostra o destino de cada slide e se ele existe no
' repositorio, sem publicar nada
'================================================================
Sub VerificarSlots()
    Dim sld As Slide
    Dim arvore As String, erro As String
    Dim slot As String, relato As String
    Dim comSlot As Long, semSlot As Long, inexistente As Long

    If Not BuscarArvoreRepo(arvore, erro) Then
        MsgBox "Não consegui ler a árvore do repositório:" & vbCrLf & vbCrLf & erro, vbExclamation
        Exit Sub
    End If

    For Each sld In ActivePresentation.Slides
        slot = SlotDoSlide(sld)

        If slot = "" Then
            semSlot = semSlot + 1
            relato = relato & "Slide " & sld.SlideIndex & ": (sem slot) -> " & PASTA_DESTINO_REPO & vbCrLf
        ElseIf SlotExisteNoRepo(slot, arvore) Then
            comSlot = comSlot + 1
            relato = relato & "Slide " & sld.SlideIndex & ": OK -> " & slot & vbCrLf
        Else
            inexistente = inexistente + 1
            relato = relato & "Slide " & sld.SlideIndex & ": NAO EXISTE NO REPO -> " & slot & vbCrLf
        End If
    Next sld

    MsgBox comSlot & " slide(s) com slot válido" & vbCrLf & _
           inexistente & " slide(s) com slot inexistente" & vbCrLf & _
           semSlot & " slide(s) sem slot" & vbCrLf & vbCrLf & relato, _
           vbInformation, "Verificação dos slots"
End Sub

'================================================================
' 1) ATUALIZAR DADOS - refaz o vinculo com o Excel externo
'================================================================
Sub AtualizarDadosGraficos()
    Dim sld As Slide
    Dim shp As Shape
    Dim total As Long
    Dim erros As String

    For Each sld In ActivePresentation.Slides
        For Each shp In sld.Shapes
            AtualizarFormaDados shp, total, erros
        Next shp
    Next sld

    If erros = "" Then
        MsgBox total & " gráfico(s) atualizados.", vbInformation, "Atualização concluída"
    Else
        MsgBox total & " gráfico(s) processados." & vbCrLf & vbCrLf & _
               "Erros encontrados:" & vbCrLf & erros, vbExclamation, "Atualização com problemas"
    End If
End Sub

Private Sub AtualizarFormaDados(shp As Shape, ByRef total As Long, ByRef erros As String)
    Dim item As Shape
    Dim wb As Object

    If shp.Type = msoGroup Then
        For Each item In shp.GroupItems
            AtualizarFormaDados item, total, erros
        Next item
        Exit Sub
    End If

    If Not shp.HasChart Then Exit Sub

    On Error Resume Next
    Err.Clear
    Set wb = shp.Chart.ChartData.Workbook
    If Err.Number = 0 And Not wb Is Nothing Then
        wb.RefreshAll
        wb.Application.CalculateFullRebuild
        wb.Close SaveChanges:=False
    End If
    If Err.Number <> 0 Then
        erros = erros & shp.Name & ": " & Err.Description & vbCrLf
    End If
    On Error GoTo 0

    total = total + 1
End Sub

'================================================================
' 2) ATUALIZAR ROTULOS - so onde ja existe rotulo
'
' So mexe em serie que JA tem rotulo. Serie sem rotulo nenhum foi
' silenciada de proposito e fica intacta; serie cujo rotulo ja esta no
' ultimo ponto nao e recriada, para nao perder posicao arrastada a mao.
' Resultado: rodar sem dado novo nao desfaz nada.
'================================================================
Sub AtualizarRotulosGraficos(Optional mostrarResumo As Boolean = True)
    Dim sld As Slide
    Dim shp As Shape
    Dim graficos As Long, movidos As Long, jaOk As Long, semRotulo As Long

    For Each sld In ActivePresentation.Slides
        For Each shp In sld.Shapes
            ProcessarFormaRotulo shp, graficos, movidos, jaOk, semRotulo
        Next shp
    Next sld

    If mostrarResumo Then
        MsgBox graficos & " gráfico(s) percorridos." & vbCrLf & vbCrLf & _
               movidos & " série(s) com rótulo movido para o último ponto" & vbCrLf & _
               jaOk & " série(s) já corretas (não foram tocadas)" & vbCrLf & _
               semRotulo & " série(s) sem rótulo (preservadas como estão)", _
               vbInformation, "Rótulos atualizados"
    End If
End Sub

Private Sub ProcessarFormaRotulo(shp As Shape, ByRef graficos As Long, _
                                 ByRef movidos As Long, ByRef jaOk As Long, _
                                 ByRef semRotulo As Long)
    Dim item As Shape

    If shp.Type = msoGroup Then
        For Each item In shp.GroupItems
            ProcessarFormaRotulo item, graficos, movidos, jaOk, semRotulo
        Next item
        Exit Sub
    End If

    If Not shp.HasChart Then Exit Sub

    Dim cht As Chart
    Dim ser As Series
    Dim vals As Variant
    Dim i As Long, lastIdx As Long
    Dim comRotulo As Long
    Dim ultimoTemRotulo As Boolean

    Set cht = shp.Chart
    graficos = graficos + 1

    For Each ser In cht.SeriesCollection
        vals = ser.Values

        ' ultimo ponto com valor numerico de verdade (ignora "" das formulas)
        lastIdx = -1
        For i = UBound(vals) To LBound(vals) Step -1
            If Not IsEmpty(vals(i)) Then
                If IsNumeric(vals(i)) Then
                    lastIdx = i
                    Exit For
                End If
            End If
        Next i

        ' quantos pontos tem rotulo hoje, e o ultimo esta entre eles?
        comRotulo = 0
        ultimoTemRotulo = False
        For i = LBound(vals) To UBound(vals)
            If PontoTemRotulo(ser, i) Then
                comRotulo = comRotulo + 1
                If i = lastIdx Then ultimoTemRotulo = True
            End If
        Next i

        If comRotulo = 0 Then
            semRotulo = semRotulo + 1

        ElseIf comRotulo = 1 And ultimoTemRotulo Then
            jaOk = jaOk + 1

        ElseIf lastIdx >= LBound(vals) Then
            ser.HasDataLabels = False
            With ser.Points(lastIdx)
                .HasDataLabel = True
                With .DataLabel
                    .ShowValue = True
                    .ShowSeriesName = False
                    .ShowCategoryName = False
                    .ShowLegendKey = False
                    .ShowPercentage = False
                    .ShowBubbleSize = False
                End With
            End With
            movidos = movidos + 1
        End If
    Next ser
End Sub

' Ler HasDataLabel pode falhar em certos tipos de grafico ou em ponto
' vazio. Nesses casos trato como "sem rotulo", que e a opcao conservadora:
' na duvida, nao mexer.
Private Function PontoTemRotulo(ser As Series, indice As Long) As Boolean
    On Error Resume Next
    PontoTemRotulo = ser.Points(indice).HasDataLabel
    On Error GoTo 0
End Function

'================================================================
' 3) EXPORTAR SLIDES - so local, abre pasta + github.dev
'================================================================
Sub ExportarSlidesParaPNG(Optional mostrarResumo As Boolean = True)
    Dim sld As Slide
    Dim total As Long, pulados As Long
    Dim usados As String, nomeArquivo As String

    If Dir(pastaExportacao, vbDirectory) = "" Then MkDir pastaExportacao

    For Each sld In ActivePresentation.Slides
        If sld.SlideShowTransition.Hidden = msoTrue Then
            pulados = pulados + 1
        Else
            nomeArquivo = NomeUnicoSlide(sld, usados) & ".png"
            ExportarSlide sld, pastaExportacao & nomeArquivo
            total = total + 1
        End If
    Next sld

    Shell "explorer.exe """ & pastaExportacao & """", vbNormalFocus
    ActivePresentation.FollowHyperlink Address:=RepoGithubDevURL

    If mostrarResumo Then
        MsgBox total & " slide(s) exportado(s) para:" & vbCrLf & pastaExportacao & vbCrLf & _
               pulados & " slide(s) oculto(s) pulado(s).", vbInformation, "Exportação concluída"
    End If
End Sub

'================================================================
' 4) PUBLICAR - cada slide direto no seu slot, num commit unico
'================================================================
Sub PublicarSlidesGithubAPI(Optional mostrarResumo As Boolean = True)
    Dim sld As Slide
    Dim usados As String, nomeArquivo As String
    Dim caminhosLocais() As String, caminhosRepo() As String
    Dim total As Long, pulados As Long
    Dim noSlot As Long, noInbox As Long, avisos As String
    Dim arvore As String, erro As String, slot As String

    If ActivePresentation.Slides.Count = 0 Then
        MsgBox "A apresentação não tem slides.", vbExclamation
        Exit Sub
    End If

    ' A arvore do repo diz quais slots existem de verdade. Sem essa
    ' checagem, um caminho errado numa tag criaria pasta nova em silencio.
    If Not BuscarArvoreRepo(arvore, erro) Then
        MsgBox "Não consegui ler a árvore do repositório — nada foi publicado." & _
               vbCrLf & vbCrLf & erro, vbExclamation
        Exit Sub
    End If

    If Dir(pastaExportacao, vbDirectory) = "" Then MkDir pastaExportacao

    ReDim caminhosLocais(1 To ActivePresentation.Slides.Count)
    ReDim caminhosRepo(1 To ActivePresentation.Slides.Count)

    For Each sld In ActivePresentation.Slides
        If sld.SlideShowTransition.Hidden = msoTrue Then
            pulados = pulados + 1
        Else
            nomeArquivo = NomeUnicoSlide(sld, usados) & ".png"
            total = total + 1
            caminhosLocais(total) = pastaExportacao & nomeArquivo
            ExportarSlide sld, caminhosLocais(total)

            slot = SlotDoSlide(sld)

            If slot = "" Then
                caminhosRepo(total) = PASTA_DESTINO_REPO & nomeArquivo
                noInbox = noInbox + 1
                avisos = avisos & "  slide " & sld.SlideIndex & " (sem slot) -> " & _
                         PASTA_DESTINO_REPO & nomeArquivo & vbCrLf
            ElseIf SlotExisteNoRepo(slot, arvore) Then
                caminhosRepo(total) = slot & "/" & ARQUIVO_NO_SLOT
                noSlot = noSlot + 1
            Else
                caminhosRepo(total) = PASTA_DESTINO_REPO & nomeArquivo
                noInbox = noInbox + 1
                avisos = avisos & "  slide " & sld.SlideIndex & " (slot não existe: " & _
                         slot & ") -> " & PASTA_DESTINO_REPO & nomeArquivo & vbCrLf
            End If
        End If
    Next sld

    If total = 0 Then
        MsgBox "Nenhum slide visível para publicar.", vbExclamation
        Exit Sub
    End If

    If PublicarLoteGithub(caminhosLocais, caminhosRepo, total, erro) Then
        If mostrarResumo Then
            Dim msg As String
            msg = total & " slide(s) publicado(s) num commit único." & vbCrLf & vbCrLf & _
                  noSlot & " direto no slot (site atualiza sozinho)" & vbCrLf & _
                  noInbox & " para " & PASTA_DESTINO_REPO
            If pulados > 0 Then msg = msg & vbCrLf & pulados & " slide(s) oculto(s) pulado(s)"
            If avisos <> "" Then msg = msg & vbCrLf & vbCrLf & "Foram para o inbox:" & vbCrLf & avisos
            MsgBox msg, vbInformation, "Publicação concluída"
        End If
    ElseIf erro = "NADA_MUDOU" Then
        If mostrarResumo Then
            MsgBox "Nenhum gráfico mudou de conteúdo desde a última publicação." & vbCrLf & _
                   "Nada foi commitado.", vbInformation, "Nada a publicar"
        End If
    Else
        MsgBox "Nada foi publicado — a branch não foi movida." & vbCrLf & vbCrLf & erro, _
               vbExclamation, "Publicação falhou"
    End If
End Sub

'================================================================
' TAGS DE SLOT
'================================================================
Private Function SlotDoSlide(sld As Slide) As String
    Dim s As String

    On Error Resume Next
    s = sld.Tags(TAG_SLOT)
    On Error GoTo 0

    ' tolera barra sobrando no fim, digitada por engano
    Do While Right$(s, 1) = "/"
        s = Left$(s, Len(s) - 1)
    Loop

    SlotDoSlide = Trim$(s)
End Function

Private Function SlotExisteNoRepo(slot As String, arvore As String) As Boolean
    ' a arvore lista a propria pasta e o arquivo dentro dela; qualquer
    ' um dos dois serve como prova de que o slot existe
    SlotExisteNoRepo = (InStr(arvore, """" & slot & """") > 0) Or _
                       (InStr(arvore, slot & "/") > 0)
End Function

Private Function BuscarArvoreRepo(ByRef arvore As String, ByRef erroMsg As String) As Boolean
    Dim url As String

    url = "https://api.github.com/repos/" & GITHUB_OWNER & "/" & GITHUB_REPO & _
          "/git/trees/" & GITHUB_BRANCH & "?recursive=1"

    BuscarArvoreRepo = ChamarGithub("GET", url, "", LerToken(), arvore, erroMsg)
End Function

'================================================================
' NUCLEO: um commit para o lote inteiro (Git Data API)
'
' A Contents API cria um commit por arquivo. Com 12 graficos isso virava 12
' commits e 12 builds do GitHub Pages em ~30 segundos, dos quais 11
' falhavam e deixavam o site fora do ar. Aqui os PNGs sobem como blobs (que
' nao criam commit), viram uma tree, e so entao um commit e criado e a
' branch movida: 1 commit, 1 build.
'
' Se qualquer etapa falhar, a branch nao e movida - o repositorio fica
' exatamente como estava, sem estado pela metade.
'================================================================
Private Function PublicarLoteGithub(caminhosLocais() As String, caminhosRepo() As String, _
                                    quantidade As Long, ByRef erroMsg As String) As Boolean
    Dim token As String, base As String, resp As String, corpo As String
    Dim shaCommitPai As String, shaTreeBase As String
    Dim shaTreeNova As String, shaCommitNovo As String
    Dim shaBlob As String, entradasTree As String
    Dim i As Long

    PublicarLoteGithub = False

    token = LerToken()
    base = "https://api.github.com/repos/" & GITHUB_OWNER & "/" & GITHUB_REPO

    ' 1) Onde a branch esta agora
    If Not ChamarGithub("GET", base & "/git/ref/heads/" & GITHUB_BRANCH, "", token, resp, erroMsg) Then Exit Function
    shaCommitPai = ExtrairSha(resp, "object")
    If shaCommitPai = "" Then
        erroMsg = "não consegui ler o sha da branch " & GITHUB_BRANCH
        Exit Function
    End If

    ' 2) A tree desse commit, base da nova
    If Not ChamarGithub("GET", base & "/git/commits/" & shaCommitPai, "", token, resp, erroMsg) Then Exit Function
    shaTreeBase = ExtrairSha(resp, "tree")
    If shaTreeBase = "" Then
        erroMsg = "não consegui ler o sha da tree do commit " & shaCommitPai
        Exit Function
    End If

    ' 3) Cada PNG como blob - nenhum commit e criado aqui
    For i = 1 To quantidade
        corpo = "{""content"":""" & Base64Encode(LerArquivoBinario(caminhosLocais(i))) & _
                """,""encoding"":""base64""}"

        If Not ChamarGithub("POST", base & "/git/blobs", corpo, token, resp, erroMsg) Then
            erroMsg = "ao subir " & caminhosRepo(i) & ":" & vbCrLf & erroMsg
            Exit Function
        End If

        shaBlob = ExtrairSha(resp, "")
        If shaBlob = "" Then
            erroMsg = "não consegui ler o sha do blob de " & caminhosRepo(i)
            Exit Function
        End If

        If entradasTree <> "" Then entradasTree = entradasTree & ","
        entradasTree = entradasTree & "{""path"":""" & EscaparJson(caminhosRepo(i)) & _
                       """,""mode"":""100644"",""type"":""blob"",""sha"":""" & shaBlob & """}"
    Next i

    ' 4) Uma tree nova, sobre o que ja existia
    corpo = "{""base_tree"":""" & shaTreeBase & """,""tree"":[" & entradasTree & "]}"
    If Not ChamarGithub("POST", base & "/git/trees", corpo, token, resp, erroMsg) Then Exit Function
    shaTreeNova = ExtrairSha(resp, "")
    If shaTreeNova = "" Then
        erroMsg = "não consegui ler o sha da tree nova"
        Exit Function
    End If

    ' Tree identica a base = nenhum PNG mudou de conteudo. Commitar aqui
    ' deixaria um commit vazio no historico e dispararia um build do Pages
    ' sem motivo.
    If shaTreeNova = shaTreeBase Then
        erroMsg = "NADA_MUDOU"
        Exit Function
    End If

    ' 5) UM commit
    corpo = "{""message"":""" & EscaparJson("Atualiza " & quantidade & " graficos exportados do PowerPoint") & _
            """,""tree"":""" & shaTreeNova & """,""parents"":[""" & shaCommitPai & """]}"
    If Not ChamarGithub("POST", base & "/git/commits", corpo, token, resp, erroMsg) Then Exit Function
    shaCommitNovo = ExtrairSha(resp, "")
    If shaCommitNovo = "" Then
        erroMsg = "não consegui ler o sha do commit novo"
        Exit Function
    End If

    ' 6) Move a branch - e este passo que publica de verdade
    corpo = "{""sha"":""" & shaCommitNovo & """}"
    If Not ChamarGithub("PATCH", base & "/git/refs/heads/" & GITHUB_BRANCH, corpo, token, resp, erroMsg) Then Exit Function

    PublicarLoteGithub = True
End Function

'================================================================
' CHAMADA HTTP E JSON
'================================================================
Private Function ChamarGithub(metodo As String, url As String, corpo As String, _
                              token As String, ByRef resposta As String, _
                              ByRef erroMsg As String) As Boolean
    Dim http As Object

    ChamarGithub = False

    On Error Resume Next
    Err.Clear
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    http.Open metodo, url, False
    http.SetRequestHeader "Authorization", "token " & token
    http.SetRequestHeader "Accept", "application/vnd.github+json"
    http.SetRequestHeader "User-Agent", "PowerPoint-VBA-Macro"
    If corpo = "" Then
        http.Send
    Else
        http.SetRequestHeader "Content-Type", "application/json"
        http.Send corpo
    End If
    If Err.Number <> 0 Then
        erroMsg = metodo & " " & url & vbCrLf & "erro de conexão: " & Err.Description
        On Error GoTo 0
        Exit Function
    End If
    On Error GoTo 0

    resposta = http.ResponseText

    If http.Status >= 200 And http.Status < 300 Then
        ChamarGithub = True
    Else
        erroMsg = metodo & " " & url & vbCrLf & "HTTP " & http.Status & ": " & Left$(resposta, 300)
    End If
End Function

' Deixa o JSON em ASCII puro: acento vira \uXXXX. Os caminhos dos slots
' tem acento ("Visao geral", "Nucleos") e o WinHttp nao e confiavel ao
' enviar string nao-ASCII no corpo da requisicao.
Private Function EscaparJson(s As String) As String
    Dim i As Long, cod As Long
    Dim ch As String, saida As String

    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        cod = AscW(ch)
        If cod < 0 Then cod = cod + 65536

        Select Case cod
            Case 34: saida = saida & "\"""
            Case 92: saida = saida & "\\"
            Case 8: saida = saida & "\b"
            Case 9: saida = saida & "\t"
            Case 10: saida = saida & "\n"
            Case 12: saida = saida & "\f"
            Case 13: saida = saida & "\r"
            Case Else
                If cod < 32 Or cod > 126 Then
                    saida = saida & "\u" & Right$("000" & LCase$(Hex$(cod)), 4)
                Else
                    saida = saida & ch
                End If
        End Select
    Next i

    EscaparJson = saida
End Function

' Pega o valor de "sha". Se depoisDe vier preenchido, procura so depois
' dessa chave - a resposta de um commit traz o sha dele antes do sha da
' tree, e a de um ref traz o sha dentro de "object".
Private Function ExtrairSha(json As String, depoisDe As String) As String
    Dim p As Long, p2 As Long

    p = 1
    If depoisDe <> "" Then
        p = InStr(json, """" & depoisDe & """")
        If p = 0 Then Exit Function
    End If

    p = InStr(p, json, """sha""")
    If p = 0 Then Exit Function
    p = p + Len("""sha""")

    Do While p <= Len(json)
        If Mid$(json, p, 1) = """" Then Exit Do
        p = p + 1
    Loop
    If p > Len(json) Then Exit Function
    p = p + 1

    p2 = InStr(p, json, """")
    If p2 = 0 Then Exit Function

    ExtrairSha = Mid$(json, p, p2 - p)
End Function

'================================================================
' EXPORTACAO DE SLIDE E NOMENCLATURA
'================================================================
Private Sub ExportarSlide(sld As Slide, caminho As String)
    Dim larguraPx As Long, alturaPx As Long

    With ActivePresentation.PageSetup
        larguraPx = CLng(.SlideWidth / 72 * DPI_EXPORTACAO)
        alturaPx = CLng(.SlideHeight / 72 * DPI_EXPORTACAO)
    End With

    sld.Export caminho, "PNG", larguraPx, alturaPx
End Sub

Private Function NomeUnicoSlide(sld As Slide, ByRef usados As String) As String
    Dim base As String, nome As String
    Dim n As Long

    base = SanitizarNomeArquivo(TituloDoSlide(sld))
    If base = "" Then base = "slide-" & Format$(sld.SlideIndex, "00")

    nome = base
    n = 1
    Do While InStr(usados, "|" & nome & "|") > 0
        n = n + 1
        nome = base & "-" & n
    Loop

    usados = usados & "|" & nome & "|"
    NomeUnicoSlide = nome
End Function

Private Function TituloDoSlide(sld As Slide) As String
    Dim t As String

    t = ""
    On Error Resume Next
    If sld.Shapes.HasTitle Then
        If sld.Shapes.Title.TextFrame.HasText Then
            t = sld.Shapes.Title.TextFrame.TextRange.Text
        End If
    End If
    On Error GoTo 0

    TituloDoSlide = t
End Function

Private Function SanitizarNomeArquivo(nome As String) As String
    Dim comAcento As String, semAcento As String
    Dim s As String
    Dim i As Long, j As Long
    Dim invalidos As String, ch As String, resultado As String

    comAcento = "áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ"
    semAcento = "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC"

    s = Trim$(nome)

    s = Replace(s, vbCrLf, " ")
    s = Replace(s, vbCr, " ")
    s = Replace(s, vbLf, " ")
    s = Replace(s, vbTab, " ")
    s = Replace(s, Chr$(11), " ")

    For i = 1 To Len(comAcento)
        s = Replace(s, Mid$(comAcento, i, 1), Mid$(semAcento, i, 1))
    Next i

    s = LCase$(s)
    s = Replace(s, " ", "-")

    invalidos = "\/:*?""<>|.,()[]{}'"
    resultado = ""
    For j = 1 To Len(s)
        ch = Mid$(s, j, 1)
        If InStr(invalidos, ch) = 0 Then resultado = resultado & ch
    Next j
    s = resultado

    Do While InStr(s, "--") > 0
        s = Replace(s, "--", "-")
    Loop
    Do While Left$(s, 1) = "-"
        s = Mid$(s, 2)
    Loop
    Do While Right$(s, 1) = "-"
        s = Left$(s, Len(s) - 1)
    Loop

    SanitizarNomeArquivo = s
End Function

'================================================================
' TOKEN / ARQUIVO / BASE64
'================================================================
Private Function LerToken() As String
    Dim nFile As Integer, s As String
    nFile = FreeFile
    Open GITHUB_TOKEN_FILE For Input As #nFile
    Line Input #nFile, s
    Close #nFile
    LerToken = Trim$(s)
End Function

Private Function LerArquivoBinario(caminho As String) As Byte()
    Dim nFile As Integer, tamanho As Long
    Dim buffer() As Byte

    nFile = FreeFile
    Open caminho For Binary Access Read As #nFile
    tamanho = LOF(nFile)
    ReDim buffer(tamanho - 1)
    Get #nFile, , buffer
    Close #nFile

    LerArquivoBinario = buffer
End Function

Private Function Base64Encode(bytes() As Byte) As String
    Dim xmlDoc As Object, node As Object
    Set xmlDoc = CreateObject("MSXML2.DOMDocument.6.0")
    Set node = xmlDoc.createElement("b64")
    node.dataType = "bin.base64"
    node.nodeTypedValue = bytes
    Base64Encode = Replace(Replace(node.Text, vbCr, ""), vbLf, "")
End Function

'================================================================
' DIAGNOSTICO
'================================================================
Sub TestarConexaoGithub()
    Dim token As String, diag As String, resp As String, erro As String
    Dim base As String

    token = LerToken()
    base = "https://api.github.com/repos/" & GITHUB_OWNER & "/" & GITHUB_REPO
    diag = "Token: " & Len(token) & " caracteres, comeca com """ & Left$(token, 11) & "...""" & vbCrLf & vbCrLf

    If ChamarGithub("GET", base & "/git/ref/heads/" & GITHUB_BRANCH, "", token, resp, erro) Then
        diag = diag & "Branch " & GITHUB_BRANCH & ": OK" & vbCrLf & _
               "Commit atual: " & ExtrairSha(resp, "object")
    Else
        diag = diag & "FALHOU:" & vbCrLf & erro
    End If

    MsgBox diag, vbInformation, "Diagnostico GitHub"
End Sub
