---
title: "Flecha Dev Log #12: Making Unsafe Memory Access Visible"
date: 2025-05-23
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha could represent raw pointer types, including the difference between a fixed pointer and a read-only target. It still refused to generate code that used them.

That was the right temporary boundary. Raw pointers carry obligations the compiler cannot prove in general: validity, alignment, lifetime, initialization, and aliasing.

Raw pointers are executable only through a lexical `unsafe` boundary around operations that trust those obligations.

# [](#permission-is-lexical)Permission is lexical

Unsafe permission comes from an unsafe function or an explicit block:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">unsafe void write(constptr i32 destination, i32 value) {
    *destination = value;
}

i32 main() {
    i32 answer = 0;

    unsafe {
        *i32 pointer = &amp;raw answer;
        write(pointer, 42);
    }

    return answer;
}</code></pre></div></div>

Nested ordinary blocks inherit permission. Leaving the unsafe block restores the previous safe context.

An unsafe function may call another unsafe function directly. A safe function must enter an unsafe block before calling one. A safe callee does not inherit permission merely because its caller was unsafe.

We rejected a one-expression spelling such as `unsafe write(...)`. A block makes the trusted region easy to see and gives ordinary lexical scoping rules somewhere to operate.

# [](#raw-addresses-are-not-borrows)Raw addresses are not borrows

`&raw value` creates a raw pointer to initialized, addressable storage. It requires unsafe permission.

The operand can be a variable, a parenthesized storage location, or a pointer dereference. It cannot be a literal, computed temporary, function, or cast result.

Taking the address does not allocate and does not extend the target's lifetime. That last point is essential: the pointer may remain as bits after the object dies, but accessing through it would violate the unsafe contract.

`&value` remained reserved for checked reference creation. Entering unsafe code did not change its meaning, and raw pointers did not implicitly become references.

# [](#safe-pointer-values-unsafe-pointees)Safe pointer values, unsafe pointees

Copying, rebinding, passing, returning, and comparing initialized pointer values are ordinary typed operations. They manipulate addresses without touching the pointee.

Dereferencing is different:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">*i32 pointer = none;

unsafe {
    pointer = &amp;raw answer;
    value := *pointer;
    *pointer = value + 1;
}</code></pre></div></div>

Both reading and writing the target require unsafe permission. The assignment evaluates the target address once, then the right-hand side, then performs the store.

`null` and `none` can initialize raw pointers. A pointer declaration without an initializer remains subject to definite-assignment analysis before its address value can be read.

# [](#unsafe-does-not-turn-checks-off)Unsafe does not turn checks off

This was perhaps the most important decision in the feature.

Inside an unsafe block, Flecha still checks:

- pointer binding initialization;
- source and target types;
- fixed bindings and read-only targets;
- lexical scopes and shadowing;
- owning-string cleanup;
- ordinary control-flow rules.

Unsafe permission allows specific operations. It does not place the compiler in a “trust everything below this line” mode.

Even `*const T` remains read-only inside unsafe code. Removing a qualifier is not one of the permissions the block grants.

# [](#what-the-programmer-promises)What the programmer promises

For every dereference, the programmer must establish that the address is non-null, correctly aligned, points to live compatible storage, and contains initialized data when read.

The compiler checks the pointer binding. It does not prove those properties for arbitrary raw addresses.

Pointer arithmetic, ordering comparisons, integer-to-pointer casts, and explicit pointer reinterpretation were deliberately excluded. `*void` could carry an opaque address, but it could not be dereferenced because `void` has no readable value.

We wanted the first unsafe surface to be useful and small enough to specify completely.

# [](#native-boundary)The native boundary

Native tests connected Flecha unsafe functions to a C++ harness supplying valid storage. They covered scalar access, nested pointers, null comparisons, target evaluation order, string assignment, and cleanup across return, loop control, and jumps.

That external harness is important. Flecha cannot verify arbitrary native callers, so an unsafe function's contract crosses the language boundary too.

# [](#conclusion)Conclusion

Raw pointers give Flecha direct memory access without pretending that raw memory has become safe.

The lexical boundary made responsibility visible. The compiler continued enforcing every rule it could, while the programmer accepted the remaining pointer-validity obligations.

Most ordinary code does not need to carry all of those obligations. Checked references provide a separate model when storage and its origin are known to the compiler.

<a href="/">Go back</a>
