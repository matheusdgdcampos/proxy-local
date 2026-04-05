---
name: sdd-implement
description: 'Execute SDD Phase 4 to implement a specific approved task. Use when: writing code from a spec, implementing a task from tasks-*.md, executing TASK-NNN, running sdd-implement in any compatible IDE. Requires approved spec, plan, and task files.'
argument-hint: "Feature name and TASK-NNN to implement (e.g., 'auth TASK-001')"
user-invocable: true
---

# SDD Implementation (Phase 4)

Implements code strictly from an approved task in `specs/tasks-[feature-name].md`. Acts as a spec-execution engine, not a general-purpose coding assistant.

## When to Use

- Implementing a specific TASK-NNN from an approved task file.
- Writing production code that must trace back to a spec.
- Any code change that must satisfy SDD acceptance criteria.

## Expected Output

- Code that implements exactly what the task describes — nothing more.
- Tests written before or alongside implementation.
- Task marked as complete in `tasks-[feature-name].md`.
- Structured output report per task (see Output Format below).

## IDE Compatibility

- This skill is IDE-agnostic (e.g., Cursor, Antigravity, and other SKILL.md-compatible environments).
- Slash command invocation (`/sdd-implement`) is optional; natural language instructions are equally valid.
- Behavior and output format must be identical across all environments.

## Pre-Implementation Checklist

Before writing any code, verify all of the following. If any item is missing or not in APPROVED status, stop and ask the user to complete the missing step.

- [ ] `tasks-[feature-name].md` exists at `specs/` with status **APPROVED**.
- [ ] `plan-[feature-name].md` exists at `specs/` with status **APPROVED**.
- [ ] `spec-[feature-name].md` exists at `specs/` with status **APPROVED**.
- [ ] `specs/constitution.md` exists.
- [ ] The user has specified which **TASK-NNN** to implement.

## Implementation Rules

- Implement **only** what the current task describes. Nothing more.
- Do not implement features not described in the spec. If a feature is needed but missing from the spec, stop and flag it.
- Write tests before or alongside implementation — never after, unless explicitly instructed.
- If a requirement is unclear, raise a spec question — do not assume intent and proceed.
- If production reality reveals a gap in the spec, stop and surface the discrepancy. Do not patch around it.
- All code must satisfy the acceptance criteria of its corresponding task before moving to the next task.
- If a new requirement emerges during implementation, do **not** implement it — surface it as a spec gap.
- Do not introduce undocumented dependencies, patterns, or abstractions not covered by the plan.
- Deviations from the Technical Plan require explicit approval before implementation continues.
- Constitution constraints (`specs/constitution.md`) take priority over all other decisions.

## Agent Behavior During Implementation

- Reference the relevant task ID in commit messages: `feat(TASK-001): implement user authentication`
- When suggesting code, cite which FR-NNN or NFR-NNN it satisfies.
- When generating tests, map each test case to an acceptance criterion in the task.
- If you detect a pattern that contradicts the constitution, flag it before suggesting the change.

## Spec Gap Protocol

When implementation reveals a gap or conflict in the spec, emit this exact block and pause:

```
SPEC GAP DETECTED
Task: TASK-[NNN]
Artifact: [spec / plan / tasks]
Issue: [describe the gap or conflict]
Proposed resolution: [your suggested fix to the spec]

⚠️ Implementation is paused. Please approve the spec update before proceeding.
```

## Output Format Per Task

Structure every task implementation response as follows:

```
## Implementing TASK-[NNN]: [Task Name]

### Spec References
- [FR-NNN]: [requirement being implemented]
- [NFR-NNN]: [constraint being respected]

### What I'm building
[One paragraph explanation of what will be created]

### Files affected
- [file path] — [what changes]

### Tests
[Test cases mapped to acceptance criteria]

### Implementation
[Code]

### Acceptance Criteria Status
- [ ] [criterion 1] → [PASS / IN PROGRESS]
- [ ] [criterion 2] → [PASS / IN PROGRESS]
```

## After Task Completion

1. Mark the task as complete in `tasks-[feature-name].md`.
2. Ask the user: "TASK-[NNN] está completo. Deseja prosseguir para TASK-[NNN+1]: [Next Task Name]?"
3. Wait for explicit confirmation before starting the next task.

## Quality Criteria

- Every code change must trace back to a task in `specs/tasks-*.md`.
- Tests must map to acceptance criteria — not written generically.
- No production code without a corresponding spec reference (FR-NNN or NFR-NNN).
- Commit messages must include the task ID.
- Constitution constraints are always the highest-priority tiebreaker.
