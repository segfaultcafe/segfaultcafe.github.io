---
title: "Flecha Dev Log #36: Um LSP sem um Segundo Compilador"
date: 2026-11-06
published: true
lang: pt-BR
translation_key: "flecha-language-server-without-a-second-compiler"
original_url: /flecha-language-server-without-a-second-compiler
permalink: /pt-br/flecha-language-server-without-a-second-compiler
---

# [](#intro)Introdução

Olá, pessoal!

Flecha já tem syntax highlighting e pacotes para editores. Esses pacotes reconhecem arquivos Flecha, destacam seus tokens e oferecem o básico para que a linguagem pareça parte do editor.

Mas não sabem dizer por que um nome não foi encontrado, onde um símbolo foi declarado ou se uma alteração ainda não salva continua passando no type checker.

É aí que entra um LSP. A tentação seria colocar um parser dentro da extensão do editor e ensiná-lo, aos poucos, a entender o suficiente da linguagem para responder perguntas úteis. Decidimos não acabar construindo um segundo compilador sem querer.

Em vez disso, estamos projetando `flecha-lsp` como um binário separado, escrito na própria Flecha. Ele falará LSP com o editor e consultará o compilador escolhido para o workspace sempre que precisar de informações semânticas sobre a linguagem.

# [](#the-server-is-not-the-compiler)O servidor não é o compilador

O LSP e o compilador precisam manter estados diferentes.

O `flecha-lsp` cuida do que pertence ao editor: mensagens JSON-RPC, documentos abertos, versões, file URIs, o lifecycle do LSP e a conversão de posições no código-fonte. O compilador já cuida de tokenização, parsing, imports, resolução de nomes, tipos e diagnósticos.

Duplicar dentro do LSP tudo o que já existe no compilador criaria duas versões da linguagem. Cada mudança em Flecha teria de ser implementada duas vezes, e o que o editor mostra poderia divergir do build executado um segundo depois.

Com esse modelo de processos, temos uma única fonte de verdade:

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

`flecha-lsp` não fará link direto com as classes C++ do compilador, nem carregará um plugin do compilador via runtime. Em vez disso, iniciará o compilador do workspace como um processo filho. Não haverá daemon global, listener de rede ou ABI pública do compilador escondida atrás da integração com o editor.

Essa separação permite que a implementação interna do compilador mude enquanto a fronteira entre os processos continua restrita a dados simples: versões, capabilities, texto do código-fonte, byte ranges, códigos de diagnóstico e mensagens.

# [](#three-versions-not-one)Três versões, não uma

Manter o servidor em outro repositório levantou imediatamente uma questão importante: se as versões continuassem acopladas, essa separação seria quase só cosmética.

A arquitetura possui, portanto, três versões independentes:

```text
versão do flecha-lsp
versão do compilador Flecha
versão do protocolo de análise do compilador
```

O servidor não precisa ter a mesma versão do compilador. Ao iniciar, ele negociará com o compilador selecionado uma versão major e minor do protocolo de análise. Majors diferentes são incompatíveis; uma minor mais nova pode adicionar capabilities opcionais.

É também por isso que nós da AST e ponteiros internos do compilador não podem atravessar essa fronteira. Esses objetos pertencem a uma implementação específica do compilador. O protocolo de análise descreve informações que o editor consegue consumir.

A descoberta inicial da toolchain dará preferência a uma configuração explícita do editor, depois a `FLECHA_COMPILER`, a uma futura seleção de toolchain por projeto e, por fim, ao `flecha` encontrado em `PATH`. O workspace deve ser analisado pelo mesmo compilador que fará o build.

# [](#why-write-it-in-flecha)Por que escrever em Flecha?

A escolha mais segura para o bootstrap seria escrever o servidor em uma linguagem com bibliotecas de protocolo maduras. Mas isso também nos pouparia de exercitar justamente as partes de Flecha de que um processo de longa duração precisa.

Escrever `flecha-lsp` em Flecha coloca à prova a linguagem, a biblioteca padrão, o gerenciador de pacotes, o modelo de I/O, buffers com ownership, structures, errors e o suporte a JSON.

