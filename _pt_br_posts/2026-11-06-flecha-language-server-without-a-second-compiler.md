---
title: "Flecha Dev Log #36: Um Servidor de Linguagem sem um Segundo Compilador"
date: 2026-11-06
published: true
lang: pt-BR
translation_key: "flecha-language-server-without-a-second-compiler"
original_url: /flecha-language-server-without-a-second-compiler
permalink: /pt-br/flecha-language-server-without-a-second-compiler
---

# [](#intro)Introdução

Olá, pessoal!

Flecha já oferece realce de sintaxe e pacotes para editores. Eles reconhecem um arquivo fonte, colorem seus tokens e fornecem os detalhes comuns de edição que fazem uma linguagem se sentir em casa.

Eles não conseguem explicar por que um nome está ausente, onde um símbolo foi declarado ou se uma alteração ainda não salva continua sendo aceita pelo verificador de tipos.

É nesse limite que um servidor de linguagem começa. A implementação tentadora seria colocar um parser dentro da ferramenta do editor e, aos poucos, ensinar a ele uma parte suficiente da linguagem para responder perguntas úteis. Decidimos não construir um segundo compilador por acidente.

Em vez disso, estamos projetando `flecha-lsp` como um binário separado escrito na própria Flecha. O servidor concluído se comunicará com o editor pelo Language Server Protocol e consultará o compilador selecionado pelo workspace para obter informações sobre a linguagem.

# [](#the-server-is-not-the-compiler)O servidor não é o compilador

Um LSP e um compilador precisam de tipos diferentes de estado.

O servidor de linguagem é responsável por questões relacionadas ao editor: mensagens JSON-RPC, documentos abertos, versões de documentos, URIs de arquivos, o ciclo de vida do LSP e a conversão entre posições no código-fonte. O compilador já é responsável por tokenização, parsing, imports, resolução de nomes, tipos e diagnósticos.

Duplicar a segunda lista dentro do primeiro processo criaria duas definições de Flecha. Cada mudança na linguagem precisaria ser implementada duas vezes, e o editor poderia discordar do build executado um segundo depois.

O modelo de processos mantém uma única autoridade:

```text
Editor
  │ LSP / JSON-RPC por stdin e stdout
  ▼
flecha-lsp
  │ protocolo JSON-RPC versionado de análise por pipes privados
  ▼
flecha analyze --stdio
  │
  ▼
Parser, carregador de módulos e analisador semântico de Flecha
```

`flecha-lsp` não fará link com as classes C++ do compilador nem carregará um plugin do compilador por meio do runtime. Ele iniciará o compilador do workspace como um processo filho. Não haverá daemon global, listener de rede ou ABI pública do compilador escondida atrás da integração com o editor.

Essa separação permite que o compilador mude internamente enquanto a interface continua restrita a dados simples: versões, recursos, texto do código-fonte, intervalos de bytes, códigos de diagnóstico e mensagens.

# [](#three-versions-not-one)Três versões, não uma

Manter o servidor em um repositório separado levantou imediatamente uma objeção útil: versionamento acoplado tornaria essa separação quase cosmética.

A arquitetura possui, portanto, três versões independentes:

```text
versão do flecha-lsp
versão do compilador Flecha
versão do protocolo de análise do compilador
```

O servidor não exige que sua própria versão corresponda à versão do compilador. Ele negociará as versões major e minor do protocolo de análise com o compilador selecionado. Versões major diferentes são incompatíveis; versões minor mais novas podem adicionar recursos opcionais.

É pela mesma razão que nós da AST e ponteiros do compilador não podem atravessar o limite entre processos. Esses objetos descrevem uma implementação do compilador. O protocolo de análise descreve fatos que um editor pode consumir.

A busca inicial pela toolchain dará preferência a uma configuração explícita do editor, depois a `FLECHA_COMPILER`, depois a uma futura seleção de toolchain específica do projeto e, por fim, a `flecha` encontrada em `PATH`. Um workspace deve ser analisado pelo compilador que realmente fará seu build.

# [](#why-write-it-in-flecha)Por que escrevê-lo em Flecha?

A escolha mais segura para o bootstrap seria escrever o servidor em uma linguagem com bibliotecas de protocolo maduras. Isso também evitaria exercitar exatamente as partes de Flecha das quais uma ferramenta de longa duração precisa.

Escrever `flecha-lsp` em Flecha transforma o projeto em um usuário de peso da linguagem, da biblioteca padrão, do gerenciador de pacotes, do modelo de I/O, de buffers com ownership, de estruturas, de erros e do suporte a JSON.

