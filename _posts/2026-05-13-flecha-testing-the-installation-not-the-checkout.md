---
title: "Flecha Dev Log #28: Testing the Installation, Not the Checkout"
date: 2026-05-13
published: true
---

# [](#intro)Introduction

Hi folks!

A compiler passing tests inside its own repository proves less than it first appears. The checkout contains source files, build metadata, generated artifacts, and paths that an installed user will never have.

A release can be green in CI and still fail the moment somebody unpacks it elsewhere.

Flecha's release tests now treat the archive as a downstream user would: install it cleanly, move it, and build programs using only what the distribution promises.

# [](#the-archive-is-the-product)The archive is the product

The important artifact is not the build directory. It is the archive containing `flecha`, Longbow, the runtime library, the standard library, editor support, licenses, and documentation in their installed layout.

The smoke test unpacks that archive into a clean location and deliberately relocates it before running anything. If a binary accidentally remembers an absolute build path, relocation exposes the mistake immediately.

The installed compiler must find its matching runtime relative to itself. Longbow must find the bundled standard library without a source-tree hint. A project must compile and link without reaching back into the original checkout.

# [](#consume-it-like-a-user)Consume it like a user

The clean environment asks the same questions a new installation will:

```sh
flecha --version
longbow --version
longbow check
longbow build
longbow run
```

It also compiles direct single-file programs, exercises native output, checks local project dependencies, and verifies the packaged files themselves.

This is an inversion worth emphasizing. Instead of testing internal targets and assuming packaging preserves them, the test begins with the package and sees whether public workflows survive.

# [](#host-tools-are-explicit)Host tools are explicit

The archive carries the LLVM runtime it needs, so users do not need LLVM development headers merely to run Flecha. Producing a native executable still needs a host linker driver and platform startup files or SDK.

Clean-install jobs provide only those documented prerequisites. If the archive works only because a full development environment happened to be preinstalled, the test should fail.

Object emission and frontend checking remain useful distinctions: `flecha check` and `--emit-object` do not invoke the system linker, while an executable build does.

# [](#every-platform-is-a-consumer)Every platform is a consumer

Linux, Windows under MSYS2 UCRT64, macOS x86-64, and macOS arm64 each run the archive as a fresh consumer.

That is not one generic packaging test repeated four times. Paths, dynamic libraries, executable suffixes, native drivers, SDK discovery, archive formats, and shell behavior differ. The common contract is that an installation contains everything Flecha owns and clearly reports anything the host must supply.

# [](#release-engineering-is-language-work)Release engineering is language work

Modules, the runtime ABI, the standard library, native linking, and Longbow all meet inside the installed directory tree. A broken relative path can make a correct language feature unusable.

Testing the public installation therefore protects architecture, not just packaging. It forces compiler and tooling components to agree on what the distribution boundary actually is.

# [](#conclusion)Conclusion

The strongest release test starts by forgetting how the repository was built.

By consuming a relocated archive in a clean environment, Flecha verifies the experience we are actually offering: unpack the toolchain, create or open a project, and build native code with documented host prerequisites.

That makes a release feel less like a compressed build directory and more like a product we can hand to someone else.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
