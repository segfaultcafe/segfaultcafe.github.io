---
title: "Flecha Dev Log #34: Retornando Referências e Slices"
date: 2026-10-17
published: true
lang: pt-BR
translation_key: "flecha-returning-references-and-slices"
original_url: /flecha-returning-references-and-slices
permalink: /pt-br/flecha-returning-references-and-slices
---
# [](#intro)Introdução

Olá, pessoal!

Flecha tinha verificado referências. Tinha verificado as fatias. Poderíamos pegar emprestado uma variável, passar o empréstimo em uma função, impedir o acesso conflitante enquanto estava vivo, e liberar a restrição após seu último uso.

Parecia que tínhamos tudo.

Depois tentámos devolver uma fatia.

A fatia em si é apenas um endereço e um comprimento. Devolver esses pedaços é fácil. A verdadeira questão é se o armazenamento por trás deles permanece vivo, e qual valor no chamador deve permanecer emprestado enquanto a visão retornada é usada.

Então o mesmo problema apareceu ao retornar uma referência a um campo de estrutura.

Como garantir que a vida emprestada permaneça no escopo? Como levamos essa relação através de uma chamada enquanto preservamos as regras de última utilização e exclusividade de Flecha?

É disso que se trata.

# [](#the-missing-relationship)A relação ausente

Considere uma função que retorna a cauda de uma fatia:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[]const i32 tail([]const i32 values) {
    return values[1:];
}</code></pre></div></div>
O tipo de retorno nos diz que o resultado é uma fatia somente para leitura. Não diz de onde veio a fatia.

Se veio de `values`, a sequência original do chamador deve permanecer emprestada. Se veio de um array local, retornando-o deve ser rejeitado porque esse array desaparece com a chamada. Se uma função recebe duas fatias, o tipo de resultado sozinho não pode nos dizer qual argumento ancora a visão retornada.

As referências têm exactamente a mesma lacuna:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">&amp;const i32 value(&amp;const Box self) {
    return &amp;self-&gt;value;
}</code></pre></div></div>
O compilador pode ver a origem dentro deste corpo, mas os chamadores precisam dessa relação no contrato da função. Uma vez que a função é registrada em outro módulo ou instanciada através de um genérico, sua implementação não pode ser o modelo vitalício do chamador.

# [](#name-the-source) Nome da fonte

Flecha agora escreve essa relação com `<- source`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[]const i32 tail([]const i32 values) &lt;- values {
    return values[1:];
}

&amp;const i32 value(&amp;const Box self) &lt;- self {
    return &amp;self-&gt;value;
}</code></pre></div></div>
Leia-o como “o empréstimo devolvido vem deste parâmetro.”

O contrato é informação de tempo de compilação. Ele não adiciona um objeto vitalício, contador de referência, alocação oculta ou campo extra a uma fatia. Referências e fatias mantêm sua representação nativa.

A fonte nomeada deve ser um parâmetro de referência ou de slice marcado. Um ponteiro bruto, possuindo ponteiro, valor ordinário, variável local ou temporário não pode ancorar um empréstimo devolvido seguro. Mesmo um bloco `unsafe` não pode fabricar essa prova.

Cada resultado que contenha uma referência verificada ou uma fatia verificada requer um contrato. Um contrato em uma função que retorna nenhum valor emprestado também é um erro. A sintaxe descreve uma relação exata; não é uma anotação decorativa.

# [](#the-callee-proves-the-origin)A função chamada prova a origem

Cada caminho de retorno acessível é verificado com a fonte declarada.

Devolver a fonte em si é válido. Então é retornando um reemprestado verificado derivado dele: um campo de estrutura, um elemento de arranjo fixo, uma fatia de arranjo fixo, um elemento de slice, ou um subslice. Devolver uma referência a um parâmetro local ou a outro parâmetro é rejeitado mesmo que os tipos pareçam idênticos.

Permissão pode ficar mais fraca, nunca mais forte:

```text
&T       -> &T          allowed
&T       -> &const T    allowed
&const T -> &const T    allowed
&const T -> &T          rejected

[]T       -> []T          allowed
[]T       -> []const T    allowed
[]const T -> []const T    allowed
[]const T -> []T          rejected
```
Uma função pode expor menos acesso do que recebeu. Não pode transformar o acesso partilhado em mutação exclusiva.

# [](#the-caller-inherits-the-loan) O chamador herda o empréstimo

Em um site de chamada, o compilador substitui a origem do argumento real no valor retornado:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">values := [10, 20, 30, 40];
rest := tail(values[:]);

