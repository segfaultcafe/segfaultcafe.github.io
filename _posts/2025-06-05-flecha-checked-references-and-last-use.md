---
title: "Flecha Dev Log #13: Checked References and Last-Use Borrowing"
date: 2025-06-05
published: true
---

# [](#intro)Introduction

Hi folks!

Raw pointers gave Flecha unrestricted low-level access inside explicit unsafe regions. They also made the cost of that freedom clear: the compiler could not prove the pointee was live, non-null, or exclusively accessed.

For ordinary stack storage, we wanted a different tool.

Checked references combine handle movement, reborrowing, conflict detection, and a shared control-flow graph for both definite assignment and borrow analysis.

# [](#a-reference-borrows-storage)A reference borrows storage

A checked reference is created with `&` and accessed with `*`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void double_value(&amp;u8 value) {
    *value = *value * 2;
}

i32 main() {
    u8 value = 3;
    reference := &amp;value;
    double_value(reference);
    return value as i32;
}</code></pre></div></div>

The reference does not allocate, own, or extend the lifetime of `value`. It is non-null by construction and may only be created from initialized, addressable storage the compiler can track.

At runtime, it lowers to a native address. There is no borrow counter and no hidden heap object.

# [](#exclusive-and-shared)Exclusive and shared

`&T` is an exclusive, writable borrow. `&const T` is a shared, read-only borrow.

While an exclusive borrow is live, conflicting reads, writes, moves, and borrows of the owner are rejected. Shared borrows can coexist with reads and other shared borrows, but block mutation.

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">u8 value = 3;
mutable := &amp;value;
*mutable = 4;

shared := &amp;value;
copy := shared;
if *copy == *shared {
    stdoutln(value);
}</code></pre></div></div>

The accesses above occur in sequence. The compiler uses last possible use, not merely lexical scope, to end the earlier mutable loan before the shared one begins.

That made programs less ceremonial without weakening the rule.

# [](#mutable-handles-move)Mutable handles move

Copying an exclusive handle would create two independently usable paths to writable storage. Flecha therefore moves mutable reference handles:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">u8 value = 3;
first := &amp;value;
second := first;

// *first = 4; // rejected: first was moved
*second = 4;

first = &amp;value; // usable again after rebinding</code></pre></div></div>

Shared handles copy because they cannot mutate the target. A fixed mutable handle cannot move; code must explicitly reborrow it instead.

Function calls reborrow their reference arguments for the duration of the call. Passing `second` to a function does not permanently move it away from the caller.

# [](#reborrowing-freezes-the-parent)Reborrowing freezes the parent

`child := &*parent` creates a child borrow through an existing reference.

While a mutable child is live, the parent cannot access the target. Any live child prevents moving or rebinding the parent handle, because the child's origin depends on it.

After the child's last possible use, the parent becomes available again.

This is where “last use” becomes more than a convenience. It is the point at which a proof obligation ends and previously excluded access becomes safe again.

# [](#one-control-flow-graph)One control-flow graph

The first definite-assignment implementation had already shown that branches, loops, short-circuit expressions, `break`, `proceed`, and `jumpto` could not be analyzed reliably with isolated tree walks.

Reference work extracted a shared control-flow graph.

Backward liveness finds each handle's last possible use. A forward may-analysis tracks possible borrow origins and moved states across reachable paths. If a handle may have moved on any incoming path, using it is rejected.

Unreachable code contributes no borrow effects. Reexecuting a declaration cannot reset storage that remains borrowed from an earlier loop path.

# [](#conservative-by-design)Conservative by design

This first version borrowed whole owners and used lexical lifetime containment for assignments between handles. It did not correlate arbitrary condition values to prove a path impossible.

References could not be returned or stored in escaping locations. Even cases a human could justify were rejected until the language had a function-level lifetime contract.

Safe references also could not be manufactured from raw-pointer dereferences. An unsafe block may promise pointer validity for one access, but that does not give the compiler a durable origin for a safe borrow.

These rejections kept the guarantee honest.

# [](#conclusion)Conclusion

Checked references transform local address-taking from a programmer promise into a compile-time proof.

The implementation connected type qualifiers, definite assignment, liveness, movement, reborrowing, and control flow—all while lowering to an ordinary address.

The same model scales beyond scalars because references retain their origin, access mode, movement state, and last possible use.

<a href="/">Go back</a>
