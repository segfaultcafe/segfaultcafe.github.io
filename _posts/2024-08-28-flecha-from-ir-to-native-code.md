---
title: "Flecha Dev Log #5: From LLVM IR to a Native Program"
date: 2024-08-28
published: true
---

# [](#intro)Introduction

Hi folks!

Verified LLVM IR is a complete compiler pipeline in one sense, but not yet a complete user experience.

Nobody wants to manually feed an IR file into another command every time they change a program. We wanted this:

```bash
flecha build program.fl -o program
./program
```

Native object emission and executable linking complete that path, while Flecha's unusual `also` control flow gives the whole pipeline a useful semantic test.

# [](#target-details-are-not-optional)Target details are not optional

LLVM IR is typed, but a native target still decides fundamental facts such as pointer width, object format, and calling convention.

The native compiler asks LLVM for the host target triple and creates a `TargetMachine` for it. The target's data layout is attached to the module before IR construction.

That ordering was deliberate. Flecha includes `isize` and `usize`, whose width follows the target pointer width. If the compiler guessed a size based on the machine building Flecha rather than the module's target, those types could silently become wrong.

For this first implementation, the host was the target. Cross-compilation triples, sysroots, optimization levels, and debug information were left for later. Again, the boundary was explicit.

# [](#object-first)Object first, executable second

Native compilation was split into two operations.

First, LLVM's code-emission pipeline writes a relocatable object:

```bash
flecha --emit-object program.fl -o program.o
```

Second, Flecha invokes the system C compiler driver to link that object:

```bash
flecha build program.fl -o program
```

Using the compiler driver instead of calling the linker directly gives us the platform's startup objects and standard executable conventions. The command is launched without a shell, avoiding another layer of quoting and command interpretation.

The intermediate object remains beside the executable as `<output>.o`. That made early debugging much easier: when linking failed, we could inspect whether object emission had still succeeded.

# [](#also-as-a-real-test)Using `also` as a real test

Producing an executable is only useful if its control flow still means what the source says. Flecha's `also` clause gave us an excellent end-to-end test:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    value := 0;

    if false {
        value = 100;
    } also true {
        value = 99;
    } else if true {
        value = 40;
    } also value == 40 {
        value = value + 2;
    } else {
        value = 1;
    }

    return value;
}</code></pre></div></div>

The first `also` does not run because its owning `if` did not run. The second does run because its `else if` branch was selected. The native process exits with `42`.

This behavior had already been normalized in the bound IR. The native backend did not need a custom `also` instruction. That was the earlier architecture paying rent.

# [](#the-first-real-executable)The first real executable

The new `make native-poc` target compiled a Flecha example, verified that both the object and executable existed, ran the executable, and checked its exit status.

That test crossed several independently fallible boundaries:

- Flecha frontend validation;
- typed lowering;
- LLVM IR construction and verification;
- target-specific object emission;
- system linking;
- operating-system process execution.

A unit test for an AST node cannot prove any of that. We needed both kinds of tests: small tests that locate failures and an end-to-end proof that the layers still compose.

# [](#conclusion)Conclusion

This milestone turned Flecha from a compiler experiment into a language that could produce a normal native executable.

It also forced an important separation: code generation creates target-specific objects; linking assembles complete programs. Later, when a runtime library entered the picture, that distinction would let object-only compilation remain independent while executable builds gained automatic runtime linkage.

It also confirms an architectural separation that remains useful: code generation creates target-specific objects, while linking assembles complete programs.

<a href="/">Go back</a>
