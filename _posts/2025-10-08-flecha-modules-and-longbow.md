---
title: "Flecha Dev Log #21: Modules, Imports, and Longbow"
date: 2025-10-08
published: true
---

# [](#intro)Introduction

Hi folks!

A compiler can understand increasingly interesting programs and still leave us with one very limiting question: what happens when the program no longer fits in one file?

Flecha needed a project model. Not only a way to locate files, but a precise answer for names, visibility, dependencies, cycles, and the command that turns a directory into a program.

That work produced modules, explicit imports, and Longbow, Flecha's project tool.

# [](#one-file-one-module)One file, one module

A Flecha source file may declare the module it represents:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">module factorial;

export i32 calculate(i32 value) {
    if value &lt;= 1 {
        return 1;
    }
    return value * calculate(value - 1);
}</code></pre></div></div>

The module name must match the file stem. `factorial.fl` is `factorial`; the declaration is not a second, unrelated name that can drift away from the filesystem.

That small restriction removes ambiguity. A path identifies a file, the file identifies one module, and the compiler can give useful errors when those facts disagree.

# [](#imports-are-namespaces)Imports are namespaces

Imports live in a visible block near the top of the file:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">module main;

@imports
    :: root::math::factorial
    :: root::parser::tokens as parser_tokens
    :: lib::std::io::filesystem;

void main() {
    stdoutln(factorial::calculate(5));
}</code></pre></div></div>

An import does not inject every declaration into the current scope. It introduces a namespace, and use sites remain qualified. That costs a few characters and buys us something much more important: when we read `factorial::calculate`, we know where the name came from.

`root::` starts at the project's source root. `lib::name::` starts at a configured library root. Aliases solve the occasional collision without changing the original module. Directory imports and grouped imports are available too, but they keep the same rule: imported code remains visibly namespaced.

Top-level declarations are private unless marked `export`. Importing a file therefore does not accidentally publish all of its implementation details.

# [](#the-graph-is-the-program)The graph is the program

The entry file is only the beginning. Flecha follows its imports, validates each module, and compiles the reachable graph together.

Canonical paths ensure one source file is loaded once even when it is reached through different routes. Missing modules, path escapes, declaration mismatches, import cycles, and excessive import depth stop compilation with diagnostics instead of creating mysterious linker behavior later.

This is especially important for generational compiler work: name resolution must see one stable graph before semantic analysis starts making promises about types and ownership.

# [](#longbow)Longbow gives the graph a home

Typing compiler flags by hand is useful while bringing up a compiler. It is not how we want to live inside a project.

Longbow reads a `longbow.toml`, supplies the source root and library mappings, and owns the output directory. A new executable project becomes:

```sh
longbow new arrows
cd arrows
longbow check
longbow run
```

`check` runs the complete frontend without producing an executable. `build` creates the program. `run` builds and executes it, while arguments after `--` go to the program. `clean` removes Longbow's generated output.

Library projects use the same layout, and local path dependencies make another Flecha project available through a `lib::` import. Longbow also searches parent directories for the manifest, so commands work naturally from inside `src`.

# [](#why-this-feels-bigger)Why this feels bigger than file loading

Modules made it possible to write the standard library in Flecha itself. Project configuration made libraries reproducible. Explicit visibility made APIs deliberate. One import graph now feeds semantic analysis, ownership checking, lowering, and native code generation as a single program.

This is one of those milestones that looks like tooling from the outside but changes the scale of every language feature inside. Flecha stopped being only a compiler that accepts a source file. It became a toolchain that understands a project.

# [](#conclusion)Conclusion

The main decision was to keep the model unsurprising: the filesystem names modules, imports introduce namespaces, exports define the boundary, and Longbow records how the pieces fit together.

There is very little magic in that description, and that is exactly why it works.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
