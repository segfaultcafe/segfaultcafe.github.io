---
title: "Flecha Dev Log #9: From String Views to Owned Strings"
date: 2024-12-27
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha had an immutable `stringv`: a pointer and a byte length that could refer to static or externally owned text without allocating.

Views are wonderful until we need to create new text.

`stringv` provides useful checked operations, while `string` is an immutable value that owns its allocation.

Together, they forced us to separate text, storage, and ownership clearly.

# [](#safe-operations-on-a-view)Safe operations on a view

The first view operations were intentionally small:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    text := "flecha";

    stdoutln(text.len());
    stdoutln(text.at(0));
    stdoutln(text[5]);
    stdoutln(text.substr(1, 3));

    return 0;
}</code></pre></div></div>

`len()` returns the byte length. `at(index)` and indexing return a checked byte-sized `char`. `substr(start, count)` creates another allocation-free view.

Bounds were not disabled simply because Flecha is a systems language. Invalid dynamic indices and ranges call the runtime, print a diagnostic, and terminate instead of performing an out-of-bounds access.

The substring check uses the equivalent of `count <= length - start` after verifying `start <= length`. That avoids overflowing `start + count` during the check itself. Even error paths need arithmetic rules.

# [](#an-owner-has-a-different-contract)An owner has a different contract

An owning `string` stores a data pointer, byte length, and capacity. The allocation is null-terminated for interoperability, but the explicit length remains authoritative. Embedded null bytes are valid.

A literal is still a `stringv`. Assigning one to `string` creates an owning copy:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">string greeting = "hello";
string copied = greeting;
string message = greeting + ", Flecha";
</code></pre></div></div>

String contents are immutable. Concatenation creates a new owner rather than modifying an operand in place.

That gave values predictable behavior while leaving room for implementation optimizations later.

# [](#conversions-show-the-cost)Conversions show the cost

Converting a view into an owner allocates and copies. Converting an owner into a view does neither:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">stringv view = "flecha";

string owned = view.string();
string same = view.cast&lt;string&gt;;

stringv borrowed = owned.view();
stringv sameView = owned.cast&lt;stringv&gt;;</code></pre></div></div>

The named methods are preferred in ordinary source because `string()` makes ownership creation conspicuous and `view()` communicates non-owning access. Generic conversion code can use the symmetrical cast forms.

We were beginning to build a vocabulary where cost and ownership are visible in the program, not buried in a runtime convention.

# [](#the-first-value-semantics)The first value semantics

The initial implementation chose predictable copy semantics:

- initializing or assigning from an owning string creates an independent value;
- replacing a destination destroys its previous allocation only after the replacement succeeds;
- an owning parameter receives an owned value;
- returning an owner transfers the result to the caller;
- a view never destroys storage.

Every owned local is destroyed exactly once on normal fallthrough and on control-flow exits through `return`, `break`, `proceed`, and `jumpto`.

That last line made code generation much more interesting. Cleanup was no longer something we could append to the end of a function. Every edge leaving a value's lexical lifetime had to perform the appropriate destruction.

Move semantics could later remove unnecessary copies, but only if observable behavior stayed coherent. We chose a clear model first and optimization second.

# [](#lifetime-rules-arrive-early)Lifetime rules arrive early

A view into an owning string cannot outlive that owner. The compiler conservatively rejected a local owning string's view escaping its scope.

Static literals were different: their bytes live for the program's duration. Views arriving through parameters also have storage controlled by the caller's context.

We did not yet have a general borrow system, so the safe decision was to reject cases the compiler could not prove. That is a recurring Flecha rule: incomplete analysis should narrow accepted programs, not quietly widen unsafe behavior.

# [](#an-api-style-emerges)An API style emerges

This work also documented a naming convention for built-in and library APIs:

- member functions use `camelCase`, such as `startsWith()`;
- free functions use `snake_case`, such as `read_line()`;
- single-word names such as `len`, `at`, and `stdoutln` stay simple.

Runtime C symbols keep their ABI-specific `flecha_runtime_v1_` prefix. Implementation naming and idiomatic Flecha naming are separate concerns.

# [](#conclusion)Conclusion

The two string types have complementary jobs. `stringv` provides cheap, checked observation. `string` provides ownership, concatenation, copying, returning, and deterministic cleanup.

The distinction keeps storage cost visible: views observe bytes, while owners are responsible for keeping and releasing them.

<a href="/">Go back</a>
