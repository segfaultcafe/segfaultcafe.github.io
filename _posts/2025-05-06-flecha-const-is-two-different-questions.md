---
title: "Flecha Dev Log #11: Const Is Two Different Questions"
date: 2025-05-06
published: true
---

# [](#intro)Introduction

Hi folks!

The memory-model draft separated storage, ownership, and access. The first implementation step looked familiar: add `const`.

Then compound types made the familiar word ambiguous.

Does `const` mean the pointer cannot be rebound, or that the value behind it cannot be changed? What happens when a reference points to a pointer? Does reading a const value make its copy const too?

Const value declarations and a recursive type representation answer those questions one layer at a time.

# [](#const-values)Const values

A const local requires an initializer, but that initializer can run at runtime:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">const i32 add(const i32 input) {
    const i32 increment = 2;
    return input + increment;
}

i32 main() {
    const i32 answer = add(40);
    copy := answer;
    copy = copy + 1;
    return answer;
}</code></pre></div></div>

`answer` cannot be reassigned. `copy` can, because reading a const value produces an ordinary value. Const belongs to the binding that stores the value; it is not contagious.

The same rule applies to return types and casts. A function returning `const i32` does not force the caller's new binding to be const. The caller chooses that in its own declaration.

Const also does not mean compile-time evaluation. It means “this binding cannot change after initialization,” whether the initial value is a literal or the result of a function call.

# [](#none-remains-explicit)None remains explicit

The universal `none` value continued to request a type's defined zero:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">const i32 count = none;
const bool ready = none;
const string message = none;</code></pre></div></div>

Those variables are initialized—to `0`, `false`, and an empty owning string. A declaration with no initializer is a different state and is not permitted for const locals.

This preserved the distinction from definite assignment: “fixed after construction” still requires construction.

# [](#binding-versus-target)Binding versus target

The larger change was a recursive type model. Each pointer or reference layer could carry its own qualifier:

| Type | Rebind handle? | Modify target? |
| --- | --- | --- |
| `*u8` | Yes | Yes, in unsafe code |
| `*const u8` | Yes | No |
| `constptr u8` | No | Yes, in unsafe code |
| `constptr const u8` | No | No |
| `&u8` | Yes | Yes |
| `&const u8` | Yes | No |
| `constref u8` | No | Yes |
| `constref const u8` | No | No |

`constptr T` is the readable alias for `const *T`: the pointer binding is fixed. `*const T` instead makes the target read-only.

The same separation applies to references. A fixed reference may still permit writes through itself; a rebindable shared reference may still forbid target writes.

This was the decision that kept constness from collapsing into one global “immutable somehow” bit.

# [](#recursive-types)Recursive types

Compound types were normalized recursively:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void inspect(
    &amp;*u8 referenceToPointer,
    *const *const u8 pointerToFixedReadOnlyPointer,
    constref *const u8 fixedReferenceToReadOnlyPointer
) {}</code></pre></div></div>

Semantic type equality now compared kind, qualifier, and target at every layer. Diagnostics printed expanded types rather than relying on alias spelling. Reading a value removed only its outer binding qualifier; nested target restrictions remained intact.

The parser and semantic model could represent these types before the compiler could execute them. Pointer and reference use was still rejected before lowering.

That staged boundary was deliberate. We wanted to settle the type vocabulary before assigning unsafe or borrowing behavior to it.

# [](#const-does-not-own)Const does not own

Const did not extend lifetimes, create ownership, or make a view safe to escape.

A const owning string still owned its allocation. Copying it produced an independent mutable owner under the current string rules. A const `stringv` still depended on someone else's storage.

This distinction became a useful guardrail: mutability, ownership, and lifetime are separate axes. One keyword should not pretend to solve all three.

# [](#conclusion)Conclusion

The visible feature is const declarations. The deeper result is a type system that expresses fixed bindings and read-only targets independently, even when pointers and references are nested.

<a href="/">Go back</a>
