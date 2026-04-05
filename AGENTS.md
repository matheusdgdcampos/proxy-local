# Spec-Driven Development Agent Instructions

This repository uses a Spec-Driven Development (SDD) workflow.
Your job is to keep the specification as the single source of truth for the project.
Code serves the spec, never the other way around.

These instructions are agent-agnostic.
They apply regardless of the IDE, editor, or AI runtime executing the work.

## Core Behavioral Rules

- Never write implementation code before a spec exists for the feature.
- Never proceed to the next SDD phase without explicit human approval of the current phase output.
- Ask clarifying questions in Brazilian Portuguese (pt-BR).
- Generate all spec, plan, task, and code outputs in English unless the phase explicitly requires pt-BR prompts for user input.
- Flag ambiguity immediately. Vague requirements produce inconsistent code.
- Separate concerns strictly:
  - What and why belong in the spec.
  - How belongs in the plan.
  - Ordered execution steps belong in tasks.
- When production reality reveals a gap in the spec, update the spec artifacts first and only then resume implementation.
- Security, performance, and compliance are first-class requirements.
- Do not add features not described in the approved artifacts. If unclear, raise a spec question instead of assuming intent.

## SDD Phases

Always follow this sequence. Do not skip or reorder phases.

```text
Phase 0 -> Constitution
Phase 1 -> Specify
Phase 2 -> Plan
Phase 3 -> Tasks
Phase 4 -> Implement
```

Each phase requires explicit human sign-off before the next phase begins.

## Skill Routing

When the corresponding skill exists, use it as the primary workflow entrypoint.
If slash commands are unavailable, invoke the same workflow through natural language using the same phase rules.

- Phase 0: `sdd-constitution`
  - Path: `.agents/skills/sdd-constitution/SKILL.md`
  - Output: `specs/constitution.md`
- Phase 1: `sdd-specify`
  - Path: `.agents/skills/sdd-specify/SKILL.md`
  - Output: `specs/spec-[feature-name].md`
- Phase 2: `sdd-plan`
  - Path: `.agents/skills/sdd-plan/SKILL.md`
  - Output: `specs/plan-[feature-name].md`
- Phase 3: `sdd-tasks`
  - Path: `.agents/skills/sdd-tasks/SKILL.md`
  - Output: `specs/tasks-[feature-name].md`
- Phase 4: `sdd-implement`
  - Path: `.agents/skills/sdd-implement/SKILL.md`
  - Output: implementation code and tests derived from approved task artifacts

## Phase Detection

When the user sends a message, identify the correct phase before acting.

- If `specs/constitution.md` does not exist, start with Phase 0.
- If the user describes a new feature and the constitution exists, start with Phase 1.
- If the user wants architecture, component design, API contracts, or data models, proceed to Phase 2 only if the spec is approved.
- If the user wants an execution breakdown, ordered tasks, or task sequencing, proceed to Phase 3 only if the plan is approved.
- If the user asks to write code, modify code, or generate tests for a feature, proceed to Phase 4 only if the task list is approved.

## Questions and Output Policy

- Ask all clarifying questions in pt-BR.
- Generate all formal artifacts in English.
- Keep questions precise and blocking when required.
- Do not continue past unresolved ambiguity.

## Approval Gates

Do not advance phases without explicit approval.

- Phase 0 must be approved before Phase 1.
- Phase 1 must be approved and open questions resolved before Phase 2.
- Phase 2 must be approved before Phase 3.
- Phase 3 must be approved before Phase 4.

## Anti-Patterns

Refuse and redirect when any of the following occurs:

- "Just start coding, we'll figure it out later"
- Vague requirements with no measurable success criteria
- Requests to skip human approval between phases
- Requests to add a feature without updating the spec artifacts
- Mixing specification content with architecture content
- Mixing architecture content with implementation steps
- Implementation that introduces behavior not present in approved artifacts

## Artifact Location Rules

All SDD artifacts are stored in the root `specs/` directory.
If the folder does not exist, create it before saving any artifact.

```text
AGENTS.md
.agents/
  skills/
    sdd-constitution/
      SKILL.md
    sdd-specify/
      SKILL.md
    sdd-plan/
      SKILL.md
    sdd-tasks/
      SKILL.md
    sdd-implement/
      SKILL.md
specs/
  constitution.md
  spec-[feature-name].md
  plan-[feature-name].md
  tasks-[feature-name].md
```

## Artifact Discipline

- `specs/constitution.md` defines immutable project principles.
- `specs/spec-[feature-name].md` defines what and why.
- `specs/plan-[feature-name].md` defines how.
- `specs/tasks-[feature-name].md` defines atomic, ordered, testable work units.
- Code must trace back to approved tasks, which trace back to approved plan and spec artifacts.

## Spec Evolution Protocol

When a gap or conflict is found during implementation:

1. Stop implementation immediately.
2. Identify which artifact must change: spec, plan, or tasks.
3. Update that artifact first. Never patch code around a broken source artifact.
4. Re-validate downstream artifacts for consistency.
5. Get explicit human approval for the update.
6. Resume implementation only from the updated source of truth.

## Implementation Constraints

During Phase 4:

- Implement only the currently approved task.
- Write tests before or alongside implementation unless explicitly overridden by the approved task strategy.
- Do not introduce undocumented dependencies, abstractions, or architecture changes.
- If a new requirement appears, stop and treat it as a spec gap.
- Constitution constraints always take priority over local implementation convenience.
