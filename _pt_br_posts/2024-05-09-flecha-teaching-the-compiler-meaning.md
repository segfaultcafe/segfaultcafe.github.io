---
title: "Flecha Dev Log #2: Ensinando ao Compilador o Significado do Código"
date: 2024-05-09
published: true
lang: pt-BR
translation_key: "flecha-teaching-the-compiler-meaning"
original_url: /flecha-teaching-the-compiler-meaning
permalink: /pt-br/flecha-teaching-the-compiler-meaning
---
# [](#intro)Introdução

Olá, pessoal!

A árvore de sintaxe abstrata de Flecha pode identificar uma função, uma declaração e uma chamada.

Isso é sintaxe. Não significa nada.

Considere este programa perfeitamente analisável:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    answer := missing + 1;
    return false;
}</code></pre></div></div>
O aparelho bate. Os operadores estão em posições legais. No entanto `missing` não existe, e uma função retornando `i32` não pode retornar `bool`.

A análise semântica conecta essa sintaxe a escopos, símbolos, tipos resolvidos e diagnósticos exatos.

# [](#two-type-worlds) Dois mundos de tipo

Uma das primeiras decisões foi manter os tipos de sintaxe e os tipos semânticos separados.

Um tipo de AST registra o que o programador escreveu. Um tipo semântico registra o que o compilador resolveu. São parentes, mas não são o mesmo trabalho. A camada semântica também precisa de conceitos internos, tais como tipos de função, tipos de recuperação de erros e estados que nunca devem se tornar sintaxe de fonte.

O primeiro modelo semântico compreendeu todas as larguras primitivas:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i8 tiny = 1;
i32 ordinary = 32;
u64 large = 64;
f32 decimal = 1.25;
bool ready = true;
char marker = '!';</code></pre></div></div>
Os padrões literais foram deliberados: literais inteiros tornaram-se `i32`, literais de ponto flutuante tornaram-se `f64`, e strings, caracteres, booleanos, `null`, e `none` cada um manteve sua própria categoria semântica.

Mais importante ainda, tipos numéricos distintos não coagir silenciosamente. Se dois operandos aritméticas têm tipos diferentes, o compilador rejeita a expressão e requer uma conversão explícita.

# [](#names-need-identities) Os nomes precisam de identidades

Nomes textuais não são suficientes. Duas variáveis podem ter a mesma ortografia e ainda ser variáveis diferentes:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    value := 1;

    if true {
        value := false;
        value = true;
    }

    value = 2;
    return value;
}</code></pre></div></div>
O `value` interior intencionalmente esconde o exterior. Para modelar isso corretamente, Flecha introduziu símbolos e escopos lexicais.

A pesquisa começa no escopo atual e caminha para fora. Nomes duplicados são rejeitados dentro de um escopo, mas escopos aninhados podem sombra. Funções vivem no escopo de compilação-unidade. Parâmetros e locais de nível superior vivem em um escopo de função. Os corpos condicionais criam espaços para crianças.

O modelo semântico liga cada expressão de nome diretamente ao símbolo que resolveu. Etapas posteriores não repetir a pesquisa ou adivinhar com base no texto.

# [](#declaration-order-is-a-language-rule)Declaration order é uma regra de linguagem

Funções são registradas antes de seus corpos serem analisados, o que permite que uma função chame outra função declarada posteriormente no arquivo.

Os locais seguem uma regra diferente. Seu inicializador é analisado antes do novo nome entrar no escopo:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    value := value + 1;
    return value;
}</code></pre></div></div>
Isso é um erro. A declaração não pode inicializar-se encontrando acidentalmente o nome sendo criado. A mesma decisão torna o uso-antes-declaração fácil de diagnosticar.

O operador da declaração inferida também ganhou real significado:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">base := 32;
sum := (base + 10) * 2;
comparison := sum &gt; base;</code></pre></div></div>
`sum` resolve para `i32`; `comparison` resolve para `bool`. A inferência já não é conveniência de análise. É um resultado semântico armazenado em um símbolo.

# [](#diagnostics-are-an-api)Diagnostics are an API

O analisador introduziu códigos diagnósticos estáveis de `FLECHA-S0001` em frente. Declarações duplicadas, nomes desconhecidos, atribuições incompatíveis, operandos inválidos, condições não-booleanas, tipos de retorno ruins e chamadas inválidas cada uma recebeu uma identidade distinta.

Também mantivemos intervalos de código exatos em identificadores e expressões. Relatar “algo está errado nesta função” é fácil. Sublinhando precisamente a segunda declaração de `value` é a parte útil.

Após um erro, o analisador produz um tipo de erro interno. Isto permite que as declarações independentes continuem a ser verificadas sem gerar uma cascata de absurdos derivados da primeira falha.

Essa escolha fez dos diagnósticos parte da arquitetura do compilador. Uma compilação falhada ainda deve produzir saída estruturada, estável e útil.

# [](#ownership-between-stages)Ownership entre estágios

O AST possui seus nós de sintaxe. O modelo semântico possui símbolos e escopos. Tabelas que conectam nós de sintaxe a objetos semânticos contêm ponteiros não proprietários.

Símbolos e escopos são alocados individualmente, então mover o modelo não invalida seus endereços. O modelo pode responder perguntas sobre o AST, mas não deve sobreviver a esse AST.

Este contrato vitalício é específico, testável e um pouco chato – que é exatamente o que queremos da infraestrutura do compilador.

# [](#conclusion)Conclusão

Com a análise semântica, Flecha cruzou uma fronteira importante. O compilador não mais reconheceu apenas programas gramaticais. Compreendeu declarações, ligações, tipos, chamadas, atribuições e retornos.

O modelo semântico é moldado para responder perguntas sobre código fonte. Um gerador de código precisa de um limite mais rigoroso: nomes já resolvidos, tipos já anexados e sintaxe complexa normalizada em um conjunto menor de operações.

<a href="/">Voltar</a>
