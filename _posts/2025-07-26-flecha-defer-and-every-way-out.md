---
title: "Flecha Dev Log #16: Defer and Every Way Out of a Scope"
date: 2025-07-26
published: true
---

# [](#intro)Introduction

Hi folks!

Resource cleanup is easy when a function has one exit at the bottom. Flecha had returns, nested blocks, loops, `break`, `proceed`, and named jumps.

We wanted a way to register cleanup beside the operation that needed it and trust the compiler to execute it on every ordinary path out.

Deferred direct calls combine precise capture rules, borrow integration, and cleanup blocks for all scope-exit edges.

# [](#capture-now-call-later)Capture now, call later

`defer` accepts a direct function call:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void report(i32 value) {
    stdoutln(value);
}

i32 main() {
    i32 value = 10;
    defer report(value);
    value = 20;
    return 42;
}</code></pre></div></div>

The program prints `10`.

Arguments evaluate once, left to right, when execution reaches the defer statement. Their side effects happen immediately. The outer function call waits until the current lexical scope exits.

That decision avoids a dangerous ambiguity. “Run this expression later” would allow every referenced local to change—or disappear—before evaluation. Flecha instead captures concrete argument values now.

# [](#reverse-order-per-scope)Reverse order per scope

Each scope executes deferred calls in reverse registration order:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">{
    defer report(1);
    defer report(2);
} // prints 2, then 1</code></pre></div></div>

Inner scopes drain before outer scopes. Registration occurs only if execution reaches the statement, and a loop may register the same call site multiple times.

This gives cleanup the familiar stack discipline: the newest acquired responsibility is handled first.

# [](#different-values-need-different-captures)Different values need different captures

Scalars, raw pointers, and fixed arrays capture their current values.

Owning strings and string views receive independent owned byte snapshots. That capture can allocate, but it prevents a deferred view from depending on a string that changes or dies before the call.

References and slices cannot be copied into ownership. They capture borrowed handles, so their loans stay active until the scope exit executes the deferred call.

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void set(&amp;i32 target) {
    *target = 42;
}

i32 main() {
    i32 answer = 0;
    {
        defer set(&amp;answer);
    }
    return answer;
}</code></pre></div></div>

The exclusive borrow prevents conflicting access while the call is pending and ends when the block drains its defer stack.

# [](#every-ordinary-exit)Every ordinary exit

Deferred calls run on:

- normal fallthrough;
- `return`;
- `break`;
- `proceed`;
- `jumpto` edges leaving the scope.

A return expression evaluates before cleanup. Deferred code cannot change the value already selected for return.

In a counted loop, the body scope cleans up before the update expression runs, including when `proceed` is used. A jump that stays inside the same scope keeps pending registrations; a backward jump can add another one.

Traps and immediate process termination do not unwind. If argument evaluation traps, the call is never registered. If one deferred callee traps, later pending calls do not execute. Flecha did not quietly introduce exceptions through cleanup.

# [](#defer-is-not-ownership)Defer is not ownership

Raw pointers retain their unsafe obligations. `defer free(pointer)` could eventually be a convenient cleanup, but defer alone did not prove that the pointer came from an allocation, that it was still live, or that another free was not pending.

Scheduling a call and proving resource ownership are different problems.

This separation kept defer generally useful while leaving allocation tracking to a dedicated analysis.

# [](#how-it-lowers)How it lowers

Each active scope receives a linked stack of captured call records. Registration records are allocated in function stack storage and tagged by call site. Scope-exit cleanup blocks drain them in reverse order and restore the previous stack.

The queue itself requires no heap allocator. Repeated registration does consume stack proportional to the number and size of pending captures, so an unbounded loop can exhaust the stack.

The control-flow graph records argument evaluation at registration. Synthetic capture symbols preserve borrow origins until the matching exit edge. LLVM cleanup blocks handle non-local jumps between scopes.

# [](#conclusion)Conclusion

`defer` looks like one keyword. Its behavior requires defined capture timing, value-specific snapshot rules, borrow lifetimes, loop behavior, jump behavior, destruction ordering, and a no-unwind trap policy.

That is exactly why language features are so interesting: the syntax is usually the smallest part.

<a href="/">Go back</a>
