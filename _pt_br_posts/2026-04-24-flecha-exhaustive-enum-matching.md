---
title: "Flecha Dev Log #27: Pattern Matching Exaustivo em Enums"
date: 2026-04-24
published: true
lang: pt-BR
translation_key: "flecha-exhaustive-enum-matching"
original_url: /flecha-exhaustive-enum-matching
permalink: /pt-br/flecha-exhaustive-enum-matching
---
# [](#intro)Introdução

Olá, pessoal!

Um enum define um conjunto fechado de possibilidades. Uma vez que o compilador sabe que conjunto, pedindo programadores para reconstruir exaustividade com uma cadeia de declarações `if` iria desperdiçar a informação mais útil que o tipo fornece.

O `match` de Flecha é uma expressão que avalia um valor de enum uma vez, seleciona um braço, e requer que os casos sejam completos.

# [](#match-produces-a-value)O `match` produz um valor

Como `match` é uma expressão, ela se encaixa diretamente em um retorno ou atribuição:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 precedence(TokenKind kind) {
    return match kind {
        TokenKind.Identifier =&gt; 1,
        TokenKind.Number =&gt; 2,
        TokenKind.End =&gt; 0,
    };
}</code></pre></div></div>
Cada braço contém uma expressão. A declaração, argumento, atribuição ou retorno incluso pode fornecer seu tipo esperado; caso contrário, o primeiro braço estabelece o tipo de resultado e os restantes braços devem ser atribuídos a ele.

Somente o braço selecionado executa. A expressão de entrada em si executa exatamente uma vez, então uma chamada ou incremento usado como o assunto não pode ser duplicado baixando.

# [](#exhaustiveness-is-checked)Exaustiveness é verificada

Sem um wildcard, cada variante deve aparecer exatamente uma vez. Falta uma variante é um erro de tempo de compilação. Assim são variantes duplicadas, variantes desconhecidas, e variantes de outro enum.

Isto transforma o crescimento em pressão útil. Adicione um novo tipo de token, reconstrua e cada combinação completa que precise de uma decisão aponta diretamente para o comportamento ausente.

Para casos em que vários valores partilham intencionalmente o comportamento, o `_` cobre tudo o que ainda não foi nomeado:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">bool TokenKind::ends_input(&amp;const self) {
    return match *self {
        TokenKind.End =&gt; true,
        _ =&gt; false,
    };
}</code></pre></div></div>
O Wildcard deve ser o último braço. Código depois que seria inacessível, e Flecha relata que em vez de aceitar silenciosamente uma lista enganosa.

# [](#a-focused-pattern-language)Uma linguagem de padrões focada

A linguagem padrão inicial tem duas formas: uma variante de enum qualificada e `_`.

Não há guardas, faixas, padrões inteiros ou de strings, padrões de destruição ou braços encorpados aqui. Manter a primeira versão estreita tornou possível definir exaustividade, digitação, ordem de avaliação e geração de código sem fingir apoiar um sistema de padrão geral.

Esse foco também mantém o `match` alinhado com seu propósito: tomar decisões sobre um tipo nominal fechado.

# [](#lowering-to-a-switch)Baixando para um `switch`

O compilador baixa a expressão para um interruptor sobre o inteiro de apoio do enum. Cada representação válida atinge um braço.

Quando a fonte lista todas as variantes e não tem nenhum wildcard, representações inteiras impossíveis tornam-se inalcançáveis na infraestrutura. Quando `_` existe, torna-se a borda padrão. A prova de completude de nível de fonte, portanto, mapeia perfeitamente o fluxo de controle nativo eficiente.

# [](#conclusion)Conclusão

`match` permite que a declaração de enum faça um trabalho real. Ele remove comparações repetidas, mantém a produção de valor concisa, e torna casos esquecidos um problema compilador.

A parte que mais gosto é o quão direto o código lê: aqui está um valor, aqui estão todos os seus significados, e aqui está o resultado para cada um.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
