---
title: "Flecha Dev Log #29: Making Linker Failures Actionable"
date: 2026-06-27
published: true
---

# [](#intro)Introduction

Hi folks!

Native compilation has an awkward seam. Flecha can successfully parse, check, and lower a program, emit a correct object file, and then depend on a host C++ driver to produce the executable.

When that last step fails, “linker exited with code 1” is technically true and practically useless.

We changed linker discovery and reporting so the compiler explains what it attempted and what the machine is missing.

# [](#build-has-distinct-stages)Build has distinct stages

The command line exposes the compiler's stopping points:

```text
flecha check input.fl
flecha --emit-llvm input.fl
flecha --emit-object input.fl -o input.o
flecha build input.fl -o input
```

Only the last command needs the native linker. This matters for diagnostics: a user checking source should not be told to install an SDK that the requested operation never uses.

It also gives us a clean fault boundary. If object emission succeeds and executable linking fails, the error belongs to host toolchain discovery or invocation rather than Flecha's frontend.

# [](#discovery-you-can-explain)Discovery you can explain

On each platform, Flecha searches a documented set of suitable C++ drivers. It records which candidates were attempted instead of discarding that information.

If none can be used, the diagnostic lists the attempted driver names and gives platform-specific prerequisites: development and startup files on Linux, the UCRT64 Clang environment on Windows, or Xcode command-line tools and a macOS SDK on macOS.

When a driver launches but linking fails, Flecha includes the actual linker output. We should never hide the one message that names an undefined symbol, missing library, or incompatible architecture.

# [](#an-authoritative-override)An authoritative override

Automatic discovery is convenient until a machine has several toolchains. `FLECHA_LINKER` selects a driver name or full path:

```sh
FLECHA_LINKER=/opt/llvm/bin/clang++ flecha build src/main.fl -o app
```

The override is authoritative. If it is invalid, Flecha reports that failure instead of silently falling back to another compiler and producing a binary with a toolchain the user did not select.

That behavior is especially useful in CI and reproducible build environments, where an unexpected fallback is often worse than a clear failure.

# [](#temporary-output-must-be-safe)Temporary output must be safe

Executable builds first emit Flecha code to a unique temporary object and then invoke the native driver.

Using a unique path avoids an easy but destructive collision: if the requested executable is named `program` and the user links a nearby `program.o`, compiler output must never overwrite that input object. Temporary artifacts are implementation details; user-supplied link inputs are not disposable.

The same rule makes concurrent builds and repeated invocations much less surprising.

# [](#runtime-discovery-is-part-of-the-story)Runtime discovery is part of the story

An installed compiler finds its version-matched runtime library relative to its own executable. A development override exists for diagnostics, but installed layouts do not depend on the repository that produced them.

When linking fails because that runtime is absent or unusable, the error identifies the expected location. The diagnostic should connect the user's action to the missing component, not ask them to understand compiler internals first.

# [](#conclusion)Conclusion

Error reporting is part of toolchain design. Flecha now distinguishes frontend work from native linking, explains driver discovery, respects an explicit override, preserves linker output, and offers advice for the actual platform.

The goal is simple: a failed build should leave us with the next action, not a mystery.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