A primeira prova foi deliberadamente pequena. Instalamos o pacote público `flecha/json` e desserializamos JSON em uma estrutura Flecha decorada contendo um array proprietário:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">@json(structure)
structure Test {
    i32 value;
    own []i32 values;
};</code></pre></div></div>

Isso não produziu um servidor de linguagem, mas respondeu a uma pergunta importante sobre o bootstrap: dados de protocolo tipados podem ser representados e decodificados em Flecha hoje.

Parâmetros específicos de métodos LSP podem usar métodos `@json` gerados. O envelope genérico de JSON-RPC não pode ser tratado da mesma forma porque `params` e `result` são heterogêneos. Envelopes recebidos podem omitir `id` em notificações ou conter valores numéricos, textuais ou `null`; IDs válidos de requisições LSP são inteiros ou strings. Esse envelope será processado manualmente, e o dispatch decodificará o intervalo bruto de `params` para a estrutura tipada apropriada.

# [](#framing-comes-before-rpc)O framing vem antes do RPC

JSON-RPC descreve mensagens, mas a entrada padrão é apenas um fluxo de bytes. LSP adiciona uma regra de framing:

```text
Content-Length: <quantidade de bytes em UTF-8>\r\n
\r\n
<corpo JSON>
```

Escolhemos construir esse transporte antes do dispatcher de RPC. Enquanto não for possível ler um corpo completo sem consumir bytes da próxima mensagem, parsing de JSON é o problema errado.

O leitor de frames precisa lidar com detalhes que uma demonstração bem-sucedida de uma única mensagem esconde:

- uma leitura do sistema operacional pode retornar apenas parte de um cabeçalho ou corpo;
- várias mensagens podem já estar no buffer;
- `Content-Length` deve aparecer exatamente uma vez e seu nome não diferencia maiúsculas de minúsculas;
- cabeçalhos desconhecidos são válidos e ignorados;
- o tamanho precisa ser validado antes da alocação;
- cabeçalhos e corpos precisam de limites explícitos; e
- EOF entre mensagens é uma desconexão limpa, enquanto EOF dentro de uma mensagem indica entrada truncada.

Um corpo vazio também não pode compartilhar a representação usada para uma desconexão limpa. O leitor retorna, portanto, um corpo, um booleano que indica se existe uma mensagem e um erro. O resultado adicional é pequeno, mas impede que um estado do protocolo finja ser outro.

A saída padrão deve conter apenas mensagens LSP com framing. Logs e diagnósticos vão para a saída de erro, pois uma única linha sem framing corrompe a conexão com o editor.

# [](#small-parser-decisions)Pequenas decisões do parser

O primeiro rascunho do leitor também mostrou a rapidez com que código orientado a bytes fica enigmático.

Comparações com `13`, `10`, `32`, `48` e `57` podem representar ASCII corretamente, mas escondem se o parser procura um final de linha, whitespace opcional ou um dígito decimal. Mantivemos o buffer de transporte como bytes e convertemos bytes individuais para `char` durante o parsing.

Também reutilizamos a biblioteca de texto padrão em vez de manter um acumulador decimal manual:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">const stringv VALUE_TEXT = line[start:end].cast&lt;stringv&gt;;

value, parseErr :=
    strings::stringv_to_int&lt;usize&gt;(VALUE_TEXT);</code></pre></div></div>

O parser ao redor ainda precisa realizar trabalho específico do protocolo. Ele remove apenas espaço e tab horizontal porque o espaço em branco opcional no estilo HTTP abrange menos caracteres que a categoria completa de espaços em branco ASCII. Ele rejeita um `+` inicial, tamanhos duplicados, tamanhos ausentes, overflow e valores acima do limite configurado para o corpo.

A comparação que não diferencia maiúsculas de minúsculas continua sendo uma pequena função auxiliar local que opera sobre dois slices de bytes. Dar a ambos os operandos a mesma representação evitou misturar índices `usize` de slices com índices `u32` de string views sem nenhum benefício semântico.

Essas não são decisões glamorosas de um servidor de linguagem. São as decisões que determinam se o servidor continuará conectado ao editor depois do primeiro pacote incomum.

# [](#tests-define-done)Os testes definem o que está pronto

A matriz de testes de framing é o próximo critério de conclusão, não uma tarefa de acabamento posterior à implementação.

