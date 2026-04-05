---
name: containerize-this
description: 'Containerize a project using Docker Dev Containers and production Dockerfile. Use when: setting up devcontainer, creating .devcontainer config, dockerizing project, configuring Docker for development, creating production Dockerfile with multi-stage build, isolating developer workspace, setting up reproducible dev environment, containerizar projeto, configurar devcontainer, criar Dockerfile de produção.'
argument-hint: 'Optional: project type or runtime (e.g., Node.js frontend, Python API, Java backend)'
---

# Containerize with Dev Container

Sets up a full Docker containerization for any project:
- **`.devcontainer/`** — isolated, reproducible development environment with only the required VS Code extensions.
- **`Dockerfile`** — production-ready multi-stage build.

This skill is technology-agnostic and works for frontend, backend, and fullstack projects.

## When to Use

- Setting up a Dev Container for the first time.
- Onboarding a new developer to a reproducible environment.
- Adding a production Dockerfile to an existing project.
- Isolating project tooling from the developer's personal machine.

## Procedure

Follow these steps in order. Do not skip phases.

---

### Phase 1 — Interview (pt-BR)

Ask the user all questions below **in Brazilian Portuguese**, one group at a time.
Wait for answers before proceeding. Flag ambiguity before continuing.

#### Group A — Runtime & Language

```
1. Qual é o tipo de projeto?
   (a) Frontend (SPA / SSR)
   (b) Backend (API / serviço)
   (c) Fullstack (monorepo ou aplicação unificada)

2. Qual linguagem/runtime principal será utilizada?
   Exemplos: Node.js, Python, Go, Java, Rust, PHP, Ruby, .NET
   Se Node.js: qual versão? (ex: 20, 22)
   Se outra: qual versão?

3. Qual gerenciador de pacotes / ferramenta de build?
   Exemplos: npm, pnpm, yarn, pip, poetry, gradle, maven, cargo, composer
```

#### Group B — Services & Ports

```
4. A aplicação depende de algum serviço externo em desenvolvimento?
   Exemplos: banco de dados (PostgreSQL, MySQL, MongoDB, Redis), broker (Kafka, RabbitMQ), storage (MinIO)
   Se sim: liste os serviços e versões desejadas.

5. Quais portas a aplicação expõe em desenvolvimento?
   Exemplos: 3000, 8080, 5173

6. A aplicação precisa de algum serviço de proxy reverso ou HTTPS local?
   (Nginx, Caddy, mkcert, etc.)
```

#### Group C — Environment & Secrets

```
7. Existem variáveis de ambiente necessárias para o desenvolvimento?
   Se sim: liste os nomes (não os valores). Exemplo: DATABASE_URL, API_KEY.
   Elas devem vir de um arquivo .env.local, .env.development ou outro?

8. Algum segredo ou credencial de serviço externo precisa ser injetado no container?
   (ex: chaves AWS, Firebase service account)
```

#### Group D — Tooling & Extensions

```
9. Quais ferramentas de CLI são necessárias dentro do container?
   Exemplos: git, curl, jq, make, awscli, firebase-tools, prisma, dotnet-ef

10. Quais extensões do VS Code são indispensáveis para esse projeto?
    Exemplos: ESLint, Prettier, GitLens, Python, Go, Java Extension Pack
    Lista somente o que for específico do projeto — extensões pessoais ficam fora.

11. O container precisa de acesso ao Docker socket do host (Docker-in-Docker)?
    (necessário para rodar containers dentro do container)
```

#### Group E — Production Build

```
12. Como a aplicação é construída para produção?
    Exemplos: `npm run build`, `go build`, `mvn package`, `pip install + gunicorn`

13. Qual é o artefato final de produção?
    Exemplos: pasta `dist/`, binário único, JAR, imagem estática servida por Nginx

14. Qual servidor/processo roda a aplicação em produção?
    Exemplos: Nginx (para SPAs), Node.js (para SSR/API), Gunicorn, JVM, binário Go
    Se Nginx: a aplicação tem roteamento client-side (SPA)? Nginx precisará de `try_files`.

15. A imagem de produção precisa ser mínima (Alpine) ou compatível com glibc (Debian slim)?
    Padrão recomendado: Alpine para binários e Go; Debian slim para Node.js e Python.
```

---

### Phase 2 — Validate & Confirm

After collecting all answers, present a **summary in English** of what will be generated:

```
## Summary: Files to be Generated

| File | Purpose |
|------|---------|
| `.devcontainer/devcontainer.json` | Dev container configuration |
| `.devcontainer/Dockerfile` | Dev container image |
| `.devcontainer/docker-compose.yml` | Orchestration (if services needed) |
| `Dockerfile` | Production multi-stage build |
| `.dockerignore` | Files excluded from Docker context |
| `.env.example` | Template for required env vars (if declared) |
```

Ask the user to confirm or adjust before generating.

---

### Phase 3 — Generate Files

Generate all confirmed files following the rules below.

#### `.devcontainer/devcontainer.json` Rules

