---
title: "Flecha Dev Log #19: Structures and Deterministic Lifecycle"
date: 2025-09-07
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha had arrays and tuples, but both were structural aggregates. We still needed nominal types: values whose identity comes from a declaration and whose fields, methods, privacy, construction, and destruction form one coherent contract.

Structures combine out-of-line methods, explicit receivers, `build`, generated and overridden lifecycle methods, privacy, recursive cleanup, and stable storage for immovable values.

# [](#data-first)Data first

A structure declares inline fields:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Box {
    i32 x;
    private {
        i32 y;
        bool ready;
    }
};</code></pre></div></div>

Fields and methods are public by default. Private members are accessible only inside methods belonging to the structure, including through another instance of the same type.

Structures are nominal. Two declarations with identical fields are still different types.

# [](#methods-have-explicit-receivers)Methods have explicit receivers

Behavior is defined out of line:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">private i32 Box::hidden(&amp;const self) {
    return self-&gt;y;
}

i32 Box::value(&amp;const self) {
    return self-&gt;x + self-&gt;hidden();
}

void Box::setY(&amp;self, i32 value) {
    self-&gt;y = value;
}</code></pre></div></div>

The receiver signature says whether the method reads, mutates, or uses a raw pointer. Structure values use `.`; references and pointers use `->`.

Reference receivers participate in checked borrowing. Their implicit borrow lasts through argument evaluation and the call. A raw receiver requires unsafe permission. There is no implicit conversion between the two models.

# [](#build-initializes-one-value)Build initializes one value

Every structure gets a generated zero-argument `init`. A user can replace it with an override:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">Box Box::init(i32 x, i32 y) override {
    return build Box {
        self.x = x;
        self.y = y;
        self.ready = true;
    };
}</code></pre></div></div>

`build` first initializes fields in declaration order, then runs its block with a value named `self`. It does not recursively call the structure's own initializer.

Field defaults are reevaluated for each construction. Scalars and errors receive defined zero values when no explicit default exists; pointers become null; strings become empty; nested structures invoke their initializer.

The unfinished whole `self` cannot be copied, passed, returned early, or used for method calls. Flecha did not implement partial construction and unwinding, so build blocks reject control flow that could escape midway.

# [](#tear-is-compiler-invoked)Tear is compiler-invoked

Every structure also has an implicit empty `tear` hook. A custom hook runs before fields are destroyed:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void Box::tear(&amp;self) override {
    stdoutln("releasing Box");
}</code></pre></div></div>

User code cannot call `tear` directly. Cleanup invokes it, then destroys fields in reverse declaration order. Arrays and tuples recursively destroy their elements in reverse.

Deferred calls run before owned values are destroyed in the same scope. Cleanup covers fallthrough, return, break, proceed, and outward jumps. Runtime traps still do not unwind.

# [](#copyability-follows-lifecycle)Copyability follows lifecycle

A structure using only the generated tear and copyable fields can be copied, assigned, passed, returned, and captured by defer. Owning string fields are deep-copied.

A custom tear makes the structure noncopyable in this milestone. The compiler cannot duplicate a resource-owning cleanup contract without explicit copy semantics.

An unsafe tear makes the type immovable as well. Fresh construction occurs directly in final storage so the address remains stable until cleanup. Creating such a value requires unsafe permission because the language is trusting its teardown's raw-memory obligations.

These restrictions propagate through containing arrays and tuples.

# [](#native-representation)Native representation

Structures lower to named, non-packed LLVM structs with fields in declaration order.

Results containing structures use caller-provided output storage. This avoids relocating immovable values during return. The convention is internal to Flecha and not a promise of C aggregate ABI compatibility.

Again, the implementation offered useful native behavior without prematurely freezing a public ABI.

# [](#conclusion)Conclusion

Structures pull together nominal types, visibility, checked receivers, unsafe receivers, default initialization, ownership, defer ordering, deterministic destruction, aggregate layout, and native calls.

<a href="/">Go back</a>
