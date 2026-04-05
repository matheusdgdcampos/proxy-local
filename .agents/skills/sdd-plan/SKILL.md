---
name: sdd-plan
description: 'Execute SDD Phase 2 to create the Technical Plan for a feature. Use when: defining architecture, designing components, specifying data models and API contracts, generating plan-*.md, running sdd-plan in any compatible IDE. Requires approved constitution and spec files.'
argument-hint: "Feature name to plan (e.g., 'user-authentication')"
user-invocable: true
---

# SDD Technical Plan (Phase 2)

Creates the Technical Plan — the authoritative definition of HOW the system will be built. Architecture, components, data models, API contracts, and trade-offs. No step-by-step implementation instructions. No actual code.

## When to Use

- Defining architecture and component design for an approved spec.
- Specifying data models, API contracts, and technology decisions.
- Explicit request to create or revise a `plan-[feature-name].md`.

## Expected Output

- Required questions asked to the user in pt-BR.
- All answers collected before generating any document.
- File `specs/plan-[feature-name].md` created with status DRAFT and the standardized format.
- Explicit user approval before advancing to Phase 3.

## IDE Compatibility

- This skill is IDE-agnostic (e.g., Cursor, Antigravity, and other SKILL.md-compatible environments).
- Slash command invocation (`/sdd-plan`) is optional; natural language instructions are equally valid.
- Behavior and output file must be identical across all environments.

## Pre-Plan Checklist

Before asking any questions, verify all of the following. If any item is missing or in DRAFT status, stop and tell the user to complete the previous phase first.

- [ ] `specs/constitution.md` exists.
- [ ] `spec-[feature-name].md` exists at `specs/` with status **APPROVED**.

## Procedure

1. Interview the user in pt-BR using this exact text and questions:

> Com a especificação aprovada, agora vamos definir COMO o sistema será construído. Preciso de mais contexto antes de gerar o plano.
>
> 1. Existem **sistemas ou serviços existentes** com os quais esta feature precisa se integrar? Liste-os com uma breve descrição.
> 2. Há **preferências ou restrições de performance** que devem guiar as decisões de arquitetura? (ex: latência máxima, throughput esperado, SLA)
> 3. Quais **trade-offs** você está disposto a aceitar? (ex: simplicidade vs. escalabilidade; velocidade de entrega vs. robustez)
> 4. Existem **padrões de API** já definidos no projeto? (REST, GraphQL, gRPC, eventos assíncronos)
> 5. Há **decisões técnicas já tomadas** que não podem ser questionadas nesta fase?

2. Wait for all answers before generating any output.
3. Generate the Technical Plan in English using the format below. Every decision must reference at least one FR-NNN or NFR-NNN. Save to `specs/plan-[feature-name].md`.

## Plan Rules

- This file captures HOW — architecture and component design, never implementation details.
- Every architectural decision must reference at least one FR-NNN or NFR-NNN from the corresponding spec file.
- Data models must include field types, constraints, and relationships.
- API contracts must specify request schema, response schema, and all error cases.
- Technology decisions must document rationale and trade-offs — not just the choice.
- Risk table is mandatory. Every risk must have a mitigation strategy.
- Security considerations must be explicit — never implicit or assumed.
- Do not include step-by-step implementation instructions or actual code in this file.
- Integration points with external systems must be explicitly declared.

## Required Sections

Every plan file must contain all of the following sections:

1. Architecture Overview
2. Component Design
3. Data Models
4. API Contracts
5. Technology Decisions (with rationale and trade-offs)
6. Security Considerations
7. Performance Considerations
8. Integration Points
9. Risks & Mitigations

## Output Format

Generate the plan using this exact template:

```markdown
# Technical Plan: [Feature Name]

> Status: DRAFT | APPROVED
> Spec: specs/spec-[feature-name].md
> Constitution: specs/constitution.md
> Last updated: [DATE]

## Architecture Overview

[High-level description of how the system is structured. Include a component diagram if helpful.]

## Component Design

### [Component Name]

- Responsibility: [what it does]
- Interfaces: [how it communicates with other components]
- Dependencies: [what it depends on]
- Satisfies: [FR-NNN, NFR-NNN]

## Data Models

### [Entity Name]

| Field   | Type   | Description   | Constraints                     |
| ------- | ------ | ------------- | ------------------------------- |
| [field] | [type] | [description] | [NOT NULL / UNIQUE / FK / etc.] |

## API Contracts

### [Endpoint or Event Name]

- Method: [GET / POST / PUT / DELETE / EVENT]
- Path / Topic: [value]
- Auth: [required auth mechanism]
- Request schema: [inline or reference]
- Response schema: [inline or reference]
- Error cases: [list of error conditions and responses]
- Satisfies: [FR-NNN]

## Technology Decisions

| Decision        | Choice          | Rationale         | Trade-offs           |
| --------------- | --------------- | ----------------- | -------------------- |
| [decision area] | [chosen option] | [why this choice] | [what is sacrificed] |

## Security Considerations

- [Explicit security control — never "standard security practices"]

## Performance Considerations

- [Explicit performance design decision with target metric]

## Integration Points

| System        | Integration Type          | Data Flow              | Notes   |
| ------------- | ------------------------- | ---------------------- | ------- |
| [system name] | [sync/async/webhook/etc.] | [in/out/bidirectional] | [notes] |

## Risks & Mitigations

| Risk               | Probability | Impact    | Mitigation            |
| ------------------ | ----------- | --------- | --------------------- |
| [risk description] | H / M / L   | H / M / L | [mitigation strategy] |
```

4. Replace `[DATE]` with the current date in the project's local format.
5. If the `specs/` folder does not exist at the project root, create it before saving.
6. Save to `specs/plan-[feature-name].md`.
7. Ask the user exactly:

O plano técnico está correto e completo? Confirme para prosseguirmos para o detalhamento de tarefas (Fase 3).

8. Do not proceed to Phase 3 without explicit user approval.

## Quality Criteria

- Every architectural decision must cite at least one FR-NNN or NFR-NNN.
- Do not invent integration points or decisions not mentioned by the user — ask for clarification.
- Security and performance sections must be explicit and verifiable, never generic.
- Risk table must be present with at least one entry and a concrete mitigation per risk.
- The plan must be internally consistent with the constitution and the approved spec.
