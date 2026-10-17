---
title: "Flecha Dev Log #15: Slices as Checked Views"
date: 2025-07-09
published: true
---

# [](#intro)Introduction

Hi folks!

Fixed arrays gave Flecha inline contiguous storage, but their length was part of the type. A function accepting `[4]i32` could not also accept `[40]i32`.

We needed a view whose length was known at runtime without giving up bounds or lifetime checks.

Checked slices are non-owning address-and-length values connected to the borrow checker.

# [](#creating-a-slice)Creating a slice

A slice borrows a half-open range:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[5]i32 values = [10, 20, 30, 40, 50];

[]i32 middle = values[1:4];
whole := values[:];
tail := values[1:];
head := values[:2];</code></pre></div></div>

`values[1:4]` contains indices 1, 2, and 3. Omitted lower and upper bounds become zero and the receiver length.

The slice stores an address and a `usize` length. It has no capacity, allocation, ownership, or destructor. The original array still owns every element.

There is no implicit array-to-slice conversion. A call passes `values[:]`, making the borrow visible at the call site.

# [](#access-and-bounds)Access and bounds

Slices support `len()`, checked indexing, `front()`, and `back()`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">middle.front() = 21;
middle.back()++;

first := &amp;middle[0];
*first = 22;</code></pre></div></div>

`front()` and `back()` produce element locations, not hidden reference values. Reading copies the element; writing works when the slice is mutable; `&` explicitly borrows the location.

Slicing checks `start <= end <= length`. Indexing checks `index < length`. Static invalid bounds are compiler errors; dynamic failures trap before pointer arithmetic.

Empty slices are valid and still carry their owner's lifetime. Accessing an element of one is not.

# [](#three-different-consts)Three different consts

The recursive qualifier model became immediately useful:

- `[]T` is a rebindable mutable slice;
- `[]const T` is a rebindable read-only slice;
- `const []T` is a fixed slice handle with mutable elements.

A const array produces a read-only slice. Writable storage can also be intentionally borrowed as shared:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[]const i32 shared = values[:];</code></pre></div></div>

Constness of the handle and constness of the elements remain separate questions.

# [](#slice-handles-follow-reference-rules)Slice handles follow reference rules

Mutable slice handles move on assignment. Shared slice handles copy. Function arguments reborrow for the call, preserving the caller's handle:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void increment([]i32 values) {
    loop usize i = 0; i &lt; values.len(); i++ {
        values[i]++;
    }
}

i32 sum([]const i32 values) {
    i32 total = 0;
    for (_, value) := range values {
        total = total + value;
    }
    return total;
}</code></pre></div></div>

The checker conservatively treats the entire backing array as one borrow region. It does not yet prove two ranges disjoint.

Subslices and element references keep their parent borrow alive. Their last use releases the restrictions just as it does for checked references.

# [](#iteration-without-copying-elements)Iteration without copying elements

Fixed-array range iteration snapshots the entire array. Slice iteration instead copies only the descriptor and takes a shared reborrow for the loop.

Each element binding is still a value copy, but the backing elements are not duplicated as a collection. The shared loop borrow prevents mutation underneath iteration.

That difference follows ownership. An array expression is a value containing its storage. A slice is already a borrowed view of storage elsewhere.

# [](#the-first-boundary)The first boundary

Slices could be passed into functions and reborrowed locally. They could not be returned.

Returning a slice requires the caller to know which input storage remains borrowed and for how long. Without that function contract, the safe behavior is to reject the escape.

This is not a missing runtime representation. Address plus length is already complete. The missing piece is compile-time lifetime information.

# [](#conclusion)Conclusion

Slices make one function work across many array lengths without allocating or abandoning safety.

They also demonstrated how earlier decisions composed: recursive const qualifiers, checked references, last-use analysis, runtime bounds checks, and target-sized lengths all became part of one small value.

They demonstrate how recursive const qualifiers, checked references, last-use analysis, runtime bounds checks, and target-sized lengths compose in one small value.

<a href="/">Go back</a>