A primeira prova foi pequena de propósito. Instalamos o pacote público `flecha/json` e desserializamos um JSON para uma structure Flecha decorada, contendo um array com ownership:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">@json(structure)
structure Test {
    i32 value;
    own []i32 values;
};</code></pre></div></div>

Isso ainda não nos deu um LSP, mas respondeu a uma pergunta importante do bootstrap: hoje já conseguimos representar e decodificar dados tipados de protocolo em Flecha.

Os parâmetros específicos de cada método LSP podem usar os métodos gerados por `@json`. O envelope genérico de JSON-RPC não pode ser tratado da mesma forma, porque `params` e `result` não têm um único tipo. Envelopes recebidos podem omitir `id` em notifications ou conter valores numéricos, textuais ou `null`; no LSP, request IDs válidos são inteiros ou strings. O envelope será processado manualmente, e o dispatcher decodificará o trecho bruto de `params` para a structure tipada correspondente.

# [](#framing-comes-before-rpc)Framing vem antes de RPC

JSON-RPC descreve mensagens, mas stdin é apenas uma sequência de bytes. O LSP acrescenta uma regra de framing:

```text
Content-Length: <quantidade de bytes em UTF-8>\r\n
\r\n
<corpo JSON>
```

Decidimos implementar essa camada de transporte antes do dispatcher de RPC. Enquanto não conseguirmos ler um body completo sem consumir bytes da mensagem seguinte, parsing de JSON ainda é o problema errado.

O framed reader precisa lidar com detalhes que um demo de uma única mensagem não revela:

- uma chamada de leitura ao sistema operacional pode devolver só parte de um header ou body;
- várias mensagens podem já estar no buffer;
- `Content-Length` é obrigatório, deve aparecer uma única vez e seu nome é case-insensitive;
- headers desconhecidos são válidos e devem ser ignorados;
- o valor precisa ser validado antes da alocação;
- headers e bodies precisam de limites explícitos; e
- EOF entre mensagens é limpo, enquanto EOF no meio de uma mensagem indica input truncado.

Um body vazio também não pode ter a mesma representação de um EOF limpo. Por isso, o reader retorna o body, um booleano indicando se existe uma mensagem e um error. Esse resultado extra é pequeno, mas evita representar dois estados diferentes do protocolo da mesma maneira.

Stdout deve conter somente mensagens LSP com framing. Logs e diagnósticos vão para stderr, porque uma única linha sem framing já é suficiente para corromper a conexão com o editor.

# [](#small-parser-decisions)Pequenas decisões no parser

O primeiro rascunho do reader também mostrou como código que manipula bytes se torna críptico rapidamente.

Comparações com `13`, `10`, `32`, `48` e `57` podem estar corretas em ASCII, mas escondem se o parser está procurando um fim de linha, whitespace opcional ou um dígito decimal. Mantivemos o buffer de transporte como bytes e convertemos cada byte para `char` apenas durante o parsing.

Também reutilizamos a biblioteca de texto padrão em vez de manter um acumulador decimal manual:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">const stringv VALUE_TEXT = line[start:end].cast&lt;stringv&gt;;

value, parseErr :=
    strings::stringv_to_int&lt;usize&gt;(VALUE_TEXT);</code></pre></div></div>

O restante do parser ainda precisa aplicar as regras específicas do protocolo. Ele remove somente espaços e tabs horizontais, porque o whitespace opcional no estilo HTTP aceita menos caracteres do que a categoria completa de whitespace ASCII. Também rejeita um `+` inicial, `Content-Length` duplicado ou ausente, overflow e valores acima do limite configurado para o body.

A comparação case-insensitive continua sendo um pequeno helper local sobre dois slices de bytes. Usar a mesma representação nos dois operandos evita misturar índices `usize` de slices com índices `u32` de `stringv` sem nenhum benefício semântico.

Nada disso é glamouroso para um LSP. Mas são exatamente essas decisões que determinam se o servidor continuará conectado depois da primeira mensagem fora do happy path.

# [](#tests-define-done)Os testes definem quando está pronto

A matriz de testes de framing é o próximo gate, não um acabamento para depois da implementação.

