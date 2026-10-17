---
title: "Flecha Dev Log #4: Speaking LLVM for the First Time"
date: 2024-07-12
published: true
---

# [](#intro)Introduction

Hi folks!

We had source code, an AST, semantic analysis, and a typed bound IR. Every stage ended with a representation designed for the stage after it.

Now we wanted proof that the architecture could leave the compiler and become executable behavior.

The LLVM backend proves the architecture end to end: Flecha code becomes LLVM IR, passes LLVM's verifier, and executes with the expected result.

# [](#the-first-complete-path)The first complete path

The example was small:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 add(i32 left, i32 right) {
    return left + right;
}

i32 main() {
    x := 21;
    y := 22;
    return add(x, y);
}</code></pre></div></div>

Yes, it returns `43`; the surrounding proof target was later adjusted while the backend workflow settled. The valuable part was the path:

```text
source
  → tokens
  → AST
  → semantic model
  → bound IR
  → LLVM module
```

The compiler driver gained `--emit-llvm`, which made the generated IR observable:

```bash
build/flecha --emit-llvm examples/llvm_poc.fl -o build/llvm_poc.ll
```

Observability mattered. LLVM IR became another boundary we could inspect rather than a black box hidden behind “compile.”

# [](#the-backend-does-less)The backend does less

The LLVM generator consumes only the bound program. It does not read syntax nodes, walk scopes, perform name lookup, or infer types.

That limitation is a feature.

Every function is declared in LLVM before any function body is emitted. A call can therefore target a function appearing later in the Flecha file without depending on emission order. Locals become stack allocations with explicit loads and stores. Arithmetic selects instructions using types the semantic analyzer already resolved.

For unsupported types, code generation fails with a message. It does not invent a representation or emit invalid IR and hope LLVM explains the damage.

# [](#control-flow-is-values-and-blocks)Control flow is values and blocks

Conditionals become LLVM basic blocks and branches. Boolean `and` and `or` require special care because Flecha promises short-circuit evaluation:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">if ready and check() {
    return 42;
}</code></pre></div></div>

`check()` must not execute when `ready` is false. The backend therefore emits branches and joins the result with a PHI node. Integer logical operations remain ordinary bitwise operations because both operands are values, not control-flow decisions.

That distinction is exactly why semantic types and bound operations must reach the backend intact. The token `and` alone is not enough information.

# [](#verify-every-module)Verify every module

LLVM can represent malformed IR in memory while it is being constructed. We chose to run LLVM's verifier on every completed module before returning it.

This creates a powerful invariant: if code generation reports success, the module is structurally valid according to LLVM. A missing terminator, mismatched type, or invalid PHI edge becomes a compiler failure close to its cause.

The proof-of-concept supported primitive integers, floats, booleans, characters, functions, parameters, stack locals, assignments, calls, returns, and conditional control flow.

It deliberately did not support strings, pointers, object emission, target layouts, optimization pipelines, or native linking yet. Naming those exclusions was part of the design. “Not implemented” is much safer than an accidental representation becoming permanent.

# [](#why-llvm)Why LLVM?

Choosing LLVM let Flecha focus on language semantics while relying on a mature optimizer and target ecosystem. But LLVM was not allowed to become the language specification.

Flecha decides what a cast means, whether evaluation short-circuits, which integer types are signed, and where runtime checks belong. LLVM receives those decisions after they have been resolved.

The backend is an implementation of Flecha's semantics, not the place where we discover them.

# [](#conclusion)Conclusion

The first emitted module changed the feeling of the project. A declaration was no longer only an AST node. A return statement could travel through every layer and become an instruction another tool could execute.

The important result is a backend with a narrow responsibility: translate a verified bound program into verified LLVM IR without redefining Flecha's semantics along the way.

<a href="/">Go back</a>
