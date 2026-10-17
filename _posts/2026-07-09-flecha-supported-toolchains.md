---
title: "Flecha Dev Log #30: Defining a Supported Toolchain"
date: 2026-07-09
published: true
---

# [](#intro)Introduction

Hi folks!

“Requires LLVM” sounds like documentation until the compiler builds with one version, CI uses another, and a release silently picks up whatever a rolling package manager installed that morning.

Support needs a definition that the build system can enforce.

Flecha now has one toolchain policy connecting local configuration, continuous integration, release production, and clean-install verification.

# [](#ranges-for-source-builds)Ranges for source builds

Source builds accept explicit version ranges:

- CMake 3.20 or newer;
- LLVM development packages from 17 through 23;
- Clang from 17 through 23;
- GCC from 13 through 16;
- Apple Clang from 16 through 17;
- a C and C++ compiler from the same toolchain with C++23 support.

CMake detects these versions before compilation and rejects unsupported or incomplete combinations. When LLVM is installed outside the default search path, `LLVM_DIR` points at its CMake package directory.

Failing at configuration is much kinder than reaching hundreds of compiler errors caused by an incompatible LLVM API.

# [](#pinned-release-baselines)Pinned release baselines

Ranges are appropriate for contributors. Release artifacts need tighter baselines.

Linux x86-64 is produced on Ubuntu 24.04 with Clang and LLVM 18. Windows x86-64 uses the MSYS2 UCRT64 environment with Clang and LLVM 23. macOS x86-64 and arm64 use macOS 15, Homebrew Clang and LLVM 18 for the build, and Xcode 16.4 with Apple Clang 17 for native linking.

Each release job prints and verifies the compiler, LLVM, linker, target, platform runtime, and SDK versions. A package-manager update cannot quietly change the compiler that produced the release.

# [](#builders-and-users-need-different-things)Builders and users need different things

Building Flecha from source requires LLVM development files. Running a Flecha release archive does not: the archive carries its matching LLVM shared runtime.

Users who build native executables still need the host's linker driver and system development or SDK components. That distinction is now explicit in both documentation and clean-install tests.

It avoids two opposite mistakes: telling users to install an entire compiler-development stack they do not need, or suggesting native linking can work without the platform pieces only the operating system can provide.

# [](#policy-lives-in-code)Policy lives in code

The supported ranges are not prose copied into a README and forgotten. CMake policy, CI matrices, release workflows, and documentation change together.

Adding a compiler or LLVM major means exercising the full suite: regular tests, sanitizers, packaging, installed layouts, clean consumers, and platform-specific native output. “It configured on my machine” is useful evidence, but it is not the support bar.

# [](#why-this-is-architectural)Why this is architectural

Flecha's backend uses LLVM, its driver invokes platform-native tools, and its release packages must be relocatable. The version matrix is where those three systems agree.

Writing it down forced hidden assumptions into the open: which LLVM APIs we rely on, which C++ language level the compiler uses, which Windows runtime we target, and which macOS SDK produced a compatible archive.

# [](#conclusion)Conclusion

A supported toolchain is a tested contract, not an optimistic list of software names.

Flecha now rejects unsupported combinations early, pins the environments that create releases, verifies what actually ran, and separates source-builder requirements from archive-user requirements.

It is not the flashiest compiler feature, but it is one of the things that makes every other feature reproducible.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
