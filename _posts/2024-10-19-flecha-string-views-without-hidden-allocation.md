---
title: "Flecha Dev Log #7: String Views Without Hidden Allocation"
date: 2024-10-19
published: true
---

# [](#intro)Introduction

Hi folks!

Until this point, Flecha's native programs could calculate values and return an exit code. That was enough to prove the pipeline, but not enough to make programs pleasant.

We wanted text. More specifically, we wanted the simplest useful text representation first: an immutable view over bytes.

`stringv` provides that representation, together with string literals, content comparisons, and editor syntax support.

# [](#a-view-not-an-owner)A view, not an owner

A `stringv` contains two pieces of information:

```text
address of immutable bytes + byte length
```

It does not allocate and it does not own the bytes. A literal points at static storage embedded in the generated program:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">stringv Identity(stringv value) {
    return value;
}

i32 main() {
    message := Identity("Flecha");
    return 0;
}</code></pre></div></div>

The literal's length is explicit. It does not depend on scanning for a terminating null byte. That makes embedded zero bytes representable and lets operations work on an exact range.

Choosing a view first also kept allocation out of basic text usage. Passing a literal into a function is copying a small pair, not allocating a new buffer.

# [](#the-target-decides-the-layout)The target decides the layout

In LLVM, `stringv` became a structure containing a pointer and an integer length. The length uses the target's pointer width.

That reused a decision from native code generation: the module's data layout must be installed before types such as `usize` or `stringv` are constructed.

String literals become immutable global data. The generated view points at the first byte and stores the literal's byte count. Functions can accept and return that value using the ordinary type pipeline.

No C++ string object crosses into generated code. No compiler implementation type leaks into the language ABI.

# [](#equality-means-content)Equality means content

Two string views are equal when their lengths and bytes are equal—not when their pointers happen to match.

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">bool Equal(stringv left, stringv right) {
    return left == right;
}

i32 main() {
    message := Identity("Flecha");

    if Equal(message, "Flecha") and
       message != "Arrow" and
       "" == "" {
        return 42;
    }

    return 0;
}</code></pre></div></div>

The empty-string case was worth testing explicitly. A zero-length view must compare correctly without requiring a valid element access or depending on a particular pointer identity.

The backend special-cased string-view equality because the operation is semantic, not a single integer comparison. Flecha still exposes it through the familiar `==` and `!=` operators.

# [](#what-we-deliberately-did-not-add)What we deliberately did not add

`stringv` was not a growable string, an owning allocation, or a Unicode abstraction.

The first text model counted bytes, and `char` remained an eight-bit value. Unicode decoding and code-point iteration belonged in a future text library. Keeping those concerns separate prevented the storage representation from pretending it had Unicode semantics it did not implement.

Ownership remains separate. A view can refer to static data or storage managed elsewhere, but it cannot keep dynamic storage alive.

# [](#the-language-should-look-like-a-language)The language should look like a language

This milestone also added Flecha syntax support for Neovim: type names, modifiers, control-flow keywords, operators, labels, numbers, strings, characters, comments, and function-like names.

Compiler correctness comes first, but editor support changes how a language feels. A new syntax becomes easier to scan, examples become easier to review, and mistakes become visible before the compiler runs.

The editor rules received their own fixture and syntax test. Highlighting was treated as maintained tooling rather than a pasted collection of regular expressions.

# [](#conclusion)Conclusion

`stringv` gave Flecha useful text without hidden allocation. It also forced us to settle a concrete representation: pointer plus length, target-sized, immutable, and byte-oriented.

The result is useful text without hidden allocation, while output and other platform services remain cleanly separated from the LLVM backend through the runtime boundary.

<a href="/">Go back</a>
