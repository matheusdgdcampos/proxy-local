---
name: sdd-tasks
description: 'Execute SDD Phase 3 to break an approved plan into atomic ordered tasks. Use when: creating task breakdown, generating tasks-*.md, defining TASK-NNN, running sdd-tasks in any compatible IDE. Requires approved constitution, spec, and plan files.'
argument-hint: "Feature name to break down into tasks (e.g., 'user-authentication')"
user-invocable: true
---

# SDD Task Breakdown (Phase 3)

Produces an ordered Task Breakdown — atomic, dependency-aware work units that a developer or AI coding agent can execute sequentially against the spec.

## When to Use

- Breaking an approved technical plan into executable tasks.
- Defining TASK-NNN blocks with acceptance criteria and spec references.
- Explicit request to create or revise a `tasks-[feature-name].md`.

## Expected Output

- Required questions asked to the user in pt-BR.
- All answers collected before generating any document.
- File `specs/tasks-[feature-name].md` created with status DRAFT and the standardized format.
- Explicit user approval before any implementation code is generated.

## IDE Compatibility

- This skill is IDE-agnostic (e.g., Cursor, Antigravity, and other SKILL.md-compatible environments).
- Slash command invocation (`/sdd-tasks`) is optional; natural language instructions are equally valid.
- Behavior and output file must be identical across all environments.

## Pre-Tasks Checklist

Before asking any questions, verify all of the following. If any item is missing or in DRAFT status, stop and tell the user to complete the previous phase first.

- [ ] `specs/constitution.md` exists.
- [ ] `spec-[feature-name].md` exists at `specs/` with status **APPROVED**.
- [ ] `plan-[feature-name].md` exists at `specs/` with status **APPROVED**.

## Procedure

1. Interview the user in pt-BR using this exact text and questions:

> Ótimo! Agora vou detalhar o plano em tarefas atômicas e ordenadas. Preciso de algumas informações antes.
>
> 1. Quem vai executar as tarefas — **um agente de IA (ex: Copilot Coding Agent), um desenvolvedor humano, ou ambos**?
> 2. Existe alguma **restrição de ordem de entrega**? (ex: algum componente precisa estar pronto antes por dependência externa ou data de integração)
> 3. Você prefere as tarefas organizadas por **camadas técnicas** (infra → backend → frontend) ou por **fluxo de usuário** (end-to-end por funcionalidade)?
> 4. Os **testes devem preceder a implementação** (TDD) ou você prefere testes após a implementação?
> 5. Há alguma tarefa que deve ser **explicitamente excluída** desta entrega?

2. Wait for all answers before generating any output.
3. Generate the task breakdown in English using the format below. Save to `specs/tasks-[feature-name].md`.

## Task Rules

- Tasks must be atomic — each task has a single, clear deliverable.
- Tasks must be ordered by dependency. No task should assume work from a later task is complete.
- Test tasks must precede implementation tasks (TDD by default unless explicitly overridden).
- Each task must reference the spec requirements (FR-NNN, NFR-NNN) it satisfies.
- Acceptance criteria must be binary — either done or not done. No vague criteria.
- Complexity estimates use T-shirt sizing: XS, S, M, L, XL.
- Parallelizable tasks must be explicitly marked — assume sequential otherwise.
- The Definition of Done section is mandatory and applies to every task in the file.
- Do not include implementation code in task files — only describe what must be done.

## Required Per-Task Fields

Every task block must contain all of the following:

- Task ID (`TASK-NNN`)
- Phase (`Setup / Backend / Frontend / Integration / Testing / DevOps`)
- Depends on
- Parallelizable (`Yes / No`)
- Assigned to (`AI Agent / Human / Both`)
- Description
- Acceptance Criteria (checklist)
- Spec References (FR-NNN, NFR-NNN)
- Estimated Complexity (`XS / S / M / L / XL`)

## Output Format

Generate the task breakdown using this exact template:

```markdown
# Task Breakdown: [Feature Name]

> Status: DRAFT | APPROVED
> Plan: specs/plan-[feature-name].md
> Spec: specs/spec-[feature-name].md
> Constitution: specs/constitution.md
> Last updated: [DATE]

## Execution Strategy

- Order: [Sequential / Partially parallelizable — see individual tasks]
- Executor: [AI Agent / Human / Mixed]
- Test approach: [TDD / Test-after]

---

### TASK-001: [Task Name]

- **Phase:** [Setup / Backend / Frontend / Integration / Testing / DevOps]
- **Depends on:** none
- **Parallelizable:** No
- **Assigned to:** [AI Agent / Human / Both]
- **Description:** [Clear, unambiguous description. One deliverable per task.]
- **Acceptance Criteria:**
  - [ ] [Binary criterion — done or not done]
  - [ ] [Binary criterion]
- **Spec references:** [FR-001, NFR-002]
- **Estimated complexity:** XS / S / M / L / XL

---

### TASK-002: [Task Name]

- **Phase:** [value]
- **Depends on:** TASK-001
- **Parallelizable:** No
- **Assigned to:** [value]
- **Description:** [value]
- **Acceptance Criteria:**
  - [ ] [criterion]
- **Spec references:** [FR-NNN]
- **Estimated complexity:** [value]

---

## Definition of Done

A task is complete only when ALL of the following are true:

- [ ] All acceptance criteria are met
- [ ] Tests are written and passing
- [ ] No spec requirements (FR-NNN, NFR-NNN) were violated
- [ ] No undocumented dependencies were introduced
- [ ] Constitution constraints are respected
- [ ] Code review approved (if applicable)
```

4. Replace `[DATE]` with the current date in the project's local format.
5. If the `specs/` folder does not exist at the project root, create it before saving.
6. Save to `specs/tasks-[feature-name].md`.
7. Ask the user exactly:

O detalhamento de tarefas está correto e completo? Confirme para iniciarmos a implementação (Fase 4).

8. Do not generate any implementation code until the user explicitly approves this task list.

## Quality Criteria

- Every task must have at least one FR-NNN or NFR-NNN reference — no orphan tasks.
- Acceptance criteria must be binary — never subjective or open-ended.
- Task ordering must respect all declared dependencies.
- Definition of Done section must be present and unmodified.
- No implementation code in the task file — description only.
- TDD order must be respected unless the user explicitly overrode it in step 4.
