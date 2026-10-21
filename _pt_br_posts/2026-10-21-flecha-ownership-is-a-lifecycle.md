---
title: "Flecha Dev Log #35: Ownership É um Ciclo de Vida, Não um Ponteiro"
date: 2026-10-21
published: true
lang: pt-BR
translation_key: "flecha-ownership-is-a-lifecycle"
original_url: /flecha-ownership-is-a-lifecycle
permalink: /pt-br/flecha-ownership-is-a-lifecycle
---

# [](#intro)Introdução

Olá, pessoal!

Vocês sempre conseguem identificar o tempo de vida de um objeto que gerencia memória?

Em C++, essa pergunta fica surpreendentemente difícil assim que o objeto pode ser copiado, movido ou destruído. Quem é o dono da alocação? Quem ainda pode acessá-la? Qual destrutor vai liberá-la? Uma cópia duplica o recurso, compartilha o ownership ou apenas copia um endereço?

Esse problema deu um trabalho enorme para resolver em Flecha.

Copiar um valor não necessariamente duplica seu recurso. Mover um valor não pode destruir o recurso que está sendo transferido. Uma referência continuar existindo não prova que a memória por trás dela ainda esteja viva. Se um objeto possui outro objeto no heap, uma atribuição aparentemente inocente pode virar um double free, um vazamento ou uma referência pendente.

Resolvemos isso tratando ownership como um ciclo de vida acompanhado pelo compilador, e não como uma propriedade que esperamos que o programador deduza a partir de um ponteiro.

# [](#three-different-questions)Três perguntas diferentes

Discussões sobre memória costumam misturar três ideias separadas:

- **armazenamento**: onde os bytes vivem;
- **ownership**: quem deve liberar o recurso;
- **acesso**: quem pode ler ou modificar o recurso neste momento.

Essas ideias não são intercambiáveis.

Uma estrutura armazenada na stack pode ser dona de um buffer no heap. Um ponteiro raw pode acessar esse buffer sem possuí-lo. Uma referência verificada pode pegar a estrutura emprestada sem estender seu tempo de vida. Uma view somente leitura restringe o acesso, mas não mantém o dono vivo.

Flecha mantém essas relações separadas tanto no sistema de tipos quanto na análise semântica. Isso fornece ao compilador informação suficiente para responder à pergunta que importa em cada saída: qual valor ainda vivo carrega a responsabilidade de limpeza?

# [](#the-double-owner-problem)O problema dos dois donos

Considere um buffer que possui memória no heap:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Buffer {
    own []u8 bytes;
};

Buffer Buffer::init(own []u8 bytes) override {
    return build Buffer {
        self.bytes = bytes;
    };
}</code></pre></div></div>

`own []u8` é um buffer de tamanho definido em runtime e gerenciado pelo compilador. Sua alocação é liberada automaticamente quando o dono vivo sai de escopo.

Agora imagine que uma atribuição comum copiasse `Buffer` bit a bit:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">second := first;</code></pre></div></div>

Os dois valores conteriam o mesmo endereço e o mesmo tamanho. Se ambos acreditassem ser donos da alocação, ambos tentariam liberá-la. Se apenas um fosse o dono, a linguagem precisaria de uma regra oculta para decidir qual. Se compartilhassem ownership, toda cópia precisaria de contagem de referências, mesmo quando o programa não quisesse isso.

Flecha não escolhe nenhuma dessas respostas implicitamente.

Como `Buffer` contém um owner move-only, `Buffer` também é move-only. A atribuição transfere o valor completo e sua responsabilidade de limpeza para `second`. `first` fica indisponível até receber um novo valor.

# [](#a-move-transfers-the-obligation)Um move transfere a obrigação

Este é o fluxo completo:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void consume(Buffer buffer) {
    stdoutln(buffer.bytes.len());
}

void example() {
    bytes, failure := new&lt;own []u8&gt;(1024);
    if failure != none {
        return;
    }

    first := Buffer::init(bytes);
    second := first;

    // stdoutln(first.bytes.len()); // rejeitado: first foi movido
    consume(second);
}</code></pre></div></div>

Criar `first` move `bytes` para dentro da estrutura. Criar `second` move a estrutura inteira. Passar `second` por valor move o objeto para `consume`.

Nenhum move libera o buffer antecipadamente. Cada move transfere uma única obrigação de limpeza. Somente o último dono vivo executa a destruição.

Esta distinção é importante: um valor movido não é um objeto cujo recurso foi destruído. Ele é um espaço de armazenamento que já não contém um valor proprietário utilizável. O compilador acompanha esse estado e rejeita leituras, empréstimos e novos moves até que a variável seja reinicializada.

A regra é transitiva. Uma tupla, um array de tamanho fixo ou uma estrutura que contém um valor move-only também se torna move-only como um todo. Flecha ainda não permite moves parciais arbitrários, porque remover um campo deixaria um agregado cujo estado de destruição é muito mais difícil de provar.

# [](#borrows-must-end-before-the-owner-moves)Empréstimos precisam terminar antes do move do owner

Movimentação sozinha não basta. Também precisamos proteger referências e slices que apontam para o armazenamento possuído:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">buffer := Buffer::init(bytes);
view := buffer.bytes[:];

