---
title: "Flecha Dev Log #10: Definite Assignment and a Memory Model"
date: 2025-04-08
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha values had become more interesting. Scalars could wait for a later assignment. Owning strings needed cleanup. Branches, loops, short-circuit operators, `break`, `proceed`, and `jumpto` could all change which statements actually ran.

A local check such as “did we see an assignment above this line?” was no longer enough.

Definite-assignment analysis follows reachable control flow, while the memory model separates storage, ownership, and access.

# [](#uninitialized-is-not-zero)Uninitialized is not zero

Flecha permits an explicit typed declaration without an initializer:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 answer;
string message;

answer = 42;
message = "ready";</code></pre></div></div>

This does not request a zero value. It creates a variable that cannot be read until every reachable path has assigned it.

`none` is different:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 pending;
i32 zero = none;</code></pre></div></div>

`pending` has no readable value yet. `zero` is initialized to its type's defined zero value. Keeping those states distinct avoids hiding initialization behind a storage detail.

Inferred declarations still require an initializer because there is no value from which to infer their type.

# [](#every-reachable-path)Every reachable path

This function is valid:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 choose(bool condition) {
    i32 value;

    if condition {
        return 0;
    } else {
        value = 42;
    }

    return value;
}</code></pre></div></div>

The branch that reaches the final return assigned `value`. The other branch terminated, so it contributes no fallthrough state.

At a control-flow join, the analysis marks a variable initialized only when it is initialized on every reachable predecessor. Parameters begin initialized. Each declaration starts a fresh state. Symbols—not textual names—identify variables, so shadowed declarations remain independent.

The compiler builds a control-flow graph and uses a worklist until the initialization facts stop changing. Diagnostics are emitted after convergence in source order, once per offending read.

# [](#loops-are-conservative)Loops are conservative

An assignment inside a loop does not normally initialize a value after the loop:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 value;

while condition {
    value = 42;
}

// stdoutln(value); // may be uninitialized</code></pre></div></div>

The loop may execute zero times. Even if the condition is literally `true`, this pass does not perform constant folding. Its job is control-flow initialization, not proving every fact in the program.

`and` and `or` also create conditional edges because their right side may not execute. Integer bitwise operations evaluate both sides and therefore follow ordinary expression order.

`proceed` targets the innermost loop condition, `break` targets its exit, and an `also` clause runs only after normal body completion. These are language rules translated into graph edges.

# [](#jumps-make-it-real)Jumps make it real

Flecha's named positions and `jumpto` made a simple tree walk impossible:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">while run {
    jumpto use;
    i32 value = 42;

    #use
    stdoutln(value);
}</code></pre></div></div>

The jump skips the initializer, so the read is rejected. Forward and backward jumps connect directly to their resolved positions. Leaving a scope removes its locals from the initialization state; jumping backward cannot resurrect an earlier activation's value.

Unreachable reads do not produce definite-assignment errors, although ordinary name resolution and type checking still apply to unreachable source. Each analysis keeps one responsibility.

# [](#cleanup-needs-control-flow-too)Cleanup needs control flow too

Owning strings added another dimension. A jump can skip a declaration, revisit a scope, or exit after a temporary has been created.

String slots begin in a null-storage state so cleanup remains safe even when execution skips their declaration. Code generation cleans every owning slot that may be live on an outgoing edge. Transfers clear the source storage, preventing a later cleanup from freeing the same allocation twice.

This was a valuable discovery: definite assignment answers whether a read is legal, but destruction also needs to know whether an owning slot currently contains a resource.

The two analyses are related. They are not interchangeable.

# [](#writing-the-memory-model-down)Writing the memory model down

Once control flow, initialization, and cleanup met, we paused to document the larger direction before adding pointers, references, arrays, slices, and general ownership.

The memory-model draft separated three concepts that are often mixed together:

- **storage**: where bytes live;
- **ownership**: who must release a resource;
- **access**: who may read or modify the value.

A stack variable can own a heap allocation. A raw pointer can point into stack, heap, static, or external storage without owning any of it. A view can access storage without extending its lifetime.

This separation gave future features a vocabulary precise enough to disagree with.

# [](#implemented-rules-and-proposals)Implemented rules and proposals

The document was intentionally labeled a design draft. Definite assignment and existing string cleanup described implemented behavior. Move-by-default ownership, raw allocation tracking, `defer`, checked references, arrays, and slices were proposals and an implementation order.

Several decisions were already firm:

- unsafe operations would remain explicit;
- an `unsafe` block would not disable type checking, initialization checks, or ordinary bounds checks;
- raw pointers would not imply ownership or automatic cleanup;
- safe references would borrow storage rather than allocate it;
- deterministic destruction would cover every scope-exit edge;
- fixed-size arrays would store elements inline;
- slices would be non-owning pointer-and-length views;
- allocation failure would be explicit instead of crossing the runtime ABI as a C++ exception.

Most importantly, we wrote down what was still unresolved. A design document should not disguise an open problem as an implementation guarantee.

# [](#conclusion)Conclusion

The first Flecha season began by asking how source code should look inside a compiler. It ends with a control-flow analysis and a written model for storage, ownership, and access.

That progression was not accidental. Memory safety cannot be bolted onto a compiler that does not already understand symbols, types, branches, lifetimes of compiler objects, and reachable paths.

Together, the vocabulary and analysis make memory rules concrete enough to implement, test, and diagnose.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
