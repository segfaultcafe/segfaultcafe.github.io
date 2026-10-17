---
title: "Flecha Dev Log #34: Returning References and Slices"
date: 2026-10-17
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha had checked references. It had checked slices. We could borrow a variable, pass the borrow into a function, prevent conflicting access while it was live, and release the restriction after its last use.

It felt like we had everything.

Then we tried to return a slice.

The slice itself is only an address and a length. Returning those bits is easy. The real question is whether the storage behind them remains alive, and which value in the caller must remain borrowed while the returned view is used.

Then the same problem appeared when returning a reference to a structure field.

How do we make sure the borrowed lifetime stays in scope? How do we carry that relationship through a call while preserving Flecha's existing last-use and exclusivity rules?

That is what this dev log is about.

# [](#the-missing-relationship)The missing relationship

Consider a function that returns the tail of a slice:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[]const i32 tail([]const i32 values) {
    return values[1:];
}</code></pre></div></div>

The return type tells us that the result is a read-only slice. It does not say where the slice came from.

If it came from `values`, the caller's original sequence must stay borrowed. If it came from a local array, returning it must be rejected because that array disappears with the call. If a function receives two slices, the result type alone cannot tell us which argument anchors the returned view.

References have exactly the same gap:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">&amp;const i32 value(&amp;const Box self) {
    return &amp;self-&gt;value;
}</code></pre></div></div>

The compiler can see the origin inside this body, but callers need that relationship in the function's contract. Once the function is registered in another module or instantiated through a generic, its implementation cannot be the caller's lifetime model.

# [](#name-the-source)Name the source

Flecha now writes that relationship with `<- source`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[]const i32 tail([]const i32 values) &lt;- values {
    return values[1:];
}

&amp;const i32 value(&amp;const Box self) &lt;- self {
    return &amp;self-&gt;value;
}</code></pre></div></div>

Read it as “the returned borrow comes from this parameter.”

The contract is compile-time information. It does not add a lifetime object, reference counter, hidden allocation, or extra field to a slice. References and slices keep their native representation.

The named source must be a checked reference or checked slice parameter. A raw pointer, owning pointer, ordinary value, local variable, or temporary cannot anchor a safe returned loan. Even an `unsafe` block cannot manufacture that proof.

Every result containing a checked reference or checked slice requires a contract. A contract on a function that returns no borrowed value is also an error. The syntax describes one exact relationship; it is not a decorative annotation.

# [](#the-callee-proves-the-origin)The callee proves the origin

Every reachable return path is checked against the declared source.

Returning the source itself is valid. So is returning a checked reborrow derived from it: a structure field, a fixed-array element, a fixed-array slice, a slice element, or a subslice. Returning a reference to a local or to another parameter is rejected even if the types look identical.

Permission can become weaker, never stronger:

```text
&T       -> &T          allowed
&T       -> &const T    allowed
&const T -> &const T    allowed
&const T -> &T          rejected

[]T       -> []T          allowed
[]T       -> []const T    allowed
[]const T -> []const T    allowed
[]const T -> []T          rejected
```

A function may expose less access than it received. It cannot turn shared access into exclusive mutation.

# [](#the-caller-inherits-the-loan)The caller inherits the loan

At a call site, the compiler substitutes the actual argument's origin into the returned value:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">values := [10, 20, 30, 40];
rest := tail(values[:]);

stdoutln(rest[0]);
values[1] = 21;</code></pre></div></div>

While `rest` is live, it protects the original sequence according to ordinary borrow rules. Its last use is `rest[0]`, so the later mutation is valid.

Move that mutation before the `stdoutln` and the compiler rejects it: the read-only slice still borrows the sequence. Try to move, rebind, or destroy the source while the result is live and the same protection applies.

The returned handle participates in everything Flecha already knows: exclusivity, last-use analysis, parent reborrows, field projections, moved handles, branches, loops, and scope exits. We did not need a second borrow checker. We needed the call boundary to preserve the information the existing checker was missing.

# [](#contracts-compose)Contracts compose

A contracted function may return the result of another contracted function when the inner loan ultimately comes from the outer function's declared source:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[]const i32 skip_two([]const i32 values) &lt;- values {
    return tail(tail(values));
}</code></pre></div></div>

The origin survives nested calls, module boundaries, generic specialization, and recursion. The compiler stores the source parameter in the function symbol, then substitutes the caller's concrete origin each time the function is used.

This is where the architectural choice pays off. The relationship is part of the function's semantic contract, so it does not disappear after parsing or depend on inlining the body.

# [](#more-than-one-result)More than one result

A single source can produce a flat tuple containing borrowed results:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Pair {
    i32 left;
    i32 right;
};

(&amp;i32, &amp;i32) fields(&amp;Pair pair) &lt;- pair {
    return (&amp;pair-&gt;left, &amp;pair-&gt;right);
}

Pair pair = none;
left, right := fields(&amp;pair);
*left = 20;
*right = 22;</code></pre></div></div>

Each destination receives its own origin, projection, mutability, movement, and last-use state. Distinct structure fields can be proven disjoint, so the two mutable results above are valid.

Returning the same mutable place twice is rejected. Mixing a mutable result with an overlapping shared result is rejected too. Mutable array and slice elements remain conservative whole-sequence loans, so two mutable element results are rejected even when their runtime indices happen to differ.

The compiler accepts disjointness it can prove, not disjointness we merely expect.

# [](#why-immediate-destructuring-matters)Why immediate destructuring matters

A tuple containing borrowed values must be consumed through immediate destructuring:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">left, right := fields(&amp;pair);</code></pre></div></div>

Storing that borrowed tuple, nesting it, passing it as an ordinary aggregate, or capturing it in `defer` is rejected.

Immediate destructuring gives every returned handle an independent tracked state at the exact call site. Supporting a stored aggregate of loans would require the aggregate itself to preserve and expose several lifetime relationships. Until that model exists, keeping the operation flat makes the accepted behavior honest.

# [](#what-the-contract-does-not-do)What the contract does not do

`<-` does not turn raw pointers into checked references. It does not let a safe API borrow arbitrary heap storage whose owner relationship is unknown. It does not cover returned `stringv`, external C references, or several independent source parameters.

These boundaries are intentional. A single source is precise enough to state, validate, compose, and explain, so the accepted feature stays within what the caller can prove today.

# [](#conclusion)Conclusion

Returning a reference or slice was never mainly about returning an address. It was about returning a relationship.

`<- source` makes that relationship part of the function contract. The callee proves that every borrowed result comes from the declared parameter; the caller keeps the corresponding storage borrowed for exactly as long as the result remains live.

No garbage collector, hidden allocation, or runtime lifetime table is required. We preserve the origin, enforce the permission, and let last-use analysis do the rest.

This is the kind of Flecha problem I love: the syntax is tiny, but it carries exactly the information needed to make a low-level operation feel direct and still remain checked.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
