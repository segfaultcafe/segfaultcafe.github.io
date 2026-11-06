---
title: "Flecha Dev Log #36: A Language Server Without a Second Compiler"
date: 2026-11-06
published: true
---

# [](#intro)Introduction

Hi folks!

Flecha already ships syntax highlighting and editor packages. They can recognize a source file, color its tokens, and provide the ordinary editing details that make a language feel at home.

They cannot explain why a name is missing, where a symbol was declared, or whether an unsaved change still type-checks.

That is the boundary where a language server begins. The tempting implementation is to place a parser inside the editor tool and slowly teach it enough of the language to answer useful questions. We decided not to build a second compiler by accident.

Instead, we are designing `flecha-lsp` as a separate binary written in Flecha. The finished server will speak the Language Server Protocol to the editor and ask the compiler selected by the workspace for language facts.

# [](#the-server-is-not-the-compiler)The server is not the compiler

An LSP and a compiler need different kinds of state.

The language server owns editor concerns: JSON-RPC messages, open documents, document versions, file URIs, LSP lifecycle, and conversion between source positions. The compiler already owns tokenization, parsing, imports, name resolution, types, and diagnostics.

Duplicating the second list inside the first process would create two definitions of Flecha. Every language change would need to land twice, and an editor could disagree with the build that runs one second later.

The process model keeps one authority:

```text
Editor
  │ LSP / JSON-RPC over stdin and stdout
  ▼
flecha-lsp
  │ versioned JSON-RPC analysis protocol over private pipes
  ▼
flecha analyze --stdio
  │
  ▼
Flecha parser, module loader, and semantic analyzer
```

`flecha-lsp` will not link against the compiler's C++ classes or load a compiler plugin through the runtime. It will start the workspace compiler as a child process. There will be no global daemon, network listener, or public compiler ABI hidden behind the editor integration.

That separation lets the compiler change internally while the boundary remains small data: versions, capabilities, source text, byte ranges, diagnostic codes, and messages.

# [](#three-versions-not-one)Three versions, not one

Keeping the server in a separate repository immediately raised a useful objection: coupled versioning would make that separation mostly cosmetic.

The architecture therefore has three independent versions:

```text
flecha-lsp version
Flecha compiler version
compiler analysis protocol version
```

The server will not require its own version to match the compiler version. It will negotiate a major and minor analysis-protocol version with the selected compiler. Different major versions are incompatible; newer minor versions may add optional capabilities.

This is the same reason AST nodes and compiler pointers cannot cross the process boundary. Those objects describe one compiler implementation. The analysis protocol describes facts an editor can consume.

The initial toolchain search will prefer an explicit editor setting, then `FLECHA_COMPILER`, then a future project-specific toolchain selection, and finally `flecha` from `PATH`. A workspace should be analyzed by the compiler that will actually build it.

# [](#why-write-it-in-flecha)Why write it in Flecha?

The safest bootstrap choice would be to write the server in a language with mature protocol libraries. It would also avoid exercising the exact parts of Flecha that a long-running tool needs.

Writing `flecha-lsp` in Flecha turns the project into a substantial user of the language, standard library, package manager, I/O model, owning buffers, structures, errors, and JSON support.

The first proof was deliberately small. We installed the public `flecha/json` package and deserialized JSON into a decorated Flecha structure containing an owning array:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">@json(structure)
structure Test {
    i32 value;
    own []i32 values;
};</code></pre></div></div>

That did not produce a language server, but it answered an important bootstrap question: typed protocol data can be represented and decoded in Flecha today.

Method-specific LSP parameters can use generated `@json` methods. The generic JSON-RPC envelope cannot be treated the same way because `params` and `result` are heterogeneous. Incoming envelopes may omit `id` for notifications or contain numeric, textual, or null values; valid LSP request IDs themselves are integers or strings. That envelope will be parsed manually and dispatch will decode its raw `params` range into the appropriate typed structure.

# [](#framing-comes-before-rpc)Framing comes before RPC

JSON-RPC describes messages, but standard input is only a stream of bytes. LSP adds a framing rule:

```text
Content-Length: <UTF-8 byte count>\r\n
\r\n
<JSON body>
```

We chose to build this transport before the RPC dispatcher. Until one complete body can be read without consuming bytes from the next one, JSON parsing is the wrong problem.

The framed reader has to handle details that a successful one-message demo hides:

- operating-system reads may return only part of a header or body;
- several messages may already be buffered together;
- `Content-Length` is required exactly once and its name is case-insensitive;
- unknown headers are valid and ignored;
- the length must be validated before allocation;
- headers and bodies need explicit size limits; and
- EOF between messages is clean, while EOF inside a message is truncated input.

An empty body also cannot share the representation used for a clean disconnect. The reader therefore returns a body, a boolean saying whether a message exists, and an error. The extra result is small, but it prevents one protocol state from pretending to be another.

