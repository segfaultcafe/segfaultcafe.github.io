---
title: "Flecha Dev Log #30: Definindo uma Toolchain Suportada"
date: 2026-07-09
published: true
lang: pt-BR
translation_key: "flecha-supported-toolchains"
original_url: /flecha-supported-toolchains
permalink: /pt-br/flecha-supported-toolchains
---
# [](#intro)Introdução

Olá, pessoal!

"Requer LLVM" soa como documentação até que o compilador constrói com uma versão, CI usa outra, e uma liberação silenciosamente capta o que um gerenciador de pacotes de rolamento instalado naquela manhã.

O suporte precisa de uma definição que o sistema de compilação possa impor.

Flecha agora tem uma política de ferramenta que conecta configuração local, integração contínua, produção de lançamento e verificação de instalação limpa.

# [](#ranges-for-source-builds)Ranges for source builds

Compilações de código-fonte aceitam intervalos explícitos de versões:

- CMake 3.20 ou mais recente;
- Pacotes de desenvolvimento LLVM de 17 a 23;
- Clang de 17 a 23;
- CCG de 13 a 16;
- Apple Clang de 16 a 17;
- um compilador C e C++ da mesma cadeia de ferramentas com suporte C++23.

O CMake detecta essas versões antes da compilação e rejeita combinações não suportadas ou incompletas. Quando o LLVM é instalado fora do caminho de pesquisa padrão, `LLVM_DIR` aponta em seu diretório de pacotes CMake.

Falhar na configuração é muito mais gentil do que atingir centenas de erros de compilador causados por uma API LLVM incompatível.

# [](#pinned-release-baselines) Valores basais de libertação fixados

Os intervalos são apropriados para os contribuintes. Os artefactos de libertação precisam de bases mais apertadas.

Linux x86-64 é produzido no Ubuntu 24.04 com Clang e LLVM 18. Windows x86-64 usa o ambiente MSYS2 UCRT64 com Clang e LLVM 23. macOS x86-64 e arm64 usam macOS 15, Homebrew Clang e LLVM 18 para a construção, e Xcode 16.4 com Apple Clang 17 para ligação nativa.

Cada trabalho de lançamento imprime e verifica as versões do compilador, LLVM, linker, target, plataforma runtime e SDK. Uma atualização do gerenciador de pacotes não pode alterar silenciosamente o compilador que produziu a versão.

# [](#builders-and-users-need-different-things)Builders e usuários precisam de coisas diferentes

Construir Flecha da fonte requer arquivos de desenvolvimento LLVM. Executando um arquivo de lançamento Flecha não: o arquivo carrega seu correspondente tempo de execução compartilhado LLVM.

Usuários que constroem executáveis nativos ainda precisam do driver do linker do host e desenvolvimento de sistema ou componentes SDK. Essa distinção é agora explícita em ambos os testes de documentação e instalação limpa.

Ele evita dois erros opostos: dizer aos usuários para instalar uma pilha inteira de desenvolvimento do compilador que eles não precisam, ou sugerir links nativos podem funcionar sem as peças da plataforma que só o sistema operacional pode fornecer.

# [](#policy-lives-in-code)Política vive em código

Os intervalos suportados não são copiados em prosa para um README e esquecidos. Política do CMake, matrizes de CI, fluxos de trabalho de lançamento e mudança de documentação juntos.

Adicionar um compilador ou LLVM maior significa exercer a suíte completa: testes regulares, higienizadores, embalagens, layouts instalados, consumidores limpos e saída nativa específica da plataforma. “Ele configurou na minha máquina” é uma evidência útil, mas não é a barra de suporte.

# [](#why-this-is-architectural)Por que isso é arquitetônico

A infraestrutura de Flecha usa o LLVM, seu driver invoca ferramentas nativas de plataforma e seus pacotes de lançamento devem ser relocatáveis. A matriz de versão é onde esses três sistemas concordam.

Escrevendo-o forçado suposições ocultas para o aberto: quais APIs LLVM nós confiamos, em que nível de linguagem C++ o compilador usa, que Windows runtime que nós direcionamos, e que macOS SDK produziu um arquivo compatível.

# [](#conclusion)Conclusão

Uma cadeia de ferramentas suportada é um contrato testado, não uma lista otimista de nomes de software.

Flecha agora rejeita combinações não suportadas precocemente, fixa os ambientes que criam lançamentos, verifica o que realmente foi executado e separa os requisitos do construtor de fontes dos requisitos do usuário de arquivos.

Não é a característica mais brilhante do compilador, mas é uma das coisas que torna cada outra característica reprodutível.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