stdoutln(view[0]);
moved := buffer;</code></pre></div></div>

Esse código é válido porque o último uso de `view` acontece antes do move de `buffer`.

Inverta as duas últimas operações e o compilador rejeitará o move. O slice ainda estaria pegando emprestado o armazenamento cujo owner seria transferido. Destruir ou substituir `buffer` enquanto `view` estiver vivo é rejeitado pelo mesmo motivo.

Na análise semântica, portanto, uma referência é mais do que um endereço. Ela carrega uma origem, um modo de acesso e um último uso possível. Em runtime, ainda é reduzida a um endereço nativo comum; não existe contador de referências ou objeto de lifetime oculto.

É assim que Flecha impede a situação enganosa em que uma referência ainda existe, mas a memória para a qual ela aponta já desapareceu.

# [](#copying-requires-a-real-copy)Copiar exige uma cópia de verdade

Alguns valores devem ser copiáveis. Escalares são copiados naturalmente. Arrays de tamanho fixo são copiados quando todos os seus elementos são copiáveis. Strings proprietárias criam armazenamento independente conforme sua semântica de valor existente.

Um tipo que possui recursos não recebe esse comportamento por acidente.

Se dois buffers precisam se tornar owners independentes, o tipo deve expor uma operação explícita que aloque um novo armazenamento e copie os elementos. Essa operação pode falhar, portanto sua API pode retornar um erro com honestidade. Chamá-la de `clone`, `duplicate` ou usar um nome específico do domínio deixa o custo e o novo ownership visíveis no local da chamada.

O compilador nunca transforma um endereço copiado em um segundo owner. Um ponteiro raw continua sendo um endereço sem ownership, a menos que um contrato `own` explícito transfira uma alocação acompanhada. Um contrato `lend` permite acesso temporário sem transferir a responsabilidade de limpeza.

Essa distinção permite que as APIs digam exatamente o que acontece:

```text
copy    -> produz um valor independente quando o tipo define uma cópia real
move    -> transfere o valor existente e sua obrigação de limpeza
borrow  -> permite acesso sem transferir ou estender ownership
destroy -> libera o recurso mantido pelo último owner vivo
```

# [](#destruction-is-deterministic)A destruição é determinística

Todo recurso com ownership e ainda vivo possui exatamente um caminho de limpeza.

Flecha destrói valores no fim normal do escopo e em saídas de fluxo de controle como `return`, `break`, `proceed` e `jumpto` para um escopo externo. Estruturas destroem seus campos em ordem inversa. Um hook `tear` seguro e customizado torna a estrutura não copiável, mas ainda movível como um valor completo. Um `tear` unsafe e sensível ao endereço torna a estrutura imóvel; ela deve permanecer em seu armazenamento final e ser emprestada.

Mover um valor desativa a limpeza da origem e a ativa no destino. Substituir um owner avalia o novo valor antes de liberar o antigo. Um self-move direto é rejeitado. Junções de fluxo de controle preservam o estado conservador: se um valor pode ter sido movido em um dos caminhos de entrada, o código não pode fingir que ele definitivamente ainda possui um recurso.

Essas regras são bookkeeping de compile time. Elas não exigem garbage collector, grafo de ownership em runtime ou contagem de referências.

# [](#why-not-a-smart-pointer-menu)Por que não um menu de smart pointers?

C++ oferece várias estratégias úteis de ownership com `unique_ptr`, `shared_ptr` e `weak_ptr`. Elas resolvem problemas reais, mas escolher entre elas frequentemente passa a fazer parte de cada interface, container e grafo de objetos.

Flecha parte de um modelo padrão menor:

- um valor possui um recurso;
- owners completos são movidos em vez de duplicados implicitamente;
- referências verificadas e slices pegam emprestado sem possuir;
- uma cópia real deve criar um valor independente;
- ownership compartilhado não aparece silenciosamente.

Memória raw continua existindo para alocadores, runtimes e interfaces externas, mas `own` e `lend` tornam as transferências visíveis nessas fronteiras. Owners seguros como `own []T` mantêm o caso comum completamente fora de código unsafe.

Isso não torna todo padrão de ownership expressável. Ownership compartilhado, moves parciais arbitrários e alguns designs sensíveis ao endereço continuam fora do modelo atual. O compilador rejeita padrões que não consegue provar em vez de adivinhar qual destrutor deveria vencer.

# [](#conclusion)Conclusão

A parte difícil de um objeto proprietário não é armazenar um ponteiro. É preservar uma única história coerente durante cópia, move, empréstimo, substituição, fluxo de controle e destruição.

A resposta de Flecha é tornar essa história explícita. Valores copiáveis produzem valores independentes. Owners move-only transferem uma única obrigação de limpeza. Empréstimos preservam a origem que precisa continuar viva. A destruição determinística libera o recurso exatamente uma vez.

O resultado parece mais simples no local de uso porque a pergunta difícil — “quem é o dono desta memória agora?” — possui uma única resposta que o compilador consegue verificar.

Espero que este exemplo tenha deixado o modelo mais claro. Como sempre, não se esqueça de fazer sua **pesquisa!**

<a href="/pt-br/">Voltar</a>
