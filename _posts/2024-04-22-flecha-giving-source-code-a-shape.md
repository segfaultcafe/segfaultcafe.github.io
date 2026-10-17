---
title: "Flecha Dev Log #1: Giving Source Code a Shape"
date: 2024-04-22
published: true
---

# [](#intro)Introduction

Hi folks!

There is a moment at the beginning of every compiler project when the language exists mostly in our heads. We can describe the syntax, argue about types, and write small examples, but the compiler still sees a file as nothing more than characters.

Flecha had reached that moment. We already had a tokenizer producing tokens. The next question was deceptively simple: **what shape should a Flecha program have inside the compiler?**

The parser and abstract syntax tree are the point where those tokens begin to represent a program.

Let's jump right into it!

# [](#tokens-are-not-a-program)Tokens are not a program

Suppose we want to compile this:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 answer = 40 + 2;</code></pre></div></div>

The tokenizer can recognize a type, a name, an assignment operator, two numbers, an addition operator, and a semicolon. That is useful, but it does not tell the rest of the compiler that `40 + 2` initializes `answer`.

We needed an abstract syntax tree, or AST: a representation of the program's grammatical structure. A declaration owns an initializer, a binary expression owns its operands, and every node knows where it came from in the source file.

That final part matters. It is tempting to store only the information needed to execute the program. But when something is wrong, a compiler must point back to the exact piece of source that caused it. Source locations are not diagnostic decoration added at the end; they have to travel with the program from the beginning.

# [](#the-first-parser)The first parser

The initial parser introduced a small set of operations that still describe the rhythm of a recursive-descent parser:

- check the current token;
- match it and advance when it is the expected kind;
- consume a required token or report an error;
- parse the next expression according to the grammar.

The first expression parser recognized literals and names. That sounds tiny—and it was—but it established the direction. The parser would produce nodes, not execute behavior. Later compiler stages could ask what a node meant without reopening the original token stream.

We also made the parser own its progress through the tokens. `NextToken` stopped being part of the tokenizer's public interface. Tokenization produces a complete sequence; parsing consumes that sequence according to grammar. Keeping those jobs separate prevented the parser from reaching backward into lexer state.

# [](#an-ast-is-an-ownership-problem)An AST is an ownership problem

An AST is a tree of dynamically allocated objects. That immediately raises a very C++ question: who destroys them?

The early node model included source locations, types, values, variables, memory nodes, pointer nodes, and expression nodes. Tests did not only check that fields contained the right data. They also deleted complete nodes and ran with leak and use-after-free detection enabled.

That was an architectural decision disguised as test plumbing. A compiler creates thousands of small objects while processing a file. If ownership is ambiguous at the AST level, every later feature multiplies the ambiguity.

The model would continue evolving toward move-only trees and explicit owners, but the rule was already becoming clear:

> Every compiler object needs one obvious owner, while references between stages should be deliberately non-owning.

That rule eventually reached symbols, scopes, semantic models, and the lowering IR. It started here, when the tree was still small enough to understand completely.

# [](#syntax-is-allowed-to-change)Syntax is allowed to change

Some of the earliest AST tests still contained experimental spellings such as `int!`. Those tests are useful fossils. They remind us that building a language is not the same thing as protecting every early spelling forever.

What mattered in this milestone was not whether one type token survived. It was that types had a dedicated representation, source ranges survived parsing, and expressions became a structure other passes could consume.

We were choosing an architecture that allowed the language to change without rewriting the entire compiler every time it did.

# [](#what-we-had)What we had

By the end of this step, Flecha had:

- a tokenizer with a deliberately smaller public surface;
- the first recursive-descent parser machinery;
- an AST with source locations and typed node categories;
- tests for construction, access, and destruction;
- sanitizer support for memory leaks and use-after-free bugs.

It still could not answer whether a name existed, whether two types were compatible, or whether a program could become native code. That was fine. The source finally had a shape.

And once a compiler can represent a program, it can begin to understand one.

# [](#conclusion)Conclusion

The exciting part of a first AST is not the number of nodes it contains. It is the boundary it creates. Text becomes syntax. Syntax becomes something we can inspect, test, and transform.

An AST also exposes its own boundary. A parser can tell us that `value + 1` is a binary expression. Determining which `value` we meant, whether it is numeric, or whether it was declared at all belongs to semantic analysis.

<a href="/">Go back</a>
