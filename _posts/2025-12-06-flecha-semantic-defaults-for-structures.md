---
title: "Flecha Dev Log #23: Semantic Defaults for Structures"
date: 2025-12-06
published: true
---

# [](#intro)Introduction

Hi folks!

Zeroing bytes is easy. Constructing a valid value is a different problem.

As structures became usable inside arrays, tuples, and generic code, Flecha needed a precise meaning for “give me the default value of this type.” We already had `none` for empty values, but applying it to structures could not simply mean `memset` and hope for the best.

The result is semantic default construction through `zero`.

# [](#none-needs-an-expected-type)None needs an expected type

When the surrounding context says which structure is expected, `none` asks that type for its default:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Position {
    i32 line;
    i32 column;
};

Position cursor = none;
cursor = none;

bool at_origin = cursor == none;</code></pre></div></div>

For a plain structure whose fields are all defaultable, the compiler provides `Position::zero()`. It initializes each field according to Flecha's type rules. This is semantic initialization, even when the eventual machine representation happens to contain zero bits.

`none` also works in arguments, returns, tuples, arrays, and ordinary equality when the expected type is known.

# [](#custom-zero)A custom default is still constrained

A structure with custom lifecycle behavior must state its safe default explicitly:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Position {
    i32 line;
    i32 column;
};

Position Position::zero() override {
    return build Position {
        self.line = 1;
        self.column = 1;
    };
}</code></pre></div></div>

`zero` is static, takes no parameters, and returns an owning value of the structure type. More importantly, it must be safe and unsurprising. It cannot allocate, free, perform unsafe operations, transfer ownership, print output, or hide those effects behind a helper.

That restriction lets the compiler use default construction in larger values without secretly introducing failure or externally visible work.

Recursive defaults are checked as a graph. If `A::zero()` requires `B::zero()` and `B::zero()` requires `A::zero()`, Flecha rejects the cycle instead of recursing forever during construction.

# [](#zero-is-not-init)Zero is not init

Field initializers belong to ordinary `init` construction. They do not redefine the meaning of `none` for a plain structure:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Counter {
    i32 value = 99;
};

Counter empty = none;           // value is the semantic zero for i32
Counter configured = Counter::init(); // value uses the field initializer</code></pre></div></div>

This distinction keeps two useful operations separate. `init` means “construct using the type's normal configuration.” `zero` means “construct the type's defined empty/default state.” A type may make them equal, but the language does not confuse them.

# [](#equality-follows-fields)Equality follows fields

Structures can be compared field by field. Each operand is evaluated once, and temporary values created from contextual `none` are cleaned up normally.

Strict comparison keeps its existing meaning. `value == none` constructs the structure default and compares it. `value === none` compares static kinds and is false because a structure value is not the generic `none` value.

This sounds subtle, but it preserves an important promise: ordinary equality may use contextual conversion; strict equality does not.

# [](#defaults-compose)Defaults compose

Once default construction is a type operation instead of a byte trick, it composes. Fixed arrays can initialize every element. Runtime-sized arrays can construct a requested number of structure values. Tuples can recursively establish valid empty state.

If any contained type lacks a default, the containing operation is rejected. The compiler never silently creates an invalid partially initialized object.

# [](#conclusion)Conclusion

The word “zero” names a semantic baseline, not a promise about raw bytes. That decision lets simple structures work automatically while types with stronger invariants define a safe default themselves.

It also gives generic containers one dependable question to ask: can this element type produce a valid empty value?

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
