---
title: "Flecha Dev Log #8: Designing a Runtime ABI"
date: 2024-11-11
published: true
---

# [](#intro)Introduction

Hi folks!

A compiler can emit arithmetic and branches without much help. Printing a value is different. Formatting numbers, writing bytes, reporting runtime failures, and interacting with the operating system are services—not LLVM instructions.

We could emit calls directly to whatever C++ function is convenient. Instead, Flecha uses a small, versioned C ABI between generated programs and the runtime.

It was the first time we had to ask not only “what does Flecha mean?” but also “what binary promise connects compiled code to its runtime?”

# [](#a-versioned-boundary)A versioned boundary

Every runtime symbol received the prefix `flecha_runtime_v1_`.

```c
void flecha_runtime_v1_stdout_i32(int32_t value);
void flecha_runtime_v1_stdout_f64(double value);
void flecha_runtime_v1_stdout_bool(uint8_t value);
void flecha_runtime_v1_stdout_newline(void);
```

The public header uses fixed-width C scalars, `size_t`, pointer-sized integer types, and raw pointers. It does not expose C++ classes, standard-library objects, exceptions, or C++ name mangling.

That gives us a stable binary surface even though the compiler and runtime are implemented in C++. A breaking declaration requires a new ABI version and prefix. Adding a new version-one symbol is possible without changing existing calls.

# [](#values-cross-in-simple-pieces)Values cross in simple pieces

`stringv` is represented in generated code as a pointer and length. At the runtime boundary, it crosses as those two arguments:

```c
void flecha_runtime_v1_stdout_string_view(
    const char* data,
    size_t length
);
```

No terminating null byte is required, and the terminator is not part of the length. The runtime writes exactly the byte range Flecha passed.

This is less magical than passing a compiler-specific structure by value, and that is the point. ABI boundaries should be boring enough to inspect with ordinary platform tools.

# [](#formatting-belongs-to-the-runtime)Formatting belongs to the runtime

Flecha exposes `stdout` and `stdoutln`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    stdoutln("Flecha");
    stdoutln(32);
    stdoutln(64 as u64);
    stdoutln(1.5);
    stdoutln(true);
    stdoutln('!');
    return 42;
}</code></pre></div></div>

The compiler emits a typed runtime call for the value. `stdoutln` emits the same typed call followed by the newline function.

The runtime decides that a boolean prints as `true` or `false`, how many significant digits a float receives, and which portable integer format macro matches each width.

Keeping formatting out of LLVM lowering prevents user-facing output policy from becoming scattered across backend instruction-building code.

# [](#object-files-can-stand-alone)Object files can stand alone

Object-only compilation intentionally does not require the runtime archive. The resulting object may contain unresolved Flecha runtime symbols, just as an ordinary C object may contain unresolved library calls.

Executable builds are different. The native compiler automatically links the configured runtime archive. If it is missing or the linker fails, Flecha reports a structured compiler diagnostic.

This preserved the earlier separation:

- object emission produces a relocatable unit;
- executable building resolves its runtime dependencies.

That separation also makes packaging, external linking, and C interoperability easier to reason about.

# [](#small-runtime-large-decision)A small runtime, a large decision

The first runtime implementation was intentionally tiny. It used standard C I/O operations and exposed only the functions generated code needed.

But the architectural decision was larger than the file:

> Generated code talks to a documented, versioned ABI—not directly to compiler internals.

From this point onward, bounds checks, owned values, allocation, and other runtime-assisted features had an appropriate home.

# [](#conclusion)Conclusion

With the runtime ABI, a Flecha program can print every supported scalar and string view, then exit as a normal native executable.

The versioned boundary can grow without coupling generated code to C++ implementation details.

<a href="/">Go back</a>
