---
title: "Flecha Dev Log #31: Distribuindo a Experiência do Editor"
date: 2026-08-22
published: true
lang: pt-BR
translation_key: "flecha-editor-packaging"
original_url: /flecha-editor-packaging
permalink: /pt-br/flecha-editor-packaging
---
# [](#intro)Introdução

Olá, pessoal!

O realce de sintaxe muitas vezes começa como uma pequena gramática verificada no repositório. Isso é suficiente para o seu autor, quem sabe onde vive e como transferi-lo para um editor.

Não é suficiente para alguém que baixou um arquivo compilador e quer arquivos `.fl` para se parecer com arquivos Flecha.

Transformamos o suporte do editor em artefatos de lançamento versionados e testados para Visual Studio Code e Neovim.

# [](#a-real-vsix)Um VSIX de verdade

O suporte ao Visual Studio Code é empacotado como `flecha-language-VERSION.vsix`. Pode ser verificado e instalado diretamente:

```sh
sha256sum -c SHA256SUMS --ignore-missing
code --install-extension flecha-language-VERSION.vsix
```
A extensão fornece detecção de arquivos, realce de sintaxe, comentários, parênteses e indentação. Sua identidade estável é `flecha.flecha-language`, então instalar um VSIX mais novo atualiza a mesma extensão em vez de criar um irmão.

O comando de embalagem usa um gráfico de dependência de nós bloqueado e um construtor oficial de VSIX. Ele valida a identidade e versão da extensão, verifica o manifesto de instalação e a gramática, e garante que os arquivos somente de desenvolvimento não vazem para o arquivo.

O fluxo de trabalho de lançamento também verifica se a versão de extensão corresponde à tag de lançamento. Um arquivo Flecha e seu pacote editor devem contar a mesma versão.

# [](#neovim-as-a-native-package)Neovim como um pacote nativo

O Neovim suporta naves dentro do arquivo do compilador no `share/flecha/editors/neovim`. Copiando-o em um diretório normal `pack/*/start` faz com que ele carregue como um pacote nativo:

```sh
mkdir -p ~/.local/share/nvim/site/pack/flecha/start
cp -R /path/to/flecha/share/flecha/editors/neovim \
  ~/.local/share/nvim/site/pack/flecha/start/flecha.nvim
```
Abra um arquivo `.fl` e `:set filetype?` deve relatar `flecha`. Detecção de tipo de arquivo, grupos de sintaxe, configurações de buffer e indentação são exercitados sem cabeça em testes.

Para um checkout de desenvolvimento, um link simbólico aponta Neovim diretamente na gramática. Para uma versão, copiar o diretório embalado mantém a instalação ligada a essa versão da ferramenta.

# [](#highlighting-must-follow-the-language) Highlighting deve seguir o idioma

A nova sintaxe não é terminada quando apenas o compilador a reconhece.

Parâmetros genéricos, declarações de enum, armas `match`, anotações de propriedade, importações e contratos de resultado emprestado precisam de atualizações gramaticais do editor. Caso contrário, código válido parece quebrado precisamente quando os usuários estão tentando aprender o recurso.

Tratar testes de editor como parte da suíte principal captura deriva entre a sintaxe do analisador e as ferramentas que as pessoas olham o dia todo.

# [](#clear-limits)Limites de limpeza

Estes pacotes fornecem sintaxe e edição básica; eles não são um servidor de idioma. Não há reivindicação de conclusão semântica, renomeação, referências de projeto ou diagnósticos em linha.

Essa distinção importa. Uma pequena integração confiável do editor é mais útil do que um pacote cuja descrição promete inteligência que não contém.

# [](#conclusion)Conclusão

O suporte ao editor tornou-se parte da distribuição em vez de uma curiosidade de repositório. Visual Studio Code recebe um VSIX verificado; Neovim recebe um pacote de execução testado; ambos viajam com instruções de instalação, atualização, verificação e remoção.

Uma língua começa a sentir-se muito antes de se auto-anfitrião. Às vezes acontece a primeira vez que um arquivo fonte abre com o nome certo, indentação e cores sem um ritual de configuração privado.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