- Use `"dockerComposeFile"` if services were declared; otherwise use `"build"` with local Dockerfile.
- Always set `"remoteUser": "node"` (or equivalent non-root user for the runtime).
- Always define `"customizations.vscode.extensions"` with only the project-specific extensions provided.
- Always define `"customizations.vscode.settings"` with at minimum `"editor.formatOnSave": true`.
- Set `"forwardPorts"` from the declared application ports.
- Set `"postCreateCommand"` to install dependencies (e.g., `npm install`, `pip install -r requirements.txt`).
- Do NOT include personal extensions (themes, keybindings, unrelated language tools).
- Use `"features"` from `ghcr.io/devcontainers/features` to add CLI tools when possible (avoids custom shell scripts).

Reference: [devcontainer.json templates](./references/runtime-templates.md#devcontainer)

#### `.devcontainer/Dockerfile` (dev image) Rules

> **INVIOLABLE RULE — Development Dockerfile must NEVER use multi-stage build.**
> It must be a single `FROM` instruction followed by setup steps only.
> Multi-stage builds are exclusively for the production `Dockerfile` at the project root.

- Base image: use the official `mcr.microsoft.com/devcontainers/` image for the runtime when available.
  - Node.js: `mcr.microsoft.com/devcontainers/javascript-node:{version}`
  - Python: `mcr.microsoft.com/devcontainers/python:{version}`
  - Go: `mcr.microsoft.com/devcontainers/go:{version}`
  - Java: `mcr.microsoft.com/devcontainers/java:{version}`
  - Generic: `mcr.microsoft.com/devcontainers/base:ubuntu`
- Single stage only: `FROM` → optional tool installs → done.
- Install only tools not available as devcontainer features.
- Keep the image lean — avoid `apt-get upgrade` without pinning versions.
- Do NOT run build commands (`npm run build`, `go build`, etc.) — the dev container is for development, not building artifacts.

Reference: [Dev Dockerfile templates](./references/runtime-templates.md#dev-dockerfile-patterns)

#### `docker-compose.yml` (dev only) Rules

- Only generate if external services (database, broker, etc.) were declared.
- Place in `.devcontainer/`.
- The application service uses `build: { context: .., dockerfile: .devcontainer/Dockerfile }`.
- Declare named volumes for all stateful services.
- Use official images with pinned minor version tags (e.g., `postgres:16-alpine`).
- Expose ports only to `127.0.0.1` (e.g., `"127.0.0.1:5432:5432"`).

#### `Dockerfile` (production) Rules

- **Always use multi-stage build.**
- Stage naming convention:
  - `FROM ... AS deps` — install only production dependencies.
  - `FROM ... AS builder` — compile / build the artifact.
  - `FROM ... AS runner` — minimal final image with only the runtime artifact.
- Never copy `node_modules/`, `.git/`, `tests/`, or dev tool config files into the runner stage.
- Set `USER` to a non-root user in the runner stage.
- Expose only the production port.
- Use `CMD` (not `ENTRYPOINT`) unless the image is a CLI tool.
- Add `HEALTHCHECK` instruction for services with an HTTP endpoint.
- For SPAs served by Nginx:
  - Load the `nginx.conf` template from [./references/runtime-templates.md#nginx-spa](./references/runtime-templates.md#nginx-spa).
  - Always include `try_files $uri /index.html;` for client-side routing.

#### `.dockerignore` Rules

- Always exclude: `.git`, `node_modules`, `.env*` (except `.env.example`), `*.log`, `dist/`, `build/`, `.devcontainer/`, `tests/`, `coverage/`, `*.md`.
- Add runtime-specific exclusions (e.g., `__pycache__`, `target/` for Java/Rust).

#### `.env.example` Rules

- Only generate if env vars were declared.
- List all variable names with placeholder values and a comment describing each.
- Never include real secrets or production credentials.

---

### Phase 4 — Post-Generation Checklist

After all files are created, verify:

- [ ] `devcontainer.json` references the correct Dockerfile or docker-compose file.
- [ ] `.devcontainer/Dockerfile` is a **single-stage** image — verify it has exactly ONE `FROM` instruction.
- [ ] Production `Dockerfile` (root) has at least 3 stages (`deps`, `builder`, `runner`).
- [ ] No secrets or credentials appear in any generated file.
- [ ] `.dockerignore` exists and excludes `.env*` files.
- [ ] All declared ports appear in `forwardPorts` and `EXPOSE` as appropriate.
- [ ] Non-root user is set in both dev and production images.
- [ ] `postCreateCommand` installs project dependencies.
- [ ] Remind the user to add `.devcontainer/` to `.gitignore` if the team should not share the config, OR keep it versioned for team onboarding (recommended).

Deliver a brief summary of what was generated and the next steps to open the project in a Dev Container (Reopen in Container via VS Code command palette).

---

## Security Constraints

- Never write secrets or credentials into generated files.
- `.env*` must always be in `.dockerignore`.
- Production image must run as a non-root user.
- Expose only necessary ports — bind to `127.0.0.1` in development compose files.

## IDE Compatibility

This skill is IDE-agnostic (VS Code, Cursor, Windsurf, and other SKILL.md-compatible environments).
Natural language invocation is equally valid to slash command.
