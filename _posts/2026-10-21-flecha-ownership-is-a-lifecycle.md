---
title: "Flecha Dev Log #35: Ownership Is a Lifecycle, Not a Pointer"
date: 2026-10-21
published: true
---

# [](#intro)Introduction

Hi folks!

Can you always tell the lifetime of an object that manages memory?

In C++, that question becomes surprisingly difficult as soon as the object can be copied, moved, or destroyed. Who owns the allocation? Who may still access it? Which destructor will release it? Does a copy duplicate the resource, share it, or merely copy an address?

That problem gave us a painful amount of work in Flecha.

Copying a value does not necessarily duplicate its resource. Moving a value must not destroy the resource being transferred. A reference still existing does not prove that the memory behind it is alive. If an object owns another object on the heap, an innocent-looking assignment can become a double free, a leak, or a dangling reference.

We solved this by treating ownership as a lifecycle tracked by the compiler, not as a property we hope programmers infer from a pointer.

# [](#three-different-questions)Three different questions

Memory discussions often combine three separate ideas:

- **storage**: where the bytes live;
- **ownership**: who must release the resource;
- **access**: who may read or modify it right now.

They are not interchangeable.

A structure stored on the stack may own a buffer on the heap. A raw pointer may access that buffer without owning it. A checked reference may borrow the structure without extending its lifetime. A read-only view restricts access, but it does not keep the owner alive.

Flecha keeps those relationships separate in both the type system and the semantic analysis. That gives the compiler enough information to answer the question that matters at every exit: which live value still carries the cleanup responsibility?

# [](#the-double-owner-problem)The double-owner problem

Consider a buffer that owns heap storage:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Buffer {
    own []u8 bytes;
};

Buffer Buffer::init(own []u8 bytes) override {
    return build Buffer {
        self.bytes = bytes;
    };
}</code></pre></div></div>

`own []u8` is a runtime-sized, compiler-managed buffer. It releases its allocation automatically when its live owner leaves scope.

Now imagine that ordinary assignment copied `Buffer` bit for bit:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">second := first;</code></pre></div></div>

Both values would contain the same address and length. If both believed they owned the allocation, both would release it. If only one owned it, the language would need a hidden rule deciding which one. If they shared ownership, every copy would need reference-counting semantics whether the program wanted them or not.

Flecha chooses none of those implicit answers.

Because `Buffer` contains a move-only owner, `Buffer` is move-only too. The assignment transfers the complete value and its cleanup responsibility to `second`. `first` becomes unavailable until it receives a new value.

# [](#a-move-transfers-the-obligation)A move transfers the obligation

Here is the complete flow:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void consume(Buffer buffer) {
    stdoutln(buffer.bytes.len());
}

void example() {
    bytes, failure := new&lt;own []u8&gt;(1024);
    if failure != none {
        return;
    }

    first := Buffer::init(bytes);
    second := first;

    // stdoutln(first.bytes.len()); // rejected: first was moved
    consume(second);
}</code></pre></div></div>

Creating `first` moves `bytes` into the structure. Creating `second` moves the whole structure. Passing `second` by value moves it into `consume`.

No move releases the buffer early. Each move transfers one cleanup obligation. Only the final live owner performs destruction.

This is an important distinction: a moved-from value is not an object whose resource was destroyed. It is storage that no longer contains a usable owning value. The compiler tracks that state and rejects reads, borrows, and second moves until the binding is reinitialized.

The rule applies transitively. A tuple, fixed array, or structure containing a move-only value becomes move-only as a whole. Flecha does not currently allow arbitrary partial moves, because removing one field would leave an aggregate whose destruction state is much harder to prove.

# [](#borrows-must-end-before-the-owner-moves)Borrows must end before the owner moves

Movement alone is not enough. We also have to protect references and slices into the owned storage:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">buffer := Buffer::init(bytes);
view := buffer.bytes[:];

