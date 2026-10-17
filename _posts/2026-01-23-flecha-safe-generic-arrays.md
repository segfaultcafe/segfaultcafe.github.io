---
title: "Flecha Dev Log #24: A Safe Generic Array"
date: 2026-01-23
published: true
---

# [](#intro)Introduction

Hi folks!

Runtime-sized allocation gave Flecha the raw ingredients for a dynamic array. Generics let one implementation work for many element types. Structure lifecycle made cleanup deterministic.

But putting those ingredients together raised an important design question: should every caller have to enter `unsafe` just because the container uses raw memory internally?

Absolutely not. The standard library now separates an unsafe storage engine from a safe public container.

# [](#the-unsafe-core)The unsafe core

`RawArray&lt;T&gt;` owns runtime-allocated storage and implements the mechanics: length, capacity, growth, indexed reads and writes, removal, and destruction.

Its implementation may allocate a larger buffer, copy initialized elements, release the old buffer, and update bookkeeping. These are exactly the operations where raw pointers belong, and they remain inside the type that can defend their invariants.

The supported `T` is intentionally conservative: suitable scalar and structure values are accepted, while strings, pointers, references, destructible values, and element types whose movement is not yet modeled are rejected.

# [](#the-safe-wrapper)The safe wrapper

The public `Array&lt;T&gt;` contains the raw implementation privately:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">export structure Array&lt;T&gt; {
    private raw_array::RawArray&lt;T&gt; inner;
};

error Array&lt;T&gt;::push(&amp;self, T value) {
    unsafe {
        return self-&gt;inner.push(value);
    }
}</code></pre></div></div>

The unsafe block is not a loophole for users. It is the implementation boundary where `Array` relies on the invariant maintained by its private `RawArray`. Public methods do not expose the backing pointer, so callers cannot invalidate length or capacity behind the container's back.

That gives normal code a straightforward API:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">Array&lt;i32&gt; values = none;

if values.push(20) != none {
    return 1;
}

if values.push(22) != none {
    return 1;
}

answer, err := values.get(1);
if err == none {
    stdoutln(answer);
}</code></pre></div></div>

# [](#failure-does-not-break-the-container)Failure does not break the container

Growth can fail. The method therefore returns an error instead of pretending allocation always succeeds.

The important contract is stronger than “an error is returned.” If reserving new storage fails, the existing elements, length, and capacity remain valid. The container only commits its new state after allocation and transfer succeed.

Bounds failures use `ArrayError`. Allocation failures preserve the shared `AllocationError.OutOfMemory`. A caller can distinguish an invalid index from a machine that could not provide more memory.

# [](#one-lifecycle-owner)One lifecycle owner

Both `RawArray&lt;T&gt;` and `Array&lt;T&gt;` are noncopyable. Copying the pointer and metadata would create two values that believe they own the same allocation.

Instead, one array owns one buffer. Its tear path destroys initialized elements as required and frees the backing allocation exactly once. `clear` changes the logical contents but preserves usable capacity; destruction handles the storage itself.

The distinction between length and capacity is visible in behavior without exposing representation. `reserve`, `push`, `get`, `set`, `pop`, and `clear` all maintain the same private invariants.

# [](#a-small-trusted-surface)A small trusted surface

Safe systems programming does not mean the absence of unsafe operations. Allocators and native containers eventually touch raw memory.

The useful goal is concentration: a small implementation carries the proof obligation, while every ordinary user works through checked operations. Flecha's visible `unsafe` blocks make that trusted surface easy to find during review.

# [](#conclusion)Conclusion

The generic array demonstrates several Flecha decisions working together: compile-time specialization, semantic defaults, explicit errors, deterministic teardown, private fields, and a narrow unsafe boundary.

The result is wonderfully ordinary to use. That ordinariness is earned by keeping the difficult memory work behind one carefully checked interface.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
