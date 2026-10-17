---
title: "Flecha Dev Log #3: Building the Boundary Before the Backend"
date: 2024-06-23
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha could now parse a file and determine what its names and expressions meant. The obvious next move was to start generating machine code directly from the AST.

We decided not to.

That extra step is one of the most important architectural decisions in the compiler: a typed, bound intermediate representation between semantic analysis and code generation.

Why add another tree when we already had one? Because the AST answers, “what did the programmer write?” The backend needs, “what operation must the machine perform?”

# [](#syntax-is-not-a-backend-contract)Syntax is not a backend contract

Take a simple program:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 add(i32 left, i32 right) {
    return left + right;
}

i32 main() {
    answer := add(20, 22);
    return answer;
}</code></pre></div></div>

In the AST, `answer` is a name expression and `add` is another name expression followed by call syntax. The backend should not perform scope lookup or infer the result type again.

The lowerer converts valid syntax into a `BoundProgram`. In that program:

- every expression has a resolved semantic type;
- every name points directly to its symbol;
- every call points directly to its function symbol;
- every node retains its source range;
- frontend errors prevent lowering altogether.

The resulting representation can say something close to:

```text
function add(i32 left, i32 right) -> i32
function main() -> i32
  local answer: i32 = (call add 20:i32 22:i32)
  return load answer
```

This dump is not Flecha syntax and is not a serialization format. It is a deterministic window into what the compiler believes the program means.

# [](#lowering-removes-choices)Lowering removes choices

Source languages often provide multiple ways to express related control flow. Backends are easier to verify when they receive fewer shapes.

Flecha had `if`, `else if`, `else`, and an experimental `also` clause. Instead of teaching every future backend all four surface forms, the lowerer normalized them.

`else if` becomes an `if` nested inside the previous alternative block. An `also` clause becomes a conditional appended to the successful body of its owner.

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">if ready {
    result = 40;
} also result == 40 {
    result = result + 2;
} else {
    result = 0;
}</code></pre></div></div>

The important rule is that `also` runs only if its owning branch ran. Lowering preserves that rule using ordinary nested conditionals. The backend does not need a special theory of `also`.

This gave us a useful principle:

> Surface syntax can be expressive. The IR should be explicit.

# [](#a-clean-failure-boundary)A clean failure boundary

The lowerer accepts the AST, semantic model, and diagnostic bag. If the frontend has errors, it produces no bound program.

That decision sounds strict, but it keeps later stages honest. Code generation never receives an unknown name with an “error” type and tries to make something out of it. The frontend owns source recovery. The backend owns valid, bound programs.

Each stage therefore has a clear promise:

1. The parser produces recoverable syntax.
2. Semantic analysis attaches meaning and diagnostics.
3. Lowering accepts only valid meaning.
4. Code generation accepts only the smaller bound language.

When a compiler grows, those boundaries matter much more than the number of classes in any single pass.

# [](#lifetime-of-the-ir)Lifetime of the IR

The bound IR does not duplicate every symbol. It keeps non-owning references to symbols owned by the semantic model. That makes symbol identity stable across semantic analysis and lowering, but it creates an explicit lifetime order:

```text
AST → SemanticModel → BoundProgram
```

The AST must remain alive while AST-keyed semantic queries are used. The semantic model must remain alive while the bound program refers to its symbols.

Rather than hiding that dependency, we documented it and tested it. Predictable internal ownership is what lets later passes be aggressive without becoming fragile.

# [](#what-became-possible)What became possible

The first bound IR covered functions, blocks, local declarations, expression statements, returns, conditionals, literals, variables, function references, unary and binary operations, assignments, and direct calls.

That was almost exactly the subset needed for an LLVM proof of concept.

More importantly, the backend could now be written without importing parser logic. It would not resolve names, decide types, or understand source-level `else if`. It would translate a verified, typed program into another verified representation.

That separation keeps the backend focused on translation instead of source-language interpretation.

# [](#conclusion)Conclusion

Adding an IR can feel like delaying the exciting part. We had a valid program and wanted native code. Instead, we built another representation.

But this is the step that makes the backend small enough to reason about. The source language can grow while LLVM continues to consume a deliberately constrained contract.

<a href="/">Go back</a>