Ela cobre entrada completa e recebida um byte por vez, mensagens consecutivas, cabeçalhos com diferentes combinações de maiúsculas e minúsculas, cabeçalhos desconhecidos, corpos com tamanho zero, EOF limpo, tamanhos duplicados ou ausentes, overflow, limites de tamanho e cabeçalhos ou corpos truncados.

Ao projetar esses testes, já encontramos distinções que o primeiro rascunho não expressava de forma limpa. Uma função auxiliar não pode executar `break` no loop de seu chamador. O final do cabeçalho não é o mesmo evento que EOF. Um corpo válido de tamanho zero não é o mesmo resultado que nenhuma mensagem. É fácil inverter uma verificação de EOF inesperado quando tanto o caminho feliz quanto o caminho de falha são representados por um valor `error`.

O repositório agora contém os documentos de arquitetura e uma primeira implementação do leitor de frames. O leitor não deve ser chamado de concluído até que essa matriz passe. A escrita, o dispatcher JSON-RPC, o ciclo de vida do LSP, o modo de análise do compilador e a integração com o editor ainda precisam ser implementados.

# [](#the-compiler-conversation)A conversa com o compilador

O lado proposto para o compilador é `flecha analyze --stdio`. Ele usará um protocolo JSON-RPC 2.0 menor e específico de Flecha em vez de fingir que o próprio compilador é um servidor LSP.

O processo de análise será responsável por overlays de código-fonte para documentos ainda não salvos. Cada carregamento de módulo primeiro verificará se o LSP forneceu uma versão mais nova em memória e recorrerá ao sistema de arquivos apenas quando nenhum overlay existir. Isso será importante tanto para arquivos importados quanto para o arquivo aberto no editor.

Os diagnósticos do compilador atravessarão o limite como valores estáveis:

```json
{
  "uri": "file:///project/src/main.fl",
  "version": 4,
  "diagnostics": [
    {
      "code": "FLECHA-S0002",
      "startByte": 20,
      "endByte": 25,
      "severity": "error",
      "message": "unknown name"
    }
  ]
}
```

O compilador reportará intervalos de bytes UTF-8 porque essa é sua representação nativa de código-fonte. O LSP será responsável pela conversão para as posições de linha e caractere negociadas com o editor, incluindo UTF-16 quando necessário. Versões de documentos acompanharão os resultados para que diagnósticos desatualizados possam ser descartados antes de chegar à tela.

# [](#one-vertical-slice)Um recorte vertical

Flecha 0.3.1 expõe streams padrão bloqueantes e pipes de processos filhos. A primeira implementação será, portanto, sequencial: ler uma mensagem do editor, fazer o dispatch, fazer no máximo uma solicitação ao analisador, escrever a resposta e continuar.

Não há cancelamento ou análise em background nesse modelo. Mensagens do editor que chegarem durante a análise permanecem no buffer do sistema operacional. Essa limitação é aceitável para o primeiro caminho porque os limites do protocolo não dependem de concorrência.

O escopo é deliberadamente limitado:

```text
editor inicia flecha-lsp
  → initialize funciona
  → editor abre um documento Flecha ainda não salvo
  → o compilador do workspace analisa seu texto em memória
  → diagnósticos são publicados
  → shutdown funciona
```

Sincronização integral de documentos vem primeiro. Informações ao passar o cursor, ir para definição, referências, autocompletar, edições incrementais, cancelamento e workspaces paralelos vêm depois que os diagnósticos provarem o caminho completo.

# [](#conclusion)Conclusão

A primeira decisão importante do LSP não foi um recurso do editor. Foi decidir onde vive a verdade sobre a linguagem.

`flecha-lsp` será um binário Flecha com versionamento independente e responsável pelo protocolo do editor e pelo estado dos documentos. O compilador do workspace continuará responsável por parsing e semântica por trás de uma interface pequena e versionada entre processos. JSON-RPC conecta as peças, enquanto o framing com `Content-Length` torna o fluxo de bytes confiável o suficiente para transportá-lo.

Hoje temos o repositório, a arquitetura, desserialização de JSON funcionando e o primeiro rascunho do leitor de transporte. O trabalho imediato é fazer o framing passar pela matriz de testes de falha, implementar a escrita de saída com framing e então construir o menor ciclo de vida JSON-RPC completo.

O servidor de linguagem ainda não é útil para um editor. Suas responsabilidades finalmente estão bem delimitadas o suficiente para que possamos construí-lo sem criar outra Flecha no caminho.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua **pesquisa!**

<a href="/pt-br/">Voltar</a>
