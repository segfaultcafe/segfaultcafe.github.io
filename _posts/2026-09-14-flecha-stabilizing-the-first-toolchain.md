---
title: "Flecha Dev Log #32: Stabilizing the First Toolchain"
date: 2026-09-14
published: true
---

# [](#intro)Introduction

Hi folks!

There is a point in a young language where adding another feature is easier than reconciling everything already built.

We chose reconciliation.

Flecha 0.1.1 is a stabilization release: compiler crashes and misleading diagnostics were fixed, packages were tested as installations, toolchains were pinned, editor artifacts were added, and the documentation was brought back into agreement with the implementation.

# [](#stability-is-a-feature)Stability is a feature

A compiler should reject an invalid program with a useful source range. It should not crash because an unexpected type survived too far into lowering. It should not emit an object after a mandatory ownership check failed. It should not vary its answer because one code path forgot the rule another code path enforces.

The stabilization pass concentrated on those seams: parser recovery, semantic diagnostics, native-driver failures, installed-path discovery, portability, and release packaging.

This work is less visible than new syntax, but it changes how confidently we can use every existing feature.

# [](#documentation-is-tested-behavior)Documentation is tested behavior

Early project documents naturally contain plans mixed with implementation. Over time, that becomes dangerous. A reader cannot tell whether a paragraph describes code they can run or an idea we still like.

The 0.1.1 documentation distinguishes shipped behavior from proposals. Compiler commands, LLVM support, linking requirements, checked references, slices, allocation analysis, ownership contracts, generics, ABI limits, and cross-platform constraints are described according to the toolchain that exists.

The test suite and documentation now share the same boundaries. When a limitation is real, we say it. When a workflow is promised, a clean installation exercises it.

# [](#one-release-one-revision)One release, one revision

The release condition is deliberately holistic. The full protected matrix must pass from one revision: ordinary tests, sanitizer coverage, packaging, clean installation, editor validation, native output, and platform checks.

That prevents a familiar failure mode where the Linux fix exists on one commit, the Windows package fix on another, and the published tag corresponds cleanly to neither.

The compiler, Longbow, runtime, standard library, VSIX, Neovim files, documentation, archives, and checksums are treated as one versioned toolchain.

# [](#the-boundary-is-public)The boundary is public

A release archive bundles the LLVM runtime it needs. Native executable builds still rely on a documented host linker and SDK. The standard library is found through the installed layout. Editor packages have verifiable versions. Unsupported compiler and LLVM combinations fail during configuration.

These decisions define which problems belong to Flecha and which prerequisites belong to the host. Stability improves when that boundary is explicit enough to test.

# [](#what-stabilization-feels-like)What stabilization feels like

The satisfying outcome is not a spectacular demo. It is repetition without surprise:

```sh
flecha check src/main.fl
longbow build
longbow run
```

The same project survives a clean machine, a relocated archive, and each supported platform. A failure names the missing piece. The docs describe the command we actually shipped.

That is a different kind of progress from growing the syntax. It is the progress of making a tool dependable enough that attention can return to the program being written.

# [](#conclusion)Conclusion

Flecha 0.1.1 gave the first installable toolchain a firmer floor. It aligned diagnostics, packages, supported versions, editor artifacts, and documentation around one tested release.

Building a language is not only inventing semantics. It is also making those semantics arrive intact on another machine.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
