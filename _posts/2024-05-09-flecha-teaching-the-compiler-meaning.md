---
title: "Flecha Dev Log #2: Teaching the Compiler What Code Means"
date: 2024-05-09
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha's abstract syntax tree can identify a function, a declaration, and a call.

That is syntax. It is not meaning.

Consider this perfectly parseable program:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    answer := missing + 1;
    return false;
}</code></pre></div></div>

The braces match. The operators are in legal positions. Yet `missing` does not exist, and a function returning `i32` cannot return `bool`.

Semantic analysis connects that syntax to scopes, symbols, resolved types, and exact diagnostics.

# [](#two-type-worlds)Two type worlds

One of the first decisions was to keep syntax types and semantic types separate.

An AST type records what the programmer wrote. A semantic type records what the compiler resolved. Those are related, but they are not the same job. The semantic layer also needs internal concepts such as function types, error-recovery types, and literal-only states that should never become source syntax.

The first semantic model understood all primitive widths:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i8 tiny = 1;
i32 ordinary = 32;
u64 large = 64;
f32 decimal = 1.25;
bool ready = true;
char marker = '!';</code></pre></div></div>

Literal defaults were deliberate: integer literals became `i32`, floating-point literals became `f64`, and strings, characters, booleans, `null`, and `none` each retained their own semantic category.

Most importantly, distinct numeric types do not silently coerce. If two arithmetic operands have different types, the compiler rejects the expression and requires an explicit conversion.

# [](#names-need-identities)Names need identities

Textual names are not enough. Two variables can have the same spelling and still be different variables:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    value := 1;

    if true {
        value := false;
        value = true;
    }

    value = 2;
    return value;
}</code></pre></div></div>

The inner `value` intentionally shadows the outer one. To model that correctly, Flecha introduced symbols and lexical scopes.

Lookup starts in the current scope and walks outward. Duplicate names are rejected inside one scope, but nested scopes can shadow. Functions live in the compilation-unit scope. Parameters and top-level locals live in a function scope. Conditional bodies create child scopes.

The semantic model binds every name expression directly to the symbol it resolved. Later stages do not repeat lookup or guess based on text.

# [](#declaration-order-is-a-language-rule)Declaration order is a language rule

Functions are registered before their bodies are analyzed, which permits a function to call another function declared later in the file.

Locals follow a different rule. Their initializer is analyzed before the new name enters the scope:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    value := value + 1;
    return value;
}</code></pre></div></div>

That is an error. The declaration cannot initialize itself by accidentally finding the name being created. The same decision makes use-before-declaration straightforward to diagnose.

The inferred-declaration operator also gained real meaning:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">base := 32;
sum := (base + 10) * 2;
comparison := sum &gt; base;</code></pre></div></div>

`sum` resolves to `i32`; `comparison` resolves to `bool`. Inference is no longer parser convenience. It is a semantic result stored on a symbol.

# [](#diagnostics-are-an-api)Diagnostics are an API

The analyzer introduced stable diagnostic codes from `FLECHA-S0001` onward. Duplicate declarations, unknown names, incompatible assignments, invalid operands, non-boolean conditions, bad return types, and invalid calls each received a distinct identity.

We also retained exact source ranges on identifiers and expressions. Reporting “something is wrong in this function” is easy. Underlining precisely the second declaration of `value` is the useful part.

After an error, the analyzer produces an internal error type. This lets independent statements continue to be checked without generating a cascade of nonsense derived from the first failure.

That choice made diagnostics part of the compiler's architecture. A failed compilation should still produce structured, stable, useful output.

# [](#ownership-between-stages)Ownership between stages

The AST owns its syntax nodes. The semantic model owns symbols and scopes. Tables connecting syntax nodes to semantic objects contain non-owning pointers.

Symbols and scopes are individually allocated, so moving the model does not invalidate their addresses. The model can answer questions about the AST, but it must not outlive that AST.

This lifetime contract is specific, testable, and slightly boring—which is exactly what we want from compiler infrastructure.

# [](#conclusion)Conclusion

With semantic analysis, Flecha crossed an important boundary. The compiler no longer recognized only grammatical programs. It understood declarations, bindings, types, calls, assignments, and returns.

The semantic model is shaped for answering questions about source code. A code generator needs a stricter boundary: names already resolved, types already attached, and complex syntax normalized into a smaller set of operations.

<a href="/">Go back</a>
