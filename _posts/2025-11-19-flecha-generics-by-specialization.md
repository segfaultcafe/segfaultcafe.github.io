---
title: "Flecha Dev Log #22: Generics by Specialization"
date: 2025-11-19
published: true
---

# [](#intro)Introduction

Hi folks!

Once modules let us build reusable libraries, repetition became much easier to see. A container for `i32` and the same container for `u64` differed mostly in spelling, yet the compiler treated them as unrelated implementations.

Flecha needed generics, but it also needed them to fit the language we already had: concrete native types, deterministic layout, ownership analysis, and no hidden runtime type machinery.

The answer was compile-time specialization.

# [](#explicit-type-arguments)Explicit type arguments

A generic function declares its type parameters beside its name:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">T identity&lt;T&gt;(T value) {
    return value;
}

(A, B) pair&lt;A, B&gt;(A first, B second) {
    return (first, second);
}

i32 answer = identity&lt;i32&gt;(42);
name, count := pair&lt;stringv, usize&gt;("arrows", 3);</code></pre></div></div>

Type arguments are explicit. Flecha does not infer them from call arguments. That keeps call sites readable and makes specialization deterministic before ordinary overload and conversion rules do their work.

Type parameters can appear inside compound types, so `[]T`, `*T`, tuples containing `T`, and structures parameterized by `T` all use the same mechanism.

# [](#generic-structures)Generic structures

Structures and their methods can be generic too:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Box&lt;T&gt; {
    T value;
};

T Box&lt;T&gt;::get(&amp;const self) {
    return self-&gt;value;
}

void Box&lt;T&gt;::set(&amp;self, T value) {
    self-&gt;value = value;
}</code></pre></div></div>

The method repeats the owner's type parameters. It makes the relationship explicit in source and gives the compiler a complete declaration even when method bodies are discovered separately from the structure.

A method may also introduce its own type parameters. Owner parameters and method parameters form an ordered specialization key, so the compiler knows exactly which concrete function it is checking.

# [](#templates-do-not-reach-the-backend)Templates do not reach the backend

The compiler parses and registers a generic declaration, but it does not lower an abstract `T` to LLVM.

When code asks for `Box&lt;i32&gt;`, a pre-semantic expansion phase creates a concrete structure and concrete methods. Those declarations then pass through the ordinary pipeline: type checking, initialization rules, borrow checking, allocation analysis, bound IR, lowering, and code generation.

That was the important architectural decision. Generics do not create a parallel compiler inside the compiler. They materialize ordinary Flecha declarations early enough that every existing safety check can reason about concrete types.

The same declaration plus the same ordered type arguments maps to one cached specialization, including when it is reached through different modules. Nested applications such as `Box&lt;Box&lt;i32&gt;&gt;` naturally build on the same rule.

# [](#errors-at-instantiation)Errors appear where types become concrete

Generic syntax and non-dependent facts can be checked when the template is loaded. Operations whose validity depends on `T` are checked when a specialization is requested.

If a body copies `T`, instantiating it with a noncopyable type fails. If it needs a default value, a type without valid default construction fails. The diagnostic points to the concrete use and the generic operation that could not be satisfied.

There is no constraint or trait language yet. Instead of pretending every `T` supports every operation, Flecha validates the actual body under each concrete substitution.

# [](#bounded-expansion)Expansion is bounded

Compile-time generation needs limits just as runtime allocation does. Flecha caps specialization ancestry, the number of materialized declarations, and generated token volume.

A recursively expanding template therefore ends in a compiler diagnostic rather than an exhausted machine. These limits are part of making the compiler's behavior predictable, not merely defensive implementation details.

# [](#conclusion)Conclusion

Flecha generics are deliberately concrete. Source code is reusable, but every generated program is built from specific layouts and specific operations that the normal compiler can verify.

The result feels pleasantly small at the surface: add `&lt;T&gt;`, instantiate it explicitly, and let the same semantic machinery prove the specialization valid.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
