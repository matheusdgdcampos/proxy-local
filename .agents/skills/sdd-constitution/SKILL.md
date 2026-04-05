---
name: sdd-constitution
description: 'Execute SDD Phase 0 to define the project Constitution. Use when: establishing non-negotiable principles, starting a new spec, invoking sdd-constitution in any compatible IDE, generating specs/constitution.md in pt-BR.'
argument-hint: 'Optional project context for the Constitution'
user-invocable: true
---

# SDD Constitution (Phase 0)

Establishes the project Constitution — the set of immutable principles that govern every spec, plan, task, and line of code.

## When to Use

- Starting a new SDD workflow.
- Formalizing non-negotiable project principles.
- Explicit request to create or revise the project Constitution.

## Expected Output

- Required questions asked to the user in pt-BR.
- All answers collected before generating any document.
- File `specs/constitution.md` created/updated with the standardized format.
- Explicit user approval before advancing to Phase 1.

## IDE Compatibility

- This skill is IDE-agnostic (e.g., Cursor, Antigravity, and other SKILL.md-compatible environments).
- Must not depend on commands exclusive to any specific IDE.
- Slash command invocation (`/sdd-constitution`) is optional; natural language instructions are equally valid.
- Behavior and output file must be identical across all environments.

## Procedure

1. Interview the user in pt-BR using this exact text and questions:

> Antes de começarmos qualquer especificação, preciso entender os princípios inegociáveis do seu projeto. Responda com o máximo de detalhe possível.
>
> 1. Qual é o **stack tecnológico** que deve ser usado? (linguagem, framework, banco de dados, cloud provider)
> 2. Existem **padrões de arquitetura** obrigatórios? (ex: microsserviços, monolito modular, event-driven, serverless)
> 3. Quais são os **requisitos de segurança** não negociáveis? (ex: autenticação obrigatória, criptografia em repouso, compliance como LGPD/SOC2)
> 4. Quais são as **convenções de testes** da equipe? (ex: TDD obrigatório, cobertura mínima de X%, frameworks preferidos)
> 5. Existe alguma **restrição de infraestrutura ou deploy**? (ex: Kubernetes only, sem vendor lock-in, região de dados específica)

2. Wait for all answers before generating any output.
3. Generate the Constitution using this exact format:

```markdown
# Constitution

> Immutable principles for this project. Every spec, plan, task, and code change must comply.
> Last updated: [DATE]

## Core Principles

- [principle]

## Technology Stack

- Language: [value]
- Framework: [value]
- Database: [value]
- Cloud / Infrastructure: [value]

## Architecture Constraints

- [constraint]

## Security Requirements

- [requirement]

## Testing Standards

- [standard]

## Deployment Constraints

- [constraint]

## Compliance & Regulatory

- [requirement or "None identified"]
```

4. Replace `[DATE]` with the current date in the project's local format.
5. If the `specs/` folder does not exist at the project root, create it before saving.
6. Save to `specs/constitution.md`.
7. Ask the user exactly:

A Constituição está correta? Confirme para prosseguirmos para a especificação (Fase 1).

8. Do not proceed to Phase 1 without explicit user approval.

## Quality Criteria

- Do not invent missing decisions — ask for clarification if information is absent.
- Ensure consistency across sections (e.g., stack and deployment constraints must not conflict).
- Avoid ambiguity — prefer verifiable requirements (e.g., coverage >= 80%).
- Keep content objective and auditable.
