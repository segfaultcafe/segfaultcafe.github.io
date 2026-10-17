---
title: "Flecha Dev Log #17: Tuples, Multiple Results, and Destructuring"
date: 2025-08-12
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha functions could return one value. That becomes awkward as soon as an operation naturally produces two: a quotient and remainder, a result and status, or a value and its metadata.

Tuples provide aggregate returns, destructuring declarations, mixed declaration-and-assignment, and tuple-aware cleanup.

The syntax was compact. The evaluation rules had to be exact.

# [](#a-tuple-is-a-value)A tuple is a value

A tuple contains two or more positional elements:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">(i32, bool) result = (42, true);
inferred := (42, true);
(i32, (bool, u8)) nested = (42, (true, 7));</code></pre></div></div>

Parentheses around one expression remain grouping. `(42)` is still an `i32`; Flecha did not add empty or single-element tuple types.

Elements evaluate exactly once from left to right. That becomes important when expressions have side effects or own resources.

# [](#multiple-results)Multiple results

A function can return a tuple directly:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">(i32, i32) divide(i32 dividend, i32 divisor) {
    return (dividend / divisor, dividend % divisor);
}

i32 main() {
    quotient, remainder := divide(17, 5);
    return quotient + remainder;
}</code></pre></div></div>

The call runs once. Its complete result is captured before either destination changes.

That rule also makes swapping unsurprising:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">left, right = (right, left);</code></pre></div></div>

The right-hand tuple is built from the old values before assignment starts. We do not accidentally write `left` and then read that new value for `right`.

# [](#destructuring-forms)Destructuring forms

Flecha supports inferred, shared-type, per-name, discarded, and mixed bindings:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">quotient, remainder := divide(17, 5);
i32 q, r = divide(17, 5);
i32 first, i32 second = divide(17, 5);
_, remainder = divide(19, 5);
(i32 next, quotient) = divide(20, 3);</code></pre></div></div>

The final line declares `next` and assigns an existing `quotient` in one destructuring operation. Every destination is validated before writes begin.

`_` discards a position without creating a binding. Discarding an owning element still performs whatever cleanup that value requires.

# [](#ownership-inside-an-aggregate)Ownership inside an aggregate

Tuples can contain owning strings and nested tuples:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">(string, (u8, bool)) describe() {
    return ("Flecha", (42, true));
}</code></pre></div></div>

Returning an owning tuple constructs an independent result before the callee's scope cleanup. Local tuples, parameters, temporaries, and deferred captures recursively destroy owning strings.

Cleanup follows source structure in reverse: tuple fields are destroyed in reverse order, and existing control-flow cleanup covers every exit edge.

References, slices, and string views were initially excluded from stored tuple elements because aggregates would need to preserve their borrow origins. Raw pointers were allowed under their existing unsafe contract.

# [](#internal-abi)Internal ABI

LLVM represents a tuple as a non-packed struct whose fields follow source order. Nested tuples remain nested structs. Target data layout determines padding.

Flecha functions pass and return those aggregates through an internal compiler ABI. We explicitly did not claim that the layout matched a C struct or would remain stable between compiler versions.

This distinction let the language gain useful aggregate values before freezing a foreign-function interface it was not ready to promise.

# [](#conclusion)Conclusion

Tuples give Flecha a direct model for multiple results without hidden out-parameters or special runtime objects.

They are ordinary positional values, so the same rules for evaluation order, ownership, cleanup, and ABI representation apply consistently.

<a href="/">Go back</a>
