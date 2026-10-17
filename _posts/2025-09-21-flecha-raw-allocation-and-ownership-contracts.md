---
title: "Flecha Dev Log #20: Raw Allocation and Ownership Contracts"
date: 2025-09-21
published: true
---

# [](#intro)Introduction

Hi folks!

Raw pointers could address memory, defer could schedule cleanup, tuples could return multiple values, errors could describe failure, and structures knew how to tear themselves down.

The pieces were ready for explicit heap allocation.

`new`, `free`, mandatory allocation analysis, and the `own` and `lend` contracts make cleanup responsibility explicit across function and structure boundaries.

# [](#allocation-returns-two-things)Allocation returns two things

`new<T>(value)` returns a raw pointer and generic error:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">unsafe {
    (*u8 pointer, error err) = new&lt;u8&gt;(42);
    if err != none {
        return 1;
    }

    defer free(pointer);
    *pointer = 43;
}</code></pre></div></div>

Success produces a non-null pointer and `none`. Failure produces null and `AllocationError.OutOfMemory`.

The compiler calculates the native size and alignment for `T`. The runtime obtains zeroed, correctly aligned storage. On success, the initializer evaluates once and constructs directly into that final address.

On allocation failure, the initializer does not run. Constructors are not called, assignments inside it do not happen, and there is nothing to tear down.

That failure path had to be visible to definite-assignment and borrow analysis.

# [](#free-knows-the-pointee-type)Free knows the pointee type

`free(pointer)` evaluates the pointer once. For a non-null pointer, it runs the structure tear hook, recursively destroys owned fields and elements, then releases the backing storage.

`free(null)` is a no-op. A pointer to const may still be freed because read-only access does not erase ownership responsibility.

Void pointers cannot use this typed free operation: the compiler needs the original pointee type to run destruction correctly.

Stack addresses, interior addresses, foreign allocations, mismatched types, and already-freed pointers are invalid inputs.

# [](#unsafe-is-still-checked)Unsafe is still checked

Allocation and free require unsafe permission, but the compiler does not stop there.

After type checking, definite assignment, and borrow checking, Flecha runs mandatory allocation analysis before lowering. It tracks allocation identities through local aliases, tuple destructuring, immutable aggregate snapshots, reference-mediated pointer assignment, branches, loops, `also`, jumps, calls, and deferred cleanups.

It rejects:

- losing the last tracked handle or leaving a live allocation behind;
- freeing one allocation twice through different aliases;
- using a pointer after a tracked free;
- dereferencing the known-null failure result;
- freeing known stack or interior storage;
- ownership flows the current checker cannot represent.

These are errors, not optional warnings. Rejected programs produce no object file.

# [](#defer-reserves-cleanup)Defer reserves cleanup

`defer free(pointer)` captures the pointer now and schedules the release for scope exit.

The allocation remains live until then, but its cleanup obligation is reserved. An explicit free or conflicting ownership transfer before the deferred call executes is rejected.

Rebinding the original variable does not change the captured allocation:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">another, failure := new&lt;u8&gt;(1);
defer free(another);
another = null;</code></pre></div></div>

The deferred snapshot still releases the allocated byte.

# [](#own-and-lend)Own and lend

Interpreting every helper body can only go so far, especially for recursion and separately reasoned APIs. Flecha added explicit raw-pointer ownership contracts:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">unsafe void release(own *i32 pointer) {
    free(pointer);
}

unsafe i32 read(lend *const i32 pointer) {
    if pointer == null {
        return 0;
    }
    return *pointer;
}

unsafe (own *i32, error) create() {
    return new&lt;i32&gt;(42);
}</code></pre></div></div>

`lend` permits access during the call but forbids freeing, consuming, returning, or retaining the allocation.

`own` transfers cleanup responsibility unconditionally at the call boundary. Every normal callee exit must free it, forward it to another owner, store it in an owning field, or return it as an owning result.

Transfer does not write null into old aliases at runtime, but the checker makes those aliases unavailable for later access or cleanup.

# [](#ownership-inside-structures)Ownership inside structures

Structures can declare owning raw-pointer fields:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Box {
    own *i32 value;
};

unsafe Box Box::init(own *i32 value) override {
    return build Box {
        self.value = value;
    };
}

unsafe void Box::tear(&amp;self) override {
    free(self-&gt;value);
}</code></pre></div></div>

An owning field requires an explicit tear, and the compiler independently verifies that all normal tear exits discharge the field.

Other methods receive only lent access to it. Extraction, replacement of a live owning field, and arbitrary external access remained restricted until their state transitions could be modeled.

# [](#conservative-limits)Conservative limits

This checker does not make arbitrary unsafe code memory-safe.

External pointer validity, raw aliasing, nullability, and stack lifetimes remain caller obligations. Dynamic containers of owning pointers, unannotated recursive effects, and ownership patterns outside the current state model are rejected.

The analysis also uses explicit state budgets. Exceeding them is a compiler error rather than silent acceptance. Complex valid code may need simpler control flow or declared contracts.

That tradeoff was intentional: when ownership cannot be verified, Flecha says so before native code exists.

# [](#conclusion)Conclusion

Raw allocation completed a long chain of prerequisites. It depended on unsafe permission, tuples, errors, defer, typed destruction, control-flow graphs, and structure lifecycle rules.

Ownership contracts then made cleanup responsibility visible at API boundaries without changing the pointer's runtime representation.

The model moves from “the programmer must remember to free this” to “the compiler requires a complete ownership path before code generation.” It remains conservative and explicitly unsafe, but cleanup responsibility is visible and mechanically checked.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
