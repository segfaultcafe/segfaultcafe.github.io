---
title: "Flecha Dev Log #18: Errors Are Values"
date: 2025-08-29
published: true
---

# [](#intro)Introduction

Hi folks!

Once Flecha could return tuples, one use case became impossible to ignore: a function result and an error.

We did not want exceptions, hidden stack unwinding, or a boolean that forgot which failure occurred. We wanted errors to be typed values that ordinary control flow could inspect and propagate.

Named error families, a generic `error` type, explicit success through `none`, and allocation-free representations provide that model.

# [](#named-families)Named families

An error family declares its possible failures:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">error MathError {
    DivisionByZero,
    Overflow,
}

error InputError {
    InvalidDigit,
}</code></pre></div></div>

`MathError` and `InputError` are distinct nominal types. The same variant spelling in two families would still represent different failures.

Variants have no payloads or user-selected numeric codes. `none` is the implicit success value and cannot be declared as a failure variant.

# [](#specific-and-generic)Specific and generic

A named error can widen to the built-in generic `error` type:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">MathError specific = MathError.Overflow;
error general = specific;
general = InputError.InvalidDigit;</code></pre></div></div>

The generic value preserves both family and variant identity. Conversion in the other direction is rejected because the compiler cannot prove a generic error belongs to the requested family.

Two different named families cannot be compared directly. Widen them to `error` when cross-family comparison is intentional.

There are no numeric casts, downcasts, or automatic error-to-string conversions.

# [](#success-is-explicit)Success is explicit

`none` represents success:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">MathError success = none;

if success != none {
    return 1;
}</code></pre></div></div>

Errors do not convert implicitly to booleans. Code says `err != none` instead of relying on a truthiness rule whose direction readers must remember.

Ordinary `==` and `!=` allow contextual widening. Strict `===` and `!==` include the static type, so a named error and generic error remain strictly different even when their ordinary error identity matches.

# [](#multiple-results-and-propagation)Multiple results and propagation

Tuples make the intended style direct:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">(i32, MathError) divide(i32 numerator, i32 denominator) {
    if denominator == 0 {
        return (0, MathError.DivisionByZero);
    }
    return (numerator / denominator, none);
}

i32 main() {
    quotient, err := divide(84, 2);
    if err != none {
        return 1;
    }
    return quotient;
}</code></pre></div></div>

No compiler rule claims the result is meaningful only when the error is `none`. That contract belongs to the function and its caller.

Ignoring an error remained permitted. We did not add `try`, `?`, or automatic propagation before understanding how those conveniences should interact with cleanup and multiple results.

# [](#representation-without-allocation)Representation without allocation

A named error lowers to a 32-bit code. Zero means success; nonzero codes identify variants in declaration order.

A generic error stores a family identity plus the variant code. Each family receives a distinct module-private global address. Widening success clears that identity, so success is shared across families.

Comparisons examine the fields directly rather than comparing aggregate padding. Errors need no allocation, destructor, message object, or runtime exception state.

The exact representation remains compiler-private. Sharing family identity across independently compiled modules would require a later linkage contract.

# [](#conclusion)Conclusion

Flecha errors are ordinary typed values: cheap to copy, explicit to inspect, and easy to combine with multiple returns.

The feature adds no invisible control flow. A failure return runs the same defers and cleanup as any other return because, to the language, it is one.

<a href="/">Go back</a>
