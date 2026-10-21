---
title: "Flecha Dev Log #28: Testando a Instalação, Não o Checkout"
date: 2026-05-13
published: true
lang: pt-BR
translation_key: "flecha-testing-the-installation-not-the-checkout"
original_url: /flecha-testing-the-installation-not-the-checkout
permalink: /pt-br/flecha-testing-the-installation-not-the-checkout
---
# [](#intro)Introdução

Olá, pessoal!

Um compilador que passa testes dentro de seu próprio repositório prova menos do que aparece primeiro. O checkout contém arquivos de origem, metadados de compilação, artefatos gerados e caminhos que um usuário instalado nunca terá.

Uma libertação pode ser verde em IC e ainda falhar no momento em que alguém desempacotar em outro lugar.

Os testes de lançamento de Flecha agora tratam o arquivo como um usuário a jusante: instalá-lo de forma limpa, movê-lo e construir programas usando apenas o que a distribuição promete.

# [](#the-archive-is-the-product) O arquivo é o produto

O artefato importante não é o diretório de compilação. É o arquivo contendo `flecha`, Longbow, a biblioteca runtime, a biblioteca padrão, suporte ao editor, licenças e documentação em seu layout instalado.

O teste de fumaça desembala esse arquivo em um local limpo e deliberadamente realoca-o antes de executar qualquer coisa. Se um binário acidentalmente se lembrar de um caminho de construção absoluto, a realocação expõe o erro imediatamente.

O compilador instalado deve encontrar o seu tempo de execução correspondente em relação a si mesmo. Longbow deve encontrar a biblioteca padrão empacotada sem uma dica de árvore fonte. Um projeto deve compilar e vincular sem voltar ao checkout original.

# [](#consume-it-like-a-user)Consumi-lo como um usuário

O ambiente limpo faz as mesmas perguntas que uma nova instalação:

```sh
flecha --version
longbow --version
longbow check
longbow build
longbow run
```
Ele também compila programas de arquivo único direto, exercita saída nativa, verifica dependências de projetos locais e verifica os arquivos embalados.

É uma inversão que merece ser enfatizada. Em vez de testar alvos internos e assumir que a embalagem os preserva, o teste começa com o pacote e vê se os fluxos de trabalho públicos sobrevivem.

# [](#host-tools-are-explicit)Host ferramentas são explícitas

O arquivo carrega o tempo de execução LLVM que ele precisa, então os usuários não precisam de cabeçalhos de desenvolvimento LLVM apenas para executar Flecha. Produzir um executável nativo ainda precisa de um driver de linker host e arquivos de inicialização de plataforma ou SDK.

Os trabalhos de instalação limpa fornecem apenas os pré-requisitos documentados. Se o arquivo funciona apenas porque um ambiente de desenvolvimento completo aconteceu de ser pré-instalado, o teste deve falhar.

A verificação de emissões de objetos e frontends permanecem distinções úteis: `flecha check` e `--emit-object` não invocam o linker do sistema, enquanto uma compilação executável invoca.

# [](#every-platform-is-a-consumer)Toda plataforma é um consumidor

Linux, Windows sob MSYS2 UCRT64, macOS x86-64 e macOS arm64 cada um executa o arquivo como um novo consumidor.

Este não é um teste genérico de embalagem repetido quatro vezes. Caminhos, bibliotecas dinâmicas, sufixos executáveis, drivers nativos, descoberta SDK, formatos de arquivo e comportamento shell diferem. O contrato comum é que uma instalação contém tudo o que Flecha possui e informa claramente tudo o que o anfitrião deve fornecer.

# [](#release-engineering-is-language-work)Release engenharia é trabalho de linguagem

Módulos, o ABI em tempo de execução, a biblioteca padrão, links nativos e Longbow se encontram dentro da árvore de diretórios instalada. Um caminho relativo quebrado pode tornar um recurso de linguagem correto inutilizável.

Testando a instalação pública, portanto, protege a arquitetura, não apenas a embalagem. Ele força o compilador e componentes de ferramentas a concordar sobre o que o limite de distribuição realmente é.

# [](#conclusion)Conclusão

O teste de lançamento mais forte começa esquecendo como o repositório foi construído.

Ao consumir um arquivo realocado em um ambiente limpo, Flecha verifica a experiência que estamos realmente oferecendo: desempacotar a ferramenta, criar ou abrir um projeto e construir código nativo com pré-requisitos de host documentados.

Isso faz um lançamento se sentir menos como um diretório de construção comprimido e mais como um produto que podemos entregar a outra pessoa.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
