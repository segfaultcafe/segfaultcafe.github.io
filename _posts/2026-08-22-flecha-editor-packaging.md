---
title: "Flecha Dev Log #31: Shipping the Editor Experience"
date: 2026-08-22
published: true
---

# [](#intro)Introduction

Hi folks!

Syntax highlighting often begins as a small grammar checked into the repository. That is enough for its author, who knows where it lives and how to wire it into an editor.

It is not enough for somebody who downloaded a compiler archive and wants `.fl` files to look like Flecha files.

We turned editor support into versioned, tested release artifacts for Visual Studio Code and Neovim.

# [](#a-real-vsix)A real VSIX

Visual Studio Code support is packaged as `flecha-language-VERSION.vsix`. It can be checksum-verified and installed directly:

```sh
sha256sum -c SHA256SUMS --ignore-missing
code --install-extension flecha-language-VERSION.vsix
```

The extension supplies file detection, syntax highlighting, comments, brackets, and indentation. Its stable identity is `flecha.flecha-language`, so installing a newer VSIX upgrades the same extension instead of creating a sibling.

The packaging command uses a locked Node dependency graph and a pinned official VSIX builder. It validates the extension identity and version, checks the installation manifest and grammar, and ensures development-only files do not leak into the archive.

The release workflow also checks that the extension version matches the release tag. A Flecha archive and its editor package should tell the same version story.

# [](#neovim-as-a-native-package)Neovim as a native package

Neovim support ships inside the compiler archive at `share/flecha/editors/neovim`. Copying it into a normal `pack/*/start` directory makes it load as a native package:

```sh
mkdir -p ~/.local/share/nvim/site/pack/flecha/start
cp -R /path/to/flecha/share/flecha/editors/neovim \
  ~/.local/share/nvim/site/pack/flecha/start/flecha.nvim
```

Open a `.fl` file and `:set filetype?` should report `flecha`. Filetype detection, syntax groups, buffer settings, and indentation are exercised headlessly in tests.

For a development checkout, a symbolic link points Neovim directly at the grammar. For a release, copying the packaged directory keeps the installation tied to that toolchain version.

# [](#highlighting-must-follow-the-language)Highlighting must follow the language

New syntax is not finished when only the compiler recognizes it.

Generic parameters, enum declarations, `match` arms, ownership annotations, imports, and borrowed-result contracts all need editor grammar updates. Otherwise valid code looks broken precisely when users are trying to learn the feature.

Treating editor tests as part of the main suite catches drift between parser syntax and the tools people stare at all day.

# [](#clear-limits)Clear limits

These packages provide syntax and editing basics; they are not a language server. There is no claim of semantic completion, rename, project-wide references, or inline diagnostics.

That distinction matters. A small reliable editor integration is more useful than a package whose description promises intelligence it does not contain.

# [](#conclusion)Conclusion

Editor support became part of the distribution rather than a repository curiosity. Visual Studio Code gets a verified VSIX; Neovim gets a tested runtime package; both travel with install, upgrade, verification, and removal instructions.

A language starts feeling real long before self-hosting. Sometimes it happens the first time a source file opens with the right name, indentation, and colors without a private setup ritual.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
