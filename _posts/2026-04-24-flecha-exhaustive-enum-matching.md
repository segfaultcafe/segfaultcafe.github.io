---
title: "Flecha Dev Log #27: Exhaustive Enum Matching"
date: 2026-04-24
published: true
---

# [](#intro)Introduction

Hi folks!

An enum defines a closed set of possibilities. Once the compiler knows that set, asking programmers to reconstruct exhaustiveness with a chain of `if` statements would waste the most useful information the type provides.

Flecha's `match` is an expression that evaluates one enum value once, selects one arm, and requires the cases to be complete.

# [](#match-produces-a-value)Match produces a value

Because `match` is an expression, it fits directly into a return or assignment:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 precedence(TokenKind kind) {
    return match kind {
        TokenKind.Identifier =&gt; 1,
        TokenKind.Number =&gt; 2,
        TokenKind.End =&gt; 0,
    };
}</code></pre></div></div>

Every arm contains an expression. The enclosing declaration, argument, assignment, or return can provide its expected type; otherwise the first arm establishes the result type and the remaining arms must be assignable to it.

Only the selected arm executes. The input expression itself executes exactly once, so a call or increment used as the subject cannot be duplicated by lowering.

# [](#exhaustiveness-is-checked)Exhaustiveness is checked

Without a wildcard, every variant must appear exactly once. Missing a variant is a compile-time error. So are duplicate variants, unknown variants, and variants from another enum.

This turns enum growth into useful pressure. Add a new token kind, rebuild, and every complete match that needs a decision points directly at the missing behavior.

For cases where several values intentionally share behavior, `_` covers everything not already named:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">bool TokenKind::ends_input(&amp;const self) {
    return match *self {
        TokenKind.End =&gt; true,
        _ =&gt; false,
    };
}</code></pre></div></div>

The wildcard must be the last arm. Code after it would be unreachable, and Flecha reports that instead of silently accepting a misleading list.

# [](#a-focused-pattern-language)A focused pattern language

The initial pattern language has two forms: a qualified enum variant and `_`.

There are no guards, ranges, integer or string patterns, destructuring patterns, or block-bodied arms here. Keeping the first version narrow made it possible to define exhaustiveness, typing, evaluation order, and code generation without pretending to support a general pattern system.

That focus also keeps `match` aligned with its purpose: making decisions over a closed nominal type.

# [](#lowering-to-a-switch)Lowering to a switch

The compiler lowers the expression to a switch over the enum's backing integer. Every valid representation reaches one arm.

When the source lists every variant and has no wildcard, impossible integer representations become unreachable in the backend. When `_` exists, it becomes the default edge. The source-level completeness proof therefore maps neatly onto efficient native control flow.

# [](#conclusion)Conclusion

`match` lets the enum declaration do real work. It removes repeated comparisons, keeps value production concise, and makes forgotten cases a compiler problem.

The part I enjoy most is how direct the code reads: here is one value, here are all of its meanings, and here is the result for each one.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
