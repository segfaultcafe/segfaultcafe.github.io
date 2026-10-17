---
title: "Flecha Dev Log #14: Fixed Arrays, Bounds, and Iteration"
date: 2025-06-19
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha can also describe contiguous data whose size is part of the type.

Fixed arrays combine checked indexing, array borrowing, range iteration, counted loops, and postfix increment. Several language rules must agree: layout, initialization, copying, evaluation order, bounds, borrowing, and loop control.

# [](#length-is-part-of-the-type)Length is part of the type

`[N]T` contains exactly `N` inline elements:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[4]u8 values = [10, 20, 30, 40];
[4]u8 zeros = none;
[4]u8 repeated = [7; 4];
inferred := [1, 2, 3];
[0]u8 empty = [];
[2][3]u8 grid = [[1, 2, 3], [4, 5, 6]];</code></pre></div></div>

`[4]u8` and `[5]u8` are different types. Constructing either allocates no separate heap buffer.

List initializers must provide exactly the expected number of elements. Missing values are not silently zero-filled. `none` is how a programmer explicitly requests recursive zero initialization.

A repeat initializer evaluates its value once and copies the result, even for a zero count. List elements evaluate once each from left to right.

# [](#copies-own-their-inline-storage)Copies own their inline storage

Assignment, parameters, and returns copy fixed-array values:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[2]u8 changed([2]u8 value) {
    value[0] = 42;
    return value;
}

i32 main() {
    original := [1, 2];
    copy := original;
    copy[0] = 42;
    return original[0] as i32;
}</code></pre></div></div>

Changing the copy does not change the source. Nested arrays copy recursively. Raw-pointer elements copy addresses without acquiring ownership of their pointees.

Owning and borrowed element types were excluded until their destruction and lifetime rules could be represented soundly.

# [](#bounds-before-addresses)Bounds before addresses

`values.len()` returns `usize`. An index must also be `usize`; integer literals adopt that context, while already typed integers need an explicit cast.

Known-invalid constant indices are compile-time errors. Dynamic indices receive a runtime check before address calculation or access.

That ordering matters. The compiler must not derive an invalid out-of-bounds pointer and only then decide not to dereference it.

Invalid dynamic access traps. Unsafe blocks do not disable the check. Unchecked indexing was not introduced accidentally through a broader unsafe permission.

For a store, Flecha captures the receiver, evaluates the index once, finishes bounds checking, and only then evaluates the right-hand side. Side effects therefore have a specified order.

# [](#borrowing-is-conservative)Borrowing is conservative

Arrays integrate with checked references:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[3]u8 values = [1, 2, 3];
element := &amp;values[1];
*element = 42;</code></pre></div></div>

The first implementation treats the entire root array as one borrow region. Even two different element indices are not assumed disjoint.

That rejects some safe programs, but it avoids depending on index reasoning the compiler does not yet perform. Shared element borrows can coexist; overlapping mutable possibilities cannot.

Delayed initialization also operates on the whole array. Assigning every element individually does not yet prove the aggregate initialized.

# [](#two-kinds-of-loop)Two kinds of loop

Range iteration makes read-oriented traversal concise:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">for (index, value) := range values {
    stdoutln(index);
    stdoutln(value);
}

for (_, value) := range values {
    stdoutln(value);
}</code></pre></div></div>

The array expression evaluates once and is copied into a private snapshot. Each value binding is another copy. Mutating the original array does not change that snapshot.

To mutate the original, use indexing through a counted loop:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">loop usize index = 0; index &lt; values.len(); index++ {
    if index == 1 {
        proceed;
    }
    values[index]++;
}</code></pre></div></div>

`proceed` executes the update before testing the condition again. `break` exits without it. The target location of `++` evaluates once and the expression yields its previous value.

# [](#implementation-shape)Implementation shape

The parser normalizes counted loops into a scoped initializer plus a while-like node with a separate update. Range nodes retain enough source metadata for good diagnostics while introducing compiler-only snapshot and cursor bindings.

Arrays lower to LLVM array values and native addresses. Repeat initialization uses a counted loop rather than expanding the initializer once per element.

Again, source convenience was lowered into a smaller backend vocabulary.

# [](#conclusion)Conclusion

Fixed arrays give Flecha contiguous inline storage, predictable layout, value copies, checked access, safe borrowing, and practical loops.

<a href="/">Go back</a>
