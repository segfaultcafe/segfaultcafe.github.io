---
title: "Flecha Dev Log #1: Dando Forma ao Código-Fonte"
date: 2024-04-22
published: true
lang: pt-BR
translation_key: "flecha-giving-source-code-a-shape"
original_url: /flecha-giving-source-code-a-shape
permalink: /pt-br/flecha-giving-source-code-a-shape
---
# [](#intro)Introdução

Olá, pessoal!

Há um momento no início de cada projeto compilador quando a linguagem existe principalmente em nossas cabeças. Podemos descrever a sintaxe, discutir sobre tipos e escrever pequenos exemplos, mas o compilador ainda vê um arquivo como nada mais do que caracteres.

Flecha tinha chegado àquele momento. Já tínhamos um tokenizer a produzir tokens. A pergunta seguinte foi enganosamente simples: ** que forma um programa Flecha deve ter dentro do compilador?**

O analisador e a árvore de sintaxe abstrata são o ponto onde esses tokens começam a representar um programa.

Vamos saltar para cima dele!

# [](#tokens-are-not-a-program)Tokens não são um programa

Suponhamos que queremos compilar isto:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 answer = 40 + 2;</code></pre></div></div>
O tokenizer pode reconhecer um tipo, um nome, um operador de atribuição, dois números, um operador de adição e um ponto e vírgula. Isso é útil, mas não diz ao resto do compilador que `40 + 2` inicializa `answer`.

Precisávamos de uma árvore de sintaxe abstrata, ou AST: uma representação da estrutura gramatical do programa. Uma declaração possui um inicializador, uma expressão binária possui seus operandos, e todo nó sabe de onde veio no arquivo fonte.

Essa parte final importa. É tentador armazenar apenas as informações necessárias para executar o programa. Mas quando algo está errado, um compilador deve apontar de volta para o pedaço exato da fonte que causou isso. Locais de origem não são decoração diagnóstica adicionada no final; eles têm que viajar com o programa desde o início.

# [](#the-first-parser) O primeiro analisador

O analisador inicial introduziu um pequeno conjunto de operações que ainda descrevem o ritmo de um analisador recursivo-descente:

- verificar o token atual;
- combiná-lo e avançar quando for o tipo esperado;
- consumir um token necessário ou relatar um erro;
- analisar a próxima expressão de acordo com a gramática.

O primeiro analisador de expressões reconheceu literais e nomes. Isso soa minúsculo – e foi – mas estabeleceu a direção. O analisador produziria nós, não executaria o comportamento. Etapas posteriores do compilador poderiam perguntar o que um nó significava sem reabrir o fluxo original do token.

Nós também fizemos o analisador próprio seu progresso através dos símbolos. `NextToken` deixou de fazer parte da interface pública do tokenizer. A tokenização produz uma sequência completa; a análise consome essa sequência de acordo com a gramática. Manter esses trabalhos separados impediu o analisador de chegar para trás no estado lexer.

# [](#an-ast-is-an-ownership-problem)Uma AST é um problema de posse

Um AST é uma árvore de objetos dinamicamente alocados. Isso levanta imediatamente uma pergunta muito C++: quem os destrói?

O modelo inicial do nó incluiu locais de origem, tipos, valores, variáveis, nós de memória, nós de ponteiro e nós de expressão. Os testes não só verificaram que os campos continham os dados certos. Eles também apagaram nós completos e correram com vazamento e detecção livre de uso habilitado.

Foi uma decisão arquitectónica disfarçada de canalização de teste. Um compilador cria milhares de objetos pequenos enquanto processa um arquivo. Se a propriedade é ambígua no nível AST, cada característica posterior multiplica a ambiguidade.

O modelo continuaria evoluindo em direção apenas a árvores móveis e proprietários explícitos, mas a regra já estava ficando clara:

> Todo objeto compilador precisa de um proprietário óbvio, enquanto as referências entre as etapas devem ser deliberadamente não-proprietárias.

Essa regra eventualmente alcançou símbolos, escopos, modelos semânticos, e a RI que baixa. Começou aqui, quando a árvore ainda era pequena o suficiente para entender completamente.

# [](#syntax-is-allowed-to-change)Syntax é permitido mudar

Alguns dos primeiros testes AST ainda continham grafias experimentais, como `int!`. Esses testes são fósseis úteis. Lembram-nos que construir uma língua não é a mesma coisa que proteger todos os primeiros ortografias para sempre.

O que importava neste marco não era se um símbolo tipo sobreviveu. Foi que os tipos tinham uma representação dedicada, faixas de origem sobreviveram à análise, e expressões tornaram-se uma estrutura que outros passes poderiam consumir.

Estávamos escolhendo uma arquitetura que permitia que a linguagem mudasse sem reescrever todo o compilador cada vez que ela mudava.

# [](#what-we-had) O que tivemos

No final desta etapa, Flecha tinha:

- um tokenizer com uma superfície pública deliberadamente menor;
- a primeira máquina de análise recursiva;
- uma AST com locais de origem e categorias de nó digitados;
- testes de construção, acesso e destruição;
- suporte ao higienizador para vazamentos de memória e bugs livres de uso.

Ele ainda não poderia responder se um nome existia, se dois tipos eram compatíveis, ou se um programa poderia se tornar código nativo. Foi bom. A fonte finalmente tinha uma forma.

E uma vez que um compilador pode representar um programa, ele pode começar a entender um.

# [](#conclusion)Conclusão

A parte emocionante de um primeiro AST não é o número de nós que ele contém. É o limite que cria. O texto torna-se sintaxe. A sintaxe torna-se algo que podemos inspecionar, testar e transformar.

Uma AST também expõe sua própria fronteira. Um analisador pode nos dizer que `value + 1` é uma expressão binária. Determinando qual `value` queremos dizer, se é numérico, ou se foi declarado em tudo pertence à análise semântica.

<a href="/">Voltar</a>
