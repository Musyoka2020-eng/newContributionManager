---
description: Describe when these instructions should be loaded
# applyTo: 'Describe when these instructions should be loaded' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
# AI Agent Guidelines

These guidelines help AI assistants work effectively and responsibly in this codebase.

## Testing & Execution

- **Never run code snippets directly in the terminal**
  - Don't use `node -e`, `python -c`, or inline terminal code execution
  - Don't validate changes with ad-hoc bash/terminal commands
  - Create actual test files or scripts instead
  - Example: ❌ Don't run `node -e "console.log(myFunc())"` — ✅ Create a test file and run it

- **Write testable code, not manual validation**
  - Create proper test files (`.test.js`, `_test.py`, etc.) for verification
  - Run complete test suites via `npm test`, `pytest`, etc.
  - Log outputs and assertions in code, not in the terminal

- **Only modify code after you've read the affected files**
  - Never propose changes to files you haven't examined with the Read tool
  - Understand existing patterns before modifying
  - Check for impact on related files

## File Creation Discipline

- **Never create files unless absolutely necessary**
  - Prefer editing existing files to creating new ones
  - No "example" files, "template" files, or "future use" files
  - No unnecessary documentation files (README, CONTRIBUTING, etc.) unless explicitly requested

- **Avoid test file proliferation**
  - Add test cases to existing test files, don't create new ones for minor changes
  - Only create new test files when logical grouping requires it
  - Each test file should serve a clear, specific purpose

- **No auto-generated documentation**
  - Don't add comments, docstrings, or type annotations unless the code is genuinely unclear
  - Don't create changelogs, upgrade guides, or implementation notes
  - Focus on self-documenting code (clear names, logical structure)

## Code Quality

- **Avoid over-engineering**
  - Implement exactly what's requested, no more
  - Don't refactor surrounding code unless it's blocking the task
  - No helper functions or abstractions for one-time operations
  - Keep solutions focused and minimal

- **Follow project conventions**
  - Match existing code style, structure, and patterns
  - Check how similar problems are solved elsewhere in the codebase
  - Use project-specific tools and configurations, not global alternatives

- **Security-first changes**
  - Validate inputs at system boundaries only (user input, external APIs)
  - Don't add error handling for impossible scenarios
  - Trust internal code and framework guarantees
  - Only fix actual vulnerabilities, not hypothetical ones

## Git & Commits

- **Only commit when explicitly requested**
  - Never auto-commit or push without user consent
  - Never use `--force`, `--amend`, or skip hooks unless specifically instructed
  - Create clear commit messages that explain the "why", not just the "what".

## Communication

- **Be direct and honest**
  - If something won't work, say so immediately
  - Disagree respectfully when a request conflicts with best practices
  - Ask clarifying questions before starting large tasks

- **No false certainty**
  - If you're unsure about architecture or conventions, investigate first
  - Don't guess file locations or configuration approaches
  - Research the codebase thoroughly before proposing changes
