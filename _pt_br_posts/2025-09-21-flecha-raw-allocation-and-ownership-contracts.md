---
title: "Flecha Dev Log #20: Alocação Raw e Contratos de Posse"
date: 2025-09-21
published: true
lang: pt-BR
translation_key: "flecha-raw-allocation-and-ownership-contracts"
original_url: /flecha-raw-allocation-and-ownership-contracts
permalink: /pt-br/flecha-raw-allocation-and-ownership-contracts
---
# [](#intro)Introdução

Olá, pessoal!

Os ponteiros brutos poderiam abordar a memória, adiar poderia agendar a limpeza, tuplas poderiam retornar múltiplos valores, erros poderiam descrever falha, e estruturas sabiam como derrubar-se.

As peças estavam prontas para alocação explícita.

`new`, `free`, análise de alocação obrigatória, e os contratos `own` e `lend` tornam a responsabilidade de limpeza explícita através dos limites de função e estrutura.

# [](#allocation-returns-two-things)Alocação retorna duas coisas

`new<T>(value)` retorna um ponteiro bruto e erro genérico:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">unsafe {
    (*u8 pointer, error err) = new&lt;u8&gt;(42);
    if err != none {
        return 1;
    }

    defer free(pointer);
    *pointer = 43;
}</code></pre></div></div>
O sucesso produz um ponteiro não null e `none`. Falha produz null e `AllocationError.OutOfMemory`.

O compilador calcula o tamanho e alinhamento nativos para `T`. O tempo de execução obtém armazenamento nulo, alinhado corretamente. No sucesso, o inicializador avalia uma vez e constrói diretamente nesse endereço final.

Na falha de alocação, o inicializador não é executado. Construtores não são chamados, atribuições dentro dele não acontecem, e não há nada para derrubar.

Esse caminho de falha teve que ser visível para a atribuição definitiva e análise emprestada.

# [](#free-knows-the-pointee-type) Free sabe o tipo de ponteiro

`free(pointer)` avalia o ponteiro uma vez. Para um ponteiro não null, ele executa o gancho de ruptura estrutura, recursivamente destrói campos e elementos próprios, em seguida, libera o armazenamento de backup.

`free(null)` é um não-op. Um ponteiro para const ainda pode ser liberado porque o acesso somente leitura não apaga a responsabilidade de propriedade.

Os ponteiros de vazio não podem usar esta operação livre digitada: o compilador precisa do tipo de ponto original para executar a destruição corretamente.

Endereços stack, endereços interiores, alocações estrangeiras, tipos desiguais e ponteiros já livres são entradas inválidas.

# [](#unsafe-is-still-checked)Unsafe ainda está verificada

Alocação e livre requerem permissão insegura, mas o compilador não pára por aí.

Após a verificação de tipo, atribuição definida e verificação emprestada, Flecha executa análise de alocação obrigatória antes de baixar. Ele rastreia identidades de alocação através de aliases locais, destruição de tuplas, instantâneos agregados imutáveis, atribuição de ponteiros mediada por referência, branches, loops, `also`, saltos, chamadas e limpezas diferidas.

Rejeita:

- perder o último cabo localizado ou deixar uma atribuição ao vivo para trás;
- libertar uma atribuição duas vezes através de nomes diferentes;
- utilizando um ponteiro após um rastreado livre;
- deferenciando o resultado da falha conhecida;
- libertando pilha conhecida ou armazenamento interior;
- a propriedade flui o verificador atual não pode representar.

Estes são erros, não avisos opcionais. Programas rejeitados não produzem nenhum arquivo objeto.

# [](#defer-reserves-cleanup) Adiar a limpeza das reservas

`defer free(pointer)` captura o ponteiro agora e agenda a liberação para saída de escopo.

Até lá, a atribuição continua em directo, mas a sua obrigação de limpeza está reservada. Uma transferência explícita de propriedade livre ou conflitante antes da execução da chamada diferida é rejeitada.

Religar a variável original não altera a alocação capturada:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">another, failure := new&lt;u8&gt;(1);
defer free(another);
another = null;</code></pre></div></div>
O instantâneo diferido ainda libera o byte alocado.

# [](#own-and-lend)Own e empréstimo

Interpretar cada corpo auxiliar só pode ir tão longe, especialmente para recursão e APIs fundamentadas separadamente. Flecha adicionou contratos de propriedade de pontos brutos explícitos:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">unsafe void release(own *i32 pointer) {
    free(pointer);
}

unsafe i32 read(lend *const i32 pointer) {
    if pointer == null {
        return 0;
    }
    return *pointer;
}

unsafe (own *i32, error) create() {
    return new&lt;i32&gt;(42);
}</code></pre></div></div>
`lend` permite o acesso durante a chamada, mas proíbe libertar, consumir, retornar ou manter a alocação.

`own` transfere responsabilidade de limpeza incondicionalmente no limite de chamada. Cada saída normal deve libertá-lo, enviá-lo para outro proprietário, armazená-lo em um campo próprio, ou devolvê-lo como um resultado próprio.

A transferência não é nula para nomes antigos em tempo de execução, mas o verificador torna esses nomes não disponíveis para acesso posterior ou limpeza.

# [](#ownership-inside-structures)Ownership dentro das estruturas

As estruturas podem declarar possuir campos de ponteiros brutos:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Box {
    own *i32 value;
};

unsafe Box Box::init(own *i32 value) override {
    return build Box {
        self.value = value;
    };
}

unsafe void Box::tear(&amp;self) override {
    free(self-&gt;value);
}</code></pre></div></div>
Um campo proprietário requer uma ruptura explícita, e o compilador verifica independentemente que todas as saídas normais de ruptura descarregam o campo.

Outros métodos recebem apenas acesso emprestado a ele. A extração, a substituição de um campo de posse ao vivo e o acesso externo arbitrário permaneceram restritos até que suas transições de estado pudessem ser modeladas.

# [](#conservative-limits)Limites conservativos

Este verificador não torna arbitrário seguro de memória de código inseguro.

Validade do ponteiro externo, aliasing bruto, nulidade e vida útil da pilha permanecem obrigações de chamada. Recipientes dinâmicos de ponteiros próprios, efeitos recursivos não anotados e padrões de propriedade fora do modelo de estado atual são rejeitados.

A análise também utiliza orçamentos estatais explícitos. Exceder-lhes é um erro compilador em vez de aceitação silenciosa. Código complexo válido pode precisar de fluxo de controle mais simples ou contratos declarados.

Esse tradeoff foi intencional: quando a propriedade não pode ser verificada, Flecha diz isso antes do código nativo existir.

# [](#conclusion)Conclusão

A atribuição em bruto completou uma longa cadeia de pré-requisitos. Ele dependia de permissão insegura, tuplas, erros, diferimento, destruição digitada, gráficos de controle-fluxo e regras de ciclo de vida da estrutura.

Os contratos de propriedade tornaram a responsabilidade de limpeza visível nos limites da API sem alterar a representação em tempo de execução do ponteiro.

O modelo passa de “o programador deve lembrar-se de libertar isto” para “o compilador requer um caminho de propriedade completo antes da geração de código.” Continua conservadora e explicitamente insegura, mas a responsabilidade de limpeza é visível e verificada mecanicamente.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
