---
title: "Flecha Dev Log #25: Crossing the C Boundary"
date: 2026-02-11
published: true
---

# [](#intro)Introduction

Hi folks!

A native language eventually needs to call code it did not compile. Operating systems, mature libraries, and even a language's own runtime often meet at the C ABI.

The tempting implementation is “let the linker figure it out.” Flecha took the opposite approach: make the boundary narrow, explicit, and strict enough that unsupported representations fail before linking.

# [](#an-extern-is-only-a-declaration)An extern is only a declaration

An external function has a Flecha signature but no Flecha body:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">extern unsafe i32 native_read(
    *const char path,
    usize path_length,
    *u8 output,
    usize capacity
);</code></pre></div></div>

The native linker supplies the implementation. The exported symbol is exactly `native_read`, without a Flecha module prefix, while name lookup inside Flecha still respects the module that declared it.

External declarations must be free, non-generic functions. They cannot be lifecycle overrides or the program entry point. These restrictions keep language-specific calling behavior away from a boundary that promises the C ABI.

# [](#extern-and-unsafe-mean-different-things)Extern and unsafe mean different things

`extern` says where the implementation comes from. `unsafe` says what responsibility the call carries.

A scalar-only external function can be safe:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">extern i32 native_add(i32 left, i32 right);
</code></pre></div></div>

A signature containing raw pointers must be unsafe, and every call needs ordinary unsafe permission. A raw pointer crossing this boundary gains no ownership, lifetime, aliasing, provenance, or nullability guarantee simply because its declaration has a type.

Flecha also refuses to pass tracked owning or lent allocations to an external function. Until an external ownership contract can describe what native code does with that memory, the safe answer is not to guess.

# [](#a-deliberately-small-abi)A deliberately small ABI

The first ABI supports `void`, integer and floating-point scalars, `bool`, `char`, and raw pointers. Narrow integer arguments receive the sign or zero extension required by the target C ABI.

References, slices, tuples, structures, error values, and strings by value are rejected. Their in-memory forms are Flecha implementation details, not accidental C interfaces.

Strings expose bytes explicitly with `data()` inside unsafe code, while length travels separately. Two versioned runtime handles support the compiler's own string bridge, but ordinary libraries see byte pointers and lengths.

# [](#linking-is-part-of-the-command)Linking is part of the command

Executable builds accept repeatable native inputs:

```sh
flecha build src/main.fl -o app --link native_io.o --link libmath.a
```

Longbow records the same objects or archives in the project manifest. Object emission deliberately stops before the linker, keeping “compile this module” distinct from “assemble this executable.”

# [](#filesystem-as-a-real-test)Filesystem I/O as a real test

The standard library uses this boundary to offer safe whole-file reading:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">@imports
    :: lib::std::io::filesystem;

contents, err := filesystem::read_file("input.fl");
if err != none {
    return err;
}</code></pre></div></div>

The wrapper validates the path, calls a versioned runtime function, and receives one owned string on success. Empty files succeed with an empty string. Embedded null bytes and platform line endings are preserved because contents are bytes, not secretly decoded text.

Errors distinguish missing files, denied permission, invalid paths, oversized contents, failed reads, and allocation failure. The file is closed and partial storage is released on every path.

On POSIX, paths travel as byte sequences. On Windows, UTF-8 paths are validated and converted to UTF-16 before opening. Those differences belong in the runtime wrapper, not in every Flecha program.

# [](#conclusion)Conclusion

Interoperability is safest when neither side is asked to pretend. Flecha names the C-compatible subset, makes raw memory calls visibly unsafe, preserves ownership checks at the edge, and wraps platform details in a safe standard API.

The boundary is intentionally small. Small boundaries are easier to understand, test, and trust.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
