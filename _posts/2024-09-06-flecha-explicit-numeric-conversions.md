---
title: "Flecha Dev Log #6: Making Numeric Conversions Explicit"
date: 2024-09-06
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha had integers of several widths, signed and unsigned variants, and two floating-point types. The semantic analyzer deliberately rejected arithmetic between different numeric types.

That gave us a safe rule, but not yet a practical language.

Real programs eventually need to turn an `i32` into an `i64`, narrow a value to `u8`, or cross the boundary between integers and floating point. If those conversions were not going to happen silently, we needed an explicit operation with precise semantics.

Numeric casts therefore need one precise meaning through the entire compiler.

# [](#two-spellings-one-operation)Two spellings, one operation

Flecha gained two cast spellings:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 first = 32 as i32;
i32 second = 10.cast&lt;i32&gt;;

i64 wide = first.cast&lt;i64&gt;;
u8 narrow = wide.cast&lt;u8&gt;;
f64 decimal = narrow.cast&lt;f64&gt;;</code></pre></div></div>

`value as Type` is concise when the conversion is part of a larger expression. `value.cast<Type>` is chainable and fits the member-style conversion vocabulary we expected to grow later.

Both forms produce the same AST node and the same semantics. We did not want two conversion systems hidden behind two pieces of syntax.

# [](#a-cast-crosses-every-stage)A cast crosses every stage

Numeric casts are a perfect example of why a language feature is never “just syntax.”

The tokenizer needed the `as` keyword. The parser needed cast precedence and postfix parsing. The AST needed a `CastExpression` containing the input expression and target type. Semantic analysis had to resolve the target and reject unsupported source-target pairs. Lowering had to preserve both types in the bound IR. Finally, LLVM code generation had to select the correct instruction.

The tests followed the same path:

- parser tests checked both spellings and chaining;
- semantic tests checked legal and illegal conversions;
- lowering tests checked the typed bound cast;
- code-generation tests checked the LLVM behavior;
- the native example verified the final exit value.

This became our normal standard for language work. A feature was not finished because the parser accepted it. It was finished when the complete pipeline agreed on what it meant.

# [](#signedness-is-behavior)Signedness is behavior

Consider converting an integer to a wider integer. LLVM needs to know whether to sign-extend or zero-extend. Converting an integer to a float also depends on whether the source is signed. Converting a float back to an integer depends on the destination.

The backend therefore selected operations using Flecha's semantic types:

- integer to integer used a width-changing cast with the source signedness;
- signed integer to float used a signed conversion;
- unsigned integer to float used an unsigned conversion;
- float to signed or unsigned integer followed the destination signedness;
- float-width changes used floating-point casts.

An explicit cast is not a magic permission to forget types. It is the point where the programmer asks for a specific transformation, and the compiler must implement that transformation exactly.

# [](#why-no-implicit-numeric-promotion)Why no implicit numeric promotion?

Many languages automatically promote smaller integers or combine integers and floating-point values. That is convenient until the selected conversion is not the one a systems programmer expected.

Flecha chose a simpler initial rule:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 count = 10;
i64 total = 32;

// result := count + total;       // incompatible operand types
result := count.cast&lt;i64&gt; + total;</code></pre></div></div>

The conversion appears exactly where information may be widened, narrowed, rounded, or reinterpreted numerically. That makes code review easier and keeps overload or promotion rules out of the first type system.

We can always add carefully specified conveniences later. Removing an invisible conversion after users depend on it is much harder.

# [](#casts-compose)Casts compose

Because casts are expressions, they work anywhere another value works:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    first := 32 as i32;
    second := 10.cast&lt;i32&gt;;
    base := first + second;
    wide := base.cast&lt;i64&gt;;
    narrow := wide.cast&lt;u8&gt;;
    decimal := narrow.cast&lt;f64&gt;;
    result := (decimal as f32) as i32;
    return result;
}</code></pre></div></div>

This program travels through several representations and still returns `42`. It is small, but it proves that parsing, semantic validation, lowering, and native code generation agree across the entire chain.

# [](#conclusion)Conclusion

Numeric casts gave Flecha an escape from strict type equality without weakening the rule that conversions should be visible.

They also demonstrate a durable pattern: offer concise source syntax, lower it to one semantic operation, and keep target-specific instruction details in the backend.

<a href="/">Go back</a>