stdoutln(rest[0]);
values[1] = 21;</code></pre></div></div>
Enquanto `rest` está ao vivo, ele protege a sequência original de acordo com as regras comuns de empréstimo. Sua última utilização é `rest[0]`, então a mutação posterior é válida.

Mova essa mutação antes que o `stdoutln` e o compilador a rejeite: a fatia somente leitura ainda pega emprestado a sequência. Tente mover, religar ou destruir a fonte enquanto o resultado é ao vivo e a mesma proteção se aplica.

O punho retornado participa de tudo o que Flecha já sabe: exclusividade, análise de última utilização, reemprestamento de pais, projeções de campo, alças movidas, ramificações, loops e saídas de escopo. Não precisávamos de um segundo cheque emprestado. Precisávamos do limite de chamadas para preservar a informação que faltava ao verificador existente.

# [](#contracts-compose)Contratos compõem

Uma função contratada pode retornar o resultado de outra função contratada quando o empréstimo interno, em última análise, vem da fonte declarada da função externa:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[]const i32 skip_two([]const i32 values) &lt;- values {
    return tail(tail(values));
}</code></pre></div></div>
A origem sobrevive às chamadas aninhadas, limites de módulos, especialização genérica e recursão. O compilador armazena o parâmetro fonte no símbolo de função, em seguida, substitui a origem do concreto do chamador cada vez que a função é usada.

É aqui que a escolha arquitectónica compensa. A relação faz parte do contrato semântico da função, por isso não desaparece após a análise ou depende da inserção do corpo.

# [](#more-than-one-result)Mais de um resultado

Uma única fonte pode produzir uma tupla plana contendo resultados emprestados:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Pair {
    i32 left;
    i32 right;
};

(&amp;i32, &amp;i32) fields(&amp;Pair pair) &lt;- pair {
    return (&amp;pair-&gt;left, &amp;pair-&gt;right);
}

Pair pair = none;
left, right := fields(&amp;pair);
*left = 20;
*right = 22;</code></pre></div></div>
Cada destino recebe sua própria origem, projeção, mutabilidade, movimento e estado de último uso. Campos distintos de estrutura podem ser provados disjuntos, então os dois resultados mutáveis acima são válidos.

Devolver o mesmo lugar mutável duas vezes é rejeitado. Misturar um resultado mutável com um resultado compartilhado sobreposto também é rejeitado. Array mutável e elementos de slice permanecem conservadores empréstimos de sequência inteira, então dois resultados de elementos mutáveis são rejeitados mesmo quando seus índices de tempo de execução acontecem para diferir.

O compilador aceita a desarticulação que pode provar, não a desarticulação que esperamos.

# [](#why-immediate-destructuring-matters) Por que a destruição imediata importa

Uma tupla contendo valores emprestados deve ser consumida através da destruição imediata:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">left, right := fields(&amp;pair);</code></pre></div></div>
Armazenar esse tuplo emprestado, aninhando-o, passando-o como um agregado ordinário, ou capturá-lo em `defer` é rejeitado.

A destruição imediata dá a todos os cabos devolvidos um estado independente localizado no local exacto da chamada. Apoiar um agregado armazenado de empréstimos exigiria que o próprio agregado preservasse e expusesse várias relações ao longo da vida. Até que esse modelo exista, manter a operação plana torna honesto o comportamento aceito.

# [](#what-the-contract-does-not-do) O que o contrato não faz

`<-` não transforma ponteiros brutos em referências verificadas. Ele não permite que uma API segura empreste armazenamento de pilha arbitrária cujo relacionamento de proprietário é desconhecido. Ele não cobre `stringv` retornado, referências C externas, ou vários parâmetros de fonte independentes.

Estes limites são intencionais. Uma única fonte é precisa o suficiente para indicar, validar, compor e explicar, para que o recurso aceito permaneça dentro do que o chamador pode provar hoje.

# [](#conclusion)Conclusão

Devolver uma referência ou fatia nunca foi principalmente sobre devolver um endereço. Tratava-se de devolver uma relação.

`<- source` faz dessa relação parte do contrato de função. O callee prova que cada resultado emprestado vem do parâmetro declarado; o chamador mantém o armazenamento correspondente emprestado por exatamente enquanto o resultado permanecer vivo.

Não é necessário nenhum coletor de lixo, alocação oculta ou tabela de vida útil. Preservamos a origem, aplicamos a permissão e deixamos a análise de última utilização fazer o resto.

Este é o tipo de problema Flecha que eu amo: a sintaxe é pequena, mas carrega exatamente as informações necessárias para fazer uma operação de baixo nível se sentir direta e ainda permanecer verificada.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
