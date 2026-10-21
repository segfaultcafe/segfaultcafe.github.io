---
title: "Flecha Dev Log #11: Const São Duas Perguntas Diferentes"
date: 2025-05-06
published: true
lang: pt-BR
translation_key: "flecha-const-is-two-different-questions"
original_url: /flecha-const-is-two-different-questions
permalink: /pt-br/flecha-const-is-two-different-questions
---
# [](#intro)Introdução

Olá, pessoal!

O rascunho do modelo de memória separou armazenamento, propriedade e acesso. A primeira etapa de implementação parecia familiar: adicione `const`.

Então os tipos compostos tornaram a palavra familiar ambígua.

`const` significa que o ponteiro não pode ser rebote, ou que o valor por trás dele não pode ser alterado? O que acontece quando uma referência aponta para um ponteiro? Será que ler um valor const faz sua cópia const também?

Declarações de valor const e uma representação tipo recursiva responder a essas perguntas uma camada de cada vez.

# [](#const-values)Const values

Um const local requer um inicializador, mas esse inicializador pode ser executado em tempo de execução:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">const i32 add(const i32 input) {
    const i32 increment = 2;
    return input + increment;
}

i32 main() {
    const i32 answer = add(40);
    copy := answer;
    copy = copy + 1;
    return answer;
}</code></pre></div></div>
`answer` não pode ser transferido. `copy` pode, porque ler um valor const produz um valor ordinário. Const pertence à ligação que armazena o valor; não é contagioso.

A mesma regra aplica-se aos tipos e moldes de retorno. Uma função retornando `const i32` não força a nova ligação do chamador a ser const. O chamador escolhe isso em sua própria declaração.

Const também não significa avaliação de tempo de compilação. Significa “esta ligação não pode mudar após a inicialização”, se o valor inicial é literal ou o resultado de uma chamada de função.

# [](#none-remains-explicit)None permanece explícito

O valor universal `none` continuou a solicitar o zero definido por um tipo:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">const i32 count = none;
const bool ready = none;
const string message = none;</code></pre></div></div>
Essas variáveis são inicializadas - para `0`, `false`, e uma cadeia de posse vazia. Uma declaração sem inicializador é um estado diferente e não é permitida para os moradores locais.

Isto preservou a distinção de atribuição definida: “fixo após a construção” ainda requer construção.

# [](#binding-versus-target)Binding versus alvo

A mudança maior foi um modelo tipo recursivo. Cada ponteiro ou camada de referência pode ter o seu próprio qualificador:

□ Tipo □ Manípulo rebind? Modificar o alvo?
--- --- --- --- --- --- ---
`*u8` Sim, em código inseguro
Sim Não
Sim, em código inseguro
`constptr const u8`
Sim
Sim Não
`constref u8`
`constref const u8`

`constptr T` é o apelido legível para `const *T`: a ligação do ponteiro é fixa. `*const T` em vez disso faz o alvo somente leitura.

A mesma separação aplica-se às referências. Uma referência fixa pode ainda permitir escrever através de si mesma; uma referência compartilhada rebindable pode ainda proibir a escrita alvo.

Esta foi a decisão que manteve a constness de colapsar em uma parte global “imutável de alguma forma”.

# [](#recursive-types)Tipos recursivos

Os tipos compostos foram normalizados recursivamente:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void inspect(
    &amp;*u8 referenceToPointer,
    *const *const u8 pointerToFixedReadOnlyPointer,
    constref *const u8 fixedReferenceToReadOnlyPointer
) {}</code></pre></div></div>
Igualdade de tipo semântica agora comparado tipo, qualificador e alvo em cada camada. Diagnósticos impressos tipos expandidos em vez de confiar em alias ortografia. A leitura de um valor removido apenas o seu qualificador de ligação exterior; aninhadas restrições alvo permaneceu intacta.

O analisador e o modelo semântico poderiam representar esses tipos antes que o compilador pudesse executá-los. O uso de ponteiro e de referência ainda foi rejeitado antes de baixar.

Essa fronteira encenada foi deliberada. Queríamos resolver o vocabulário do tipo antes de atribuir comportamento inseguro ou emprestado a ele.

# [](#const-does-not-own) Const não possui

Const não estendeu vidas, criou propriedade ou fez uma visão segura para escapar.

Uma cadeia de posse ainda possuía sua alocação. A cópia produziu um proprietário mutável independente sob as regras atuais da string. Um const `stringv` ainda dependia do armazenamento de outra pessoa.

Esta distinção tornou-se útil: mutabilidade, propriedade e vida útil são eixos separados. Uma palavra-chave não deve fingir resolver todos os três.

# [](#conclusion)Conclusão

A característica visível são declarações const. O resultado mais profundo é um sistema de tipo que expressa ligações fixas e alvos somente leitura de forma independente, mesmo quando ponteiros e referências são aninhados.

<a href="/">Voltar</a>
