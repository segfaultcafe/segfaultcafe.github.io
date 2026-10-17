---
title: "Flecha Dev Log #33: A Complete Development Environment"
date: 2026-10-11
published: true
---

# [](#intro)Introduction

Hi folks!

A compiler rarely lives alone. A real session also needs the standard library, project tool, linker, editor support, and a place where all those pieces agree about paths and versions.

When that agreement depends on the original repository or one developer's shell configuration, we do not have an environment. We have a collection of local coincidences.

Flecha now discovers its installed pieces as one toolchain and can reproduce the entire setup inside a disposable development sandbox.

# [](#the-installed-standard-library)The installed standard library

Longbow projects can import the bundled standard library without manually mapping its source directory:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">module main;

@imports
    :: lib::std::io::filesystem;

i32 main() {
    contents, err := filesystem::read_file("message.txt");
    if err != none {
        return 1;
    }

    stdoutln(contents);
    return 0;
}</code></pre></div></div>

The installed Longbow executable locates its version-matched `lib::std` relative to the toolchain layout. Moving a complete installation keeps the relationship intact because discovery does not point back to the checkout that produced it.

Explicit project libraries still use configured names. Automatic discovery is reserved for the standard library shipped with the same toolchain, where a predictable default removes setup without hiding dependency resolution.

# [](#destructuring-that-fits-real-apis)Destructuring that fits real APIs

As standard APIs returned more tuples, bindings needed to handle the common case where one result is new and another already exists:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">quotient, err := divide(20, 3);
next, err := divide(42, 5);

i32 first, second = (20, 22);
first, i32 third = (second, 42);</code></pre></div></div>

With `:=`, at least one non-blank name must be new in the current scope. New names are declared and existing names in that scope are assigned. With `=`, an explicit type introduces a declaration while an untyped name refers to an existing destination.

The entire right-hand side evaluates once before any store occurs. That preserves swaps, lets old values participate in the expression, and prevents one destination from changing what a later destination receives.

This looks like a syntax improvement, but it plugs directly into definite assignment, cleanup, and borrow checking. Each new or existing binding must leave those analyses with one unambiguous state.

# [](#the-sandbox)The sandbox

The Docker development sandbox builds the current checkout and installs the result into a clean Linux environment:

```sh
make sandbox
make enter-sandbox
```

Inside it, `flecha` and `longbow` are on `PATH`, the installed standard library is discovered automatically, Clang 18 is available for native linking, and a starter project waits in `/workspace/hello`:

```sh
cd /workspace/hello
longbow check
longbow run
nvim src/main.fl
```

The shell runs as an unprivileged `flecha` user. The repository is mounted read-only, so the environment can inspect current sources without quietly changing the host checkout.

# [](#editor-configuration-without-host-pollution)Editor configuration without host pollution

When a host Neovim configuration exists, the sandbox copies it into the disposable container. Plugin managers may update lockfiles, caches, and downloaded plugins there without touching the host.

If no configuration exists, a minimal one enables Flecha file detection and syntax highlighting. The installed Neovim plugin and the current compiler therefore meet in the same isolated session.

Rebuilding the sandbox replaces the container. Anything important must be copied out, which is a useful reminder that the environment is reproducible by design, not precious state to maintain forever.

# [](#one-command-tests-many-contracts)One command tests many contracts

`make sandbox` exercises more than Docker packaging. It checks that installation paths are relocatable, Longbow finds the standard library, native linking prerequisites are sufficient, editor files are installable, permissions are reasonable, and a fresh user can build a real project.

That is the value of bringing the pieces together: the environment tests the boundaries between components, where otherwise-correct tools most often disagree.

# [](#conclusion)Conclusion

Flecha's development environment now has a coherent shape. The toolchain finds its own standard library, tuple results fit natural binding patterns, and one disposable sandbox brings compiler, Longbow, linker, editor support, and a starter project together.

The result is a wonderfully practical milestone: enter the environment and write Flecha. The setup itself no longer needs to be the experiment.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
