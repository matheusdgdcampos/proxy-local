---
name: sdd-specify
description: 'Execute SDD Phase 1 to create the Feature Specification (what and why). Use when: writing a feature spec, creating spec-*.md, defining functional requirements FR-NNN, defining non-functional requirements NFR-NNN, running sdd-specify in any compatible IDE. Requires an approved constitution.'
argument-hint: "Feature name to specify (e.g., 'user-authentication')"
user-invocable: true
---

# SDD Feature Specification (Phase 1)

Builds the complete Feature Specification — the authoritative definition of WHAT must be built and WHY. No architecture, no technology choices, no implementation details.

## When to Use

- Writing a new feature specification from scratch.
- Defining functional and non-functional requirements for a feature.
- Explicit request to create or revise a `spec-[feature-name].md`.

## Expected Output

- Required questions asked to the user in pt-BR.
- All answers collected before generating any document.
- File `specs/spec-[feature-name].md` created with status DRAFT and the standardized format.
- Explicit user approval and all Open Questions resolved before advancing to Phase 2.

## IDE Compatibility

- This skill is IDE-agnostic (e.g., Cursor, Antigravity, and other SKILL.md-compatible environments).
- Slash command invocation (`/sdd-specify`) is optional; natural language instructions are equally valid.
- Behavior and output file must be identical across all environments.

## Pre-Spec Checklist

Before asking any questions, verify the following. If it is missing, stop and tell the user to run `/sdd-constitution` first.

- [ ] `specs/constitution.md` exists.

## Procedure

1. Interview the user in pt-BR using this exact text and questions:

> Agora vamos construir a especificação do que será desenvolvido. Responda com o máximo de detalhe possível — quanto mais contexto você fornecer, melhor será o resultado.
>
> 1. **Em uma frase objetiva**, qual é o problema que esta feature resolve para o usuário?
> 2. **Quem são os usuários afetados?** Descreva os perfis/personas principais e o que cada um precisa realizar.
> 3. **Qual é o fluxo principal de uso?** Descreva a jornada do usuário do início ao fim, passo a passo.
> 4. **Quais são os critérios de sucesso mensuráveis?** Como você saberá, objetivamente, que esta feature foi bem-sucedida?
> 5. **O que está explicitamente FORA do escopo desta entrega?** Liste tudo que poderia ser confundido como parte desta feature mas não é.

2. Wait for all answers before generating any output.
3. Generate the specification in English using the format below. Save to `specs/spec-[feature-name].md`.

## Spec Rules

- This file captures WHAT and WHY — never HOW.
- All functional requirements must be prefixed with FR-NNN.
- All non-functional requirements must be prefixed with NFR-NNN.
- Every requirement must be testable and unambiguous.
- User journeys must be written as numbered step-by-step sequences.
- Success criteria must be measurable — no vague statements like "should be fast" or "easy to use."
- The Out of Scope section is mandatory — it prevents scope creep downstream.
- Open questions must be listed and resolved before the plan phase begins.
- Do not include architecture decisions, technology choices, or implementation details in this file.

## Required Sections

Every spec file must contain all of the following sections:

1. Problem Statement
2. Goals
3. Non-Goals (Out of Scope)
4. User Personas
5. User Journeys
6. Functional Requirements (FR-NNN)
7. Non-Functional Requirements (NFR-NNN)
8. Success Criteria
9. Open Questions

## Output Format

Generate the spec using this exact template:

```markdown
# Feature Specification: [Feature Name]

> Status: DRAFT | APPROVED
> Author: [infer from context or leave blank]
> Constitution: specs/constitution.md
> Last updated: [DATE]

## Problem Statement

[One clear sentence describing the problem being solved]

## Goals

- [goal]

## Non-Goals (Out of Scope)

- [non-goal]

## User Personas

### [Persona Name]

- Role: [description]
- Primary need: [what they need to accomplish]
- Success state: [what success looks like for them]

## User Journeys

### Journey: [Journey Name]

1. [Step 1]
2. [Step 2]
3. [Step N — end state]

## Functional Requirements

- FR-001: [Requirement — testable, unambiguous]
- FR-002: [Requirement]

## Non-Functional Requirements

- NFR-001: Performance — [requirement]
- NFR-002: Security — [requirement]
- NFR-003: Scalability — [requirement]

## Success Criteria

- [ ] [Measurable criterion — must be binary: met or not met]
- [ ] [Measurable criterion]

## Open Questions

- [ ] [Ambiguity that must be resolved before planning begins]
```

4. Replace `[DATE]` with the current date in the project's local format.
5. If the `specs/` folder does not exist at the project root, create it before saving.
6. Save to `specs/spec-[feature-name].md`.
7. Ask the user exactly:

A especificação está correta e completa? Confirme para prosseguirmos para o plano técnico (Fase 2).

8. Do not proceed to Phase 2 until the user explicitly approves **and** all Open Questions are resolved.

## Quality Criteria

- Every FR-NNN and NFR-NNN must be testable and unambiguous — no vague language.
- Non-Goals section must be present with at least one entry.
- Success criteria must be binary (met or not met) — never subjective.
- Do not invent requirements not mentioned by the user — ask for clarification.
- No architecture decisions, technology choices, or implementation details anywhere in the output.
- Open Questions must be explicitly tracked and all resolved before Phase 2 can begin.