Ela cobre input completo e recebido byte a byte, mensagens consecutivas, headers com capitalização variada, headers desconhecidos, bodies vazios, EOF limpo, `Content-Length` duplicado ou ausente, overflow, limites de tamanho e headers ou bodies truncados.

Ao desenhar esses testes, já encontramos distinções que o primeiro rascunho não representava bem. Um helper não pode dar `break` no loop de quem o chamou. Encontrar o fim do header não é o mesmo que encontrar EOF. Um body válido de tamanho zero não é o mesmo que não receber mensagem alguma. E é fácil inverter uma verificação de EOF inesperado quando tanto o happy path quanto o caminho de falha são representados por um valor `error`.

O repositório já contém os documentos de arquitetura e a primeira implementação do framed reader. Ele só estará pronto quando toda essa matriz passar. Ainda faltam o writer, o dispatcher JSON-RPC, o lifecycle do LSP, o modo de análise do compilador e a integração com os editores.

# [](#the-compiler-conversation)A conversa com o compilador

No lado do compilador, a proposta é `flecha analyze --stdio`. Ele usará um protocolo JSON-RPC 2.0 mais enxuto e específico de Flecha, sem fingir que o próprio compilador é um LSP.

O processo de análise manterá source overlays para documentos ainda não salvos. Sempre que carregar um módulo, primeiro verificará se o LSP forneceu uma versão mais nova em memória; só recorrerá ao filesystem quando não houver overlay. Isso importa tanto para arquivos importados quanto para o arquivo atualmente aberto no editor.

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

O compilador retornará byte ranges em UTF-8, porque essa é sua representação nativa do código-fonte. O LSP fará a conversão para as posições de linha e caractere negociadas com o editor, incluindo UTF-16 quando necessário. A versão do documento acompanhará cada resultado, permitindo descartar diagnósticos desatualizados antes que cheguem à tela.

# [](#one-vertical-slice)Um primeiro fluxo ponta a ponta

Flecha 0.3.1 oferece streams padrão bloqueantes e pipes para processos filhos. Por isso, a primeira implementação será sequencial: ler uma mensagem do editor, fazer o dispatch, enviar no máximo uma request ao analisador, escrever a response e continuar.

Nesse modelo, ainda não há cancellation nem análise em background. Mensagens que chegarem enquanto uma análise estiver em andamento ficarão no buffer do sistema operacional. Essa limitação é aceitável para o primeiro fluxo, porque as fronteiras do protocolo não dependem de concorrência.

O objetivo é estreito de propósito:

```text
editor inicia flecha-lsp
  → initialize responde com sucesso
  → editor abre um documento Flecha ainda não salvo
  → compilador do workspace analisa o texto em memória
  → diagnósticos são publicados
  → shutdown termina com sucesso
```

Full-document sync vem primeiro. Hover, go to definition, references, completion, incremental sync, cancellation e múltiplos workspaces vêm depois que os diagnósticos provarem o fluxo ponta a ponta.

# [](#conclusion)Conclusão

A primeira decisão importante sobre o LSP não foi uma feature do editor. Foi decidir onde vive a fonte de verdade da linguagem.

`flecha-lsp` será um binário escrito em Flecha e versionado de forma independente, responsável pelo protocolo do editor e pelo estado dos documentos. O compilador do workspace continuará responsável por parsing e semântica, por trás de uma interface pequena, versionada e entre processos. JSON-RPC conecta as duas partes; o framing com `Content-Length` torna o stream de bytes confiável o suficiente para transportá-las.

Hoje já temos o repositório, a arquitetura, desserialização de JSON funcionando e o primeiro rascunho do transport reader. O próximo passo é fazer o framing passar por toda a matriz de falhas, implementar o framed writer e então construir o menor lifecycle JSON-RPC completo.

O LSP ainda não é útil para um editor. Mas suas responsabilidades finalmente estão estreitas o suficiente para que possamos construí-lo sem criar outra implementação de Flecha no caminho.

Espero que tenham gostado deste texto e aprendido algo novo. Como sempre, não se esqueçam de fazer sua **pesquisa!**

<a href="/pt-br/">Voltar</a>
