---
title: "Flecha Dev Log #7: Views de Strings sem Alocação Oculta"
date: 2024-10-19
published: true
lang: pt-BR
translation_key: "flecha-string-views-without-hidden-allocation"
original_url: /flecha-string-views-without-hidden-allocation
permalink: /pt-br/flecha-string-views-without-hidden-allocation
---
# [](#intro)Introdução

Olá, pessoal!

Até este ponto, os programas nativos de Flecha poderiam calcular valores e retornar um código de saída. Isso foi o suficiente para provar o oleoduto, mas não o suficiente para tornar os programas agradáveis.

Queríamos uma mensagem. Mais especificamente, queríamos a representação de texto mais simples e útil primeiro: uma visão imutável sobre bytes.

`stringv` fornece essa representação, juntamente com literais de string, comparações de conteúdo e suporte a sintaxe do editor.

# [](#a-view-not-an-owner)Uma view, não um proprietário

Um `stringv` contém duas informações:

```text
address of immutable bytes + byte length
```
Não aloca nem possui os bytes. Um ponto literal no armazenamento estático incorporado no programa gerado:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">stringv Identity(stringv value) {
    return value;
}

i32 main() {
    message := Identity("Flecha");
    return 0;
}</code></pre></div></div>
O comprimento do literal é explícito. Não depende da digitalização de um bytes nulos. Isso faz com que zero bytes incorporados representem e permite que as operações funcionem em um intervalo exato.

Escolher uma visão primeiro também manteve a alocação fora do uso básico do texto. Passar um literal para uma função é copiar um par pequeno, não alocar um novo buffer.

# [](#the-target-decides-the-layout) O alvo decide a disposição

Em LLVM, `stringv` tornou-se uma estrutura contendo um ponteiro e um comprimento inteiro. O comprimento usa a largura do ponteiro do alvo.

Isso reutilizou uma decisão da geração de código nativo: o layout de dados do módulo deve ser instalado antes que tipos como `usize` ou `stringv` sejam construídos.

Os literais de texto tornam-se dados globais imutáveis. Os pontos de view gerados no primeiro byte e armazena a contagem de byte literal. Funções podem aceitar e devolver esse valor usando o tipo de pipeline comum.

Nenhum objeto de string C++ entra em código gerado. Nenhum tipo de implementação de compilador vaza para o idioma ABI.

# [](#equality-means-content)Equality significa conteúdo

Duas visões de string são iguais quando seus comprimentos e bytes são iguais - não quando seus ponteiros coincidem.

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">bool Equal(stringv left, stringv right) {
    return left == right;
}

i32 main() {
    message := Identity("Flecha");

    if Equal(message, "Flecha") and
       message != "Arrow" and
       "" == "" {
        return 42;
    }

    return 0;
}</code></pre></div></div>
A caixa de texto vazia valeu a pena testar explicitamente. Uma visão de comprimento zero deve comparar corretamente sem exigir um acesso de elemento válido ou dependendo de uma identidade específica do ponteiro.

O backend especial-cased string-view igualdade porque a operação é semântica, não uma única comparação inteira. Flecha ainda o expõe através dos familiares operadores `==` e `!=`.

# [](#what-we-deliberately-did-not-add) O que deliberadamente não acrescentamos

`stringv` não era uma string cultivável, uma alocação própria, ou uma abstração Unicode.

O primeiro modelo de texto contou bytes, e `char` permaneceu um valor de oito bits. Unicode decodificação e iteração de ponto de código pertenciam a uma futura biblioteca de texto. Manter essas preocupações separadas impediu a representação de armazenamento de fingir que tinha semântica Unicode que não implementou.

A propriedade continua separada. Uma visão pode se referir a dados estáticos ou armazenamento gerenciado em outro lugar, mas não pode manter o armazenamento dinâmico vivo.

# [](#the-language-should-look-like-a-language)A linguagem deve parecer uma linguagem

Este marco também adicionou suporte de sintaxe Flecha para Neovim: nomes de tipos, modificadores, palavras-chave de fluxo de controle, operadores, rótulos, números, strings, caracteres, comentários e nomes de funções.

A correção do compilador vem em primeiro lugar, mas o suporte ao editor muda como uma linguagem se sente. Uma nova sintaxe torna-se mais fácil de digitalizar, exemplos tornam-se mais fáceis de rever, e erros tornam-se visíveis antes de o compilador executar.

As regras do editor receberam seu próprio teste de sintaxe. O realce foi tratado como ferramental mantido em vez de uma coleção colada de expressões regulares.

# [](#conclusion)Conclusão

`stringv` deu ao Flecha texto útil sem alocação oculta. Também nos forçou a estabelecer uma representação concreta: ponteiro mais comprimento, tamanho de alvo, imutável e orientada para byte.

O resultado é texto útil sem alocação oculta, enquanto a saída e outros serviços de plataforma permanecem perfeitamente separados da infraestrutura LLVM através do limite de tempo de execução.

<a href="/">Voltar</a>