Standard output must contain only framed LSP messages. Logs and diagnostics go to standard error, because a single unframed line corrupts the editor connection.

# [](#small-parser-decisions)Small parser decisions

The first reader draft also exposed how quickly byte-oriented code becomes cryptic.

Comparisons against `13`, `10`, `32`, `48`, and `57` may be correct ASCII, but they hide whether the parser is looking for a line ending, optional whitespace, or a decimal digit. We kept the transport buffer as bytes and converted individual bytes to `char` while parsing.

We also reused the standard text library instead of maintaining a manual decimal accumulator:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">const stringv VALUE_TEXT = line[start:end].cast&lt;stringv&gt;;

value, parseErr :=
    strings::stringv_to_int&lt;usize&gt;(VALUE_TEXT);</code></pre></div></div>

The surrounding parser still has protocol-specific work. It trims only space and horizontal tab because HTTP-style optional whitespace is narrower than every character classified as ASCII whitespace. It rejects a leading `+`, duplicate lengths, missing lengths, overflow, and values above the configured body limit.

Case-insensitive comparison remains a small local helper over two byte slices. Giving both operands the same representation avoided mixing `usize` slice indices with `u32` string-view indices for no semantic benefit.

These are not glamorous language-server decisions. They are the kind that determine whether the server stays connected to an editor after the first unusual packet.

# [](#tests-define-done)Tests define done

The framing test matrix is the next gate, not cleanup after the implementation.

It covers complete and one-byte-at-a-time input, consecutive messages, mixed-case and unknown headers, zero-length bodies, clean EOF, duplicate or missing lengths, overflow, size limits, and truncated headers and bodies.

Designing those tests already found distinctions the first sketch did not express cleanly. A helper cannot `break` a loop in its caller. Header completion is not the same event as EOF. A valid zero-length body is not the same result as no message. An unexpected EOF check is easy to invert when the happy path and failure path are both represented by an `error` value.

The repository now contains the architecture documents and a first framed-reader implementation. The reader should not be called finished until that matrix passes. The writer, JSON-RPC dispatcher, LSP lifecycle, compiler analysis mode, and editor integration still remain ahead.

# [](#the-compiler-conversation)The compiler conversation

The proposed compiler side is `flecha analyze --stdio`. It will use a smaller Flecha-specific JSON-RPC 2.0 protocol rather than pretending the compiler itself is an LSP server.

The analysis process will own source overlays for unsaved documents. Every module load will first check whether the LSP supplied a newer in-memory version and fall back to the filesystem only when no overlay exists. This matters for imported files as much as for the file currently open in the editor.

Compiler diagnostics will cross the boundary as stable values:

```json
{
  "uri": "file:///project/src/main.fl",
  "version": 4,
  "diagnostics": [
    {
      "code": "FLECHA-S0002",
      "startByte": 20,
      "endByte": 25,
      "severity": "error",
      "message": "unknown name"
    }
  ]
}
```

The compiler will report UTF-8 byte ranges because that is its native source representation. The LSP will own conversion to the line and character positions negotiated with the editor, including UTF-16 when required. Document versions will travel with results so stale diagnostics can be discarded before they reach the screen.

# [](#one-vertical-slice)One vertical slice

Flecha 0.3.1 exposes blocking standard streams and child-process pipes. The first implementation will therefore be sequential: read one editor message, dispatch it, perform at most one analyzer request, write the response, and continue.

There is no cancellation or background analysis in that model. Editor messages arriving during analysis remain buffered by the operating system. That limitation is acceptable for the first path because the protocol boundaries do not depend on concurrency.

The target is deliberately narrow:

```text
editor starts flecha-lsp
  → initialize succeeds
  → editor opens an unsaved Flecha document
  → the workspace compiler analyzes its in-memory text
  → diagnostics are published
  → shutdown succeeds
```

Full-document synchronization comes first. Hover, go-to-definition, references, completion, incremental edits, cancellation, and parallel workspaces come after diagnostics prove the whole path.

# [](#conclusion)Conclusion

The first important LSP decision was not an editor feature. It was deciding where language truth lives.

`flecha-lsp` will be an independently versioned Flecha binary that owns editor protocol and document state. The workspace compiler will remain responsible for parsing and semantics behind a small, versioned process boundary. JSON-RPC connects the pieces, while `Content-Length` framing makes the byte stream reliable enough to carry it.

Today we have the repository, the architecture, working JSON deserialization, and the first transport reader draft. The immediate work is to make framing pass its failure matrix, write the framed output path, and then build the smallest complete JSON-RPC lifecycle.

The language server is not useful to an editor yet. Its responsibilities are finally narrow enough that we can build it without creating another Flecha along the way.

I hope you liked this write-up and learned something new. As always, don't forget to do your **research!**

<a href="/">Go back</a>
