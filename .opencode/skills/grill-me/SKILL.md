---
name: grill-me
description: Use ONLY when the user explicitly asks to stress-test, interrogate, or "grill" a plan, decision, or design.
---

# Grill Me

Interview the user relentlessly about every aspect of their plan or design until you reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, codebase, etc.), look it up rather than asking the user. The *decisions*, though, are the user's — put each one to them and wait for their answer.

Do not act on the plan until the user confirms you have reached a shared understanding.

This skill is stateless: it writes nothing and leaves no workspace behind. The only artifact is the sharpened understanding in the conversation itself.
