---
title: "Flecha Dev Log #0: Deciding to Build a Programming Language"
date: 2024-04-03
published: true
---

# [](#intro)Introduction

Hi folks!

For a long time, this blog was where I documented security research, vulnerable machines, exploitation techniques, and the things I learned by taking software apart.

Eventually, a different question started following us around:

**What would we learn if, instead of only taking systems apart, we tried to build one from the language up?**

Not a transpiler that quietly hands the difficult work to another source language. Not a parser that recognizes a few expressions and stops there. We wanted to build a statically typed systems language, follow it all the way to native code, and understand every boundary we crossed.

That decision became Flecha.

This is Dev Log #0 because there was no compiler architecture to describe yet. There was only a direction, a growing list of questions, and a second decision that mattered just as much: we would document the journey while it happened.

Let's jump right into it!

# [](#why-a-language)Why a language?

Building a programming language is an unreasonable amount of work if the only goal is to invent different punctuation.

The interesting part is that a language forces us to connect subjects that are often learned separately:

- parsing and grammar;
- type systems and diagnostics;
- control-flow and data-flow analysis;
- memory layout and ownership;
- ABIs, object files, and linkers;
- runtimes and standard libraries;
- build tools, packages, and editor support.

A syntax decision eventually reaches machine code. A memory rule eventually becomes a diagnostic, a control-flow analysis, a runtime operation, or all three. A feature that looks beautiful in an example may become impossible to explain once it crosses a function boundary.

That was exactly the kind of project we wanted.

# [](#the-direction)The direction

The early description of Flecha was intentionally short:

> A low-level, statically typed language for software that needs predictable execution, explicit control over memory, and direct access to native targets.

We wanted the control associated with C-like languages while reducing accidental undefined behavior and improving types, diagnostics, and tooling.

The goal was not to hide systems programming. Allocation, unsafe access, conversions, control transfer, and cleanup should remain visible enough that a reader can reason about the cost and behavior of nearby code.

At the same time, “explicit” should not become an excuse for ceremony. A simple function should still look simple:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 add(i32 left, i32 right) {
    return left + right;
}

i32 main() {
    answer := add(20, 22);
    return answer;
}</code></pre></div></div>

That small example already contains several intended decisions. Function interfaces are statically typed. Local inference is available when the compiler already knows the answer. Execution is direct. There is no garbage-collected runtime waiting behind the return statement.

# [](#principles-before-features)Principles before features

It is easy to begin a language by collecting features we like from other languages. We tried to begin with constraints instead.

Flecha should provide:

- deterministic execution without a garbage collector;
- predictable data representation and calling conventions;
- explicit unsafe boundaries;
- strong static typing without an academic-looking surface;
- visible conversions between distinct primitive types;
- useful, source-oriented diagnostics;
- native object and executable generation;
- straightforward C interoperability;
- a small enough core that the language might eventually compile itself.

These principles did not answer every syntax question. They did give us a way to evaluate one.

If an operation allocates, can the programmer see where ownership begins? If a conversion loses information, is that decision explicit? If code is unsafe, can a reviewer find the boundary? If the compiler rejects a program, can it explain why at the correct source location?

Those questions became more durable than any first draft of the grammar.

# [](#non-goals-matter-too)Non-goals matter too

A new project can promise everything because nothing has collided yet. We wanted to state what Flecha would not attempt in its first core:

- no classes or implementation inheritance;
- no exception system;
- no implicit garbage-collected runtime;
- no hidden heap allocation as the default answer;
- no generators, coroutines, or asynchronous functions in the first implementation;
- no claim of a stable ABI while the language was still being discovered.

Even sophisticated lifetime analysis was not something we could declare finished before writing the programs it needed to understand.

These were not permanent judgments about what makes a good language. They were scope decisions. A small compiler with honest limits is more useful than a specification that promises ten years of work on its first page.

# [](#choosing-the-tools)Choosing the tools

The first compiler would be written in modern C++.

That choice kept us close to the operating system, exposed memory and ownership decisions inside the compiler itself, and gave us access to the LLVM ecosystem without adding another managed runtime to the toolchain.

LLVM would handle target-specific instruction selection, object emission, and the optimization infrastructure we did not want to reinvent. Flecha would still own its semantics. LLVM should receive a program after names, types, conversions, and language control flow had already been decided.

We also chose `.fl` for source files and `flecha` for the compiler command. The project finally had a name, a file, and a destination:

```text
main.fl → flecha → native program
```

Everything between those arrows still needed to be built.

# [](#why-document-now)Why document now?

Waiting until the language was “done” would have produced cleaner documentation and a worse account of how it was made.

Compiler development is full of decisions that appear obvious after the surrounding architecture exists. We wanted to preserve the questions:

- Why add a separate semantic model?
- Why lower into another IR before LLVM?
- Why represent a string as a view before adding an owner?
- Why keep formatting in a runtime?
- Why is uninitialized different from zero?
- Which memory rules are implemented, and which are still proposals?

So documentation became part of the development loop.

The specification would describe the current direction. Design documents would say whether an idea was implemented, proposed, or unresolved. Tests would preserve behavior. Dev logs would tell the story that a reference manual cannot: what problem appeared, which alternatives mattered, and why one decision unlocked the next.

This also meant allowing ourselves to change our minds publicly. Early syntax could disappear. A simple ownership rule could fail when loops arrived. A convenient feature could turn out to hide a cost we wanted visible.

That is not the documentation going stale. That is the journey being documented honestly.

# [](#the-first-roadmap)The first roadmap

The initial path was deliberately vertical:

```text
characters
  → tokens
  → syntax tree
  → semantic meaning
  → typed lowering
  → LLVM IR
  → native object
  → executable
```

We did not want to design a huge language surface before proving that one small program could cross the entire pipeline.

After that path worked, features could arrive with a demanding definition of “done”: syntax, semantics, lowering, code generation, diagnostics, tests, and documentation would all need to agree.

The first concrete problem was obvious. Before Flecha could understand or compile a program, source code needed a shape inside the compiler.

# [](#conclusion)Conclusion

Flecha began with curiosity more than certainty.

We knew we wanted native code, explicit memory, strong types, visible costs, and useful diagnostics. We also knew the interesting decisions would appear only after those goals met real programs.

Documenting the project from Dev Log #0 gives us a record of that movement—from intention, through implementation, to the awkward cases that force a language to become precise.

There is plenty to build, plenty to break, and definitely plenty to research.

That is where the compiler journey begins: tokens, a parser, and an abstract syntax tree.

I hope you enjoy the journey. As always, don't forget to do your **research!**

<a href="/">Go back</a>
