---
title: "Flecha Dev Log #26: Enums Are Real Types"
date: 2026-03-07
published: true
---

# [](#intro)Introduction

Hi folks!

Named integer constants are useful until the compiler forgets what they mean. A token kind and a connection state may both fit in a byte, but that does not make them interchangeable.

Flecha enums are nominal, allocation-free scalar types. They retain the efficiency of an integer representation while giving the type checker a closed vocabulary of values.

# [](#declaration-and-representation)Declaration and representation

An enum may choose its backing integer and discriminants:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">export enum TokenKind: u16 {
    default NoToken = 0,
    Identifier,
    Number = 10,
    End,
}</code></pre></div></div>

The backing type defaults to `u32`. Implicit discriminants begin at zero and continue from the preceding value; explicit values can create meaningful gaps. Signed backing types permit negative values.

The compiler checks that each value fits its backing type and that both names and discriminants are unique. The enum lowers to its integer representation, but that representation does not erase the declared type.

`TokenKind.Identifier` and a variant from another enum remain incompatible even when both happen to equal one. There are no automatic integer-to-enum or enum-to-integer conversions.

# [](#qualified-values)Qualified values

The enum name is a type, not a value. Variants stay qualified:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">TokenKind kind = TokenKind.Identifier;

if kind == TokenKind.End {
    stdoutln("done");
}</code></pre></div></div>

Qualification makes the domain visible at each use and avoids filling module scope with generic names such as `End`, `Open`, or `None`.

Equality and strict equality work between values of the same enum. Arithmetic, ordering, increment, implicit truth tests, and cross-enum comparison do not. An enum describes alternatives; it is not an integer wearing a label.

# [](#a-semantic-default)A semantic default

At most one variant can be marked `default`. That variant gives contextual `none` a useful meaning:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">enum State: u8 {
    Off,
    default Unknown = 7,
    On,
}

State state = none;       // State.Unknown
[3]State states = none;   // every element is State.Unknown
</code></pre></div></div>

The default is semantic, so it does not need discriminant zero. Arrays and structures initialize the actual selected value rather than clearing bytes and assuming the result is meaningful.

Without a default variant, contextual `none` is rejected. A variable can still be declared for later assignment, and definite-assignment analysis prevents premature reads.

# [](#behavior-without-boxing)Behavior without boxing

Enums can have out-of-line methods using the same receiver model as structures:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">bool State::is_on(&amp;const self) {
    return *self == State.On;
}

void State::turn_on(&amp;self) {
    *self = State.On;
}</code></pre></div></div>

Read-only, mutable, pointer, static, private, and generic methods follow the language's existing rules. No object header or heap allocation is introduced; the value is still the backing scalar at runtime.

Enums may be stored in structures, tuples, fixed arrays, generic containers, references, and raw pointers. Their initialization and destruction remain compiler-defined because scalar enums have no custom lifecycle hooks.

# [](#conclusion)Conclusion

Enums close a gap between representation and meaning. The machine gets a compact integer; the programmer gets a distinct type, qualified values, checked defaults, and methods.

It is a small feature on the surface, but it gives many APIs a much sharper vocabulary.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