stdoutln(view[0]);
moved := buffer;</code></pre></div></div>

This is valid because `view` is last used before `buffer` moves.

Reverse the final two operations and the compiler rejects the move. The slice would still borrow storage whose owner was being transferred. Destroying or replacing `buffer` while `view` is live is rejected for the same reason.

A reference is therefore more than an address in semantic analysis. It carries an origin, an access mode, and a last possible use. At runtime it still lowers to an ordinary native address; there is no hidden reference counter or lifetime object.

This is how Flecha prevents the misleading situation where a reference still exists but the memory it points to has already disappeared.

# [](#copying-requires-a-real-copy)Copying requires a real copy

Some values should be copyable. Scalars copy naturally. Fixed arrays copy when all their elements are copyable. Owning strings create independent storage under their existing value semantics.

A resource-owning type does not receive that behavior by accident.

If two buffers must become independent owners, the type should expose an explicit operation that allocates new storage and copies the elements. That operation may fail, so its API can return an error honestly. Calling it `clone`, `duplicate`, or something domain-specific makes the cost and the new ownership visible at the call site.

The compiler never turns a copied address into a second owner. A raw pointer remains a non-owning address unless an explicit `own` contract transfers a tracked allocation. A `lend` contract permits temporary access without transferring cleanup responsibility.

That distinction lets APIs say exactly what happens:

```text
copy    -> produce an independent value when the type defines real copy semantics
move    -> transfer the existing value and its cleanup obligation
borrow  -> permit access without transferring or extending ownership
destroy -> release the resource held by the final live owner
```

# [](#destruction-is-deterministic)Destruction is deterministic

Every live owned resource has exactly one cleanup path.

Flecha destroys values on ordinary fallthrough and on control-flow exits such as `return`, `break`, `proceed`, and outward `jumpto`. Structures destroy their fields in reverse order. A custom safe `tear` hook makes a structure noncopyable but still movable as a complete value. An unsafe, address-sensitive `tear` makes it immovable, so it must stay in its final storage and be borrowed instead.

Moving a value disables cleanup for the source and enables it for the destination. Replacing an owner evaluates the new value before releasing the old one. Direct self-move is rejected. Control-flow joins retain the conservative state: if a value may have moved on one incoming path, code cannot pretend it definitely still owns a resource.

These rules are compile-time bookkeeping. They do not require a garbage collector, a runtime ownership graph, or reference counting.

# [](#why-not-a-smart-pointer-menu)Why not a smart-pointer menu?

C++ exposes several useful ownership strategies through `unique_ptr`, `shared_ptr`, and `weak_ptr`. They solve real problems, but choosing among them often becomes part of every interface, container, and object graph.

Flecha starts from a smaller default model:

- one value owns a resource;
- complete owners move instead of being implicitly duplicated;
- checked references and slices borrow without owning;
- a real copy must create an independent value;
- shared ownership is not silently introduced.

Raw memory still exists for allocators, runtimes, and foreign interfaces, but `own` and `lend` make transfers visible at those boundaries. Safe owners such as `own []T` keep the common case out of unsafe code entirely.

This does not make every ownership pattern expressible. Shared ownership, arbitrary partial moves, and some address-sensitive designs remain outside the current model. The compiler rejects patterns it cannot prove instead of guessing which destructor should win.

# [](#conclusion)Conclusion

The hard part of an owning object is not storing a pointer. It is preserving one coherent story across copying, movement, borrowing, replacement, control flow, and destruction.

Flecha's answer is to make that story explicit. Copyable values produce independent values. Move-only owners transfer one cleanup obligation. Borrows retain the origin that must stay alive. Deterministic destruction releases the resource exactly once.

The result feels simpler at the use site because the difficult question—“who owns this memory now?”—has one answer the compiler can verify.

I hope this example made the model clearer. As always, don't forget to do your **research!**

<a href="/">Go back</a>
