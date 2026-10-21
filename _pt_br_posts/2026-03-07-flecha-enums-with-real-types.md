---
title: "Flecha Dev Log #26: Enums São Tipos Reais"
date: 2026-03-07
published: true
lang: pt-BR
translation_key: "flecha-enums-with-real-types"
original_url: /flecha-enums-with-real-types
permalink: /pt-br/flecha-enums-with-real-types
---
# [](#intro)Introdução

Olá, pessoal!

As constantes inteiras nomeadas são úteis até que o compilador se esqueça do que significam. Um tipo de token e um estado de conexão podem caber em um byte, mas isso não os torna intercambiáveis.

Os enums Flecha são tipos escalares nominais, sem alocação. Eles mantêm a eficiência de uma representação inteira enquanto dão ao verificador de tipo um vocabulário fechado de valores.

# [](#declaration-and-representation)Declaração e representação

Um enum pode escolher seus inteiros de apoio e discriminantes:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">export enum TokenKind: u16 {
    default NoToken = 0,
    Identifier,
    Number = 10,
    End,
}</code></pre></div></div>
O tipo de backup é padrão para `u32`. Os discriminantes implícitos começam em zero e continuam a partir do valor anterior; valores explícitos podem criar lacunas significativas. Os tipos de apoio assinados permitem valores negativos.

O compilador verifica que cada valor se encaixa no seu tipo de suporte e que ambos os nomes e discriminantes são únicos. O enum baixa para sua representação inteira, mas essa representação não apaga o tipo declarado.

`TokenKind.Identifier` e uma variante de outro enum permanecem incompatíveis mesmo quando ambos acontecem para igualar um. Não existem conversões automáticas inteiro-para-enum ou enum-para-integer.

# [](#qualified-values)Valores Qualificados

O nome de enum é um tipo, não um valor. As variantes permanecem qualificadas:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">TokenKind kind = TokenKind.Identifier;

if kind == TokenKind.End {
    stdoutln("done");
}</code></pre></div></div>
A qualificação torna o domínio visível em cada uso e evita o preenchimento do escopo do módulo com nomes genéricos como `End`, `Open` ou `None`.

Igualdade e igualdade estrita trabalho entre valores do mesmo enum. Aritmética, ordenação, incremento, testes implícitos de verdade, e comparação entre o eno não. Um enum descreve alternativas; não é um inteiro usando uma etiqueta.

# [](#a-semantic-default)Um valor padrão semântico

No máximo uma variante pode ser marcada `default`. Essa variante dá ao contexto `none` um significado útil:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">enum State: u8 {
    Off,
    default Unknown = 7,
    On,
}

State state = none;       // State.Unknown
[3]State states = none;   // every element is State.Unknown
</code></pre></div></div>
O padrão é semântico, então ele não precisa discriminante zero. Arrays e estruturas inicializam o valor selecionado real em vez de limpar bytes e assumindo que o resultado é significativo.

Sem uma variante padrão, o contexto `none` é rejeitado. Uma variável ainda pode ser declarada para atribuição posterior, e análise de atribuição definitiva impede leituras prematuras.

# [](#behavior-without-boxing)Behavior sem boxe

Enums pode ter métodos fora de linha usando o mesmo modelo receptor de estruturas:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">bool State::is_on(&amp;const self) {
    return *self == State.On;
}

void State::turn_on(&amp;self) {
    *self = State.On;
}</code></pre></div></div>
Apenas leitura, mutável, ponteiro, estática, privada e métodos genéricos seguem as regras existentes da linguagem. Nenhum cabeçalho de objeto ou alocação de heap é introduzido; o valor ainda é o escalar de backup em tempo de execução.

Enums podem ser armazenados em estruturas, tuplas, arrays fixos, recipientes genéricos, referências e ponteiros brutos. Sua inicialização e destruição permanecem compiladores definidos porque escalar enums não têm ganchos de ciclo de vida personalizados.

# [](#conclusion)Conclusão

Enums fechar uma lacuna entre representação e significado. A máquina recebe um inteiro compacto; o programador recebe um tipo distinto, valores qualificados, padrões verificados e métodos.

É uma pequena característica na superfície, mas dá a muitas APIs um vocabulário muito mais afiado.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
