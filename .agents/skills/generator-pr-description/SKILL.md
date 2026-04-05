---
name: generator-pr-description
description: "Gera e abre PRs para pull requests. Use quando: criar PR, escrever descrição de pull request, gerar descrição de PR, abrir PR no GitHub ou documentar mudanças da branch. Compara a branch atual com a branch base, analisa TODAS as modificações em conjunto e gera UMA descrição unificada em pt-BR seguindo o template do projeto (.github/pull_request_template.md) ou um template padrão embutido. Salva o resultado em pr-description.md. Se a GitHub CLI estiver instalada, oferece a opção de abrir o PR diretamente no GitHub após revisão e confirmação do usuário."
argument-hint: "<base-branch> (optional — detected automatically if omitted)"
---

# PR Description Generator

## Objective

Analyze the complete set of changes in the current branch compared to the **base branch** (the branch from which the current branch was created) and produce **a single coherent** PR description following the project template.

> **CRITICAL RULE**: The description must be **single and consolidated**. Never create one description per commit or per file. Analyze the changes as a whole and write one unified narrative.

> **LANGUAGE RULE**: The final PR description must always be written in **pt-BR (Brazilian Portuguese)**.

## Template Priority

Before writing the description, resolve which template to use:

1. **Check for project template** — Look for `.github/pull_request_template.md` in the workspace root.
   - If the file **exists**, read it and use it as the structure. This takes priority over the default template.
2. **Fallback to default template** — If `.github/pull_request_template.md` does **not** exist, use the [default template](./assets/default-template.md) embedded in this skill.

## Procedure

### Step 1 — Discover the current branch and the base branch

```bash
# Current branch
git rev-parse --abbrev-ref HEAD

# Detect base branch via reflog
git reflog | grep -E "branch: Created from|checkout: moving from" | head -5

# List recent local branches for context
git branch --sort=-committerdate | head -15
```

Auto-detection rules:

- Look for `checkout: moving from <origin> to <current>` — the branch immediately before the first commit in the current branch is the base.
- If detection is ambiguous, ask the user.
- The base branch is **not necessarily** `main` or `develop`; it can be any feature branch.

### Step 1.1 — Resolve task source and link

```bash
git rev-parse --abbrev-ref HEAD | grep -oE '[A-Z]+-[0-9]+' | head -1
```

Ask the user in pt-BR where the task is tracked (e.g., Jira, GitHub, Trello, Linear, Azure Boards, other).

Rules:

- If the task is in **Jira**:
  - Ask for the Jira workspace/domain (example: `xpto`).
  - Try to extract the task key from the current branch using the command above.
  - If no key is found, ask the user for the Jira key manually.
  - Build the Jira URL dynamically as: `https://<WORKSPACE>.atlassian.net/browse/<TASK_KEY>`.
- If the task is in **another platform**:
  - Ask the user to provide the direct task URL.
  - Add this URL as-is to the PR description (do not transform it).

Examples:

- Jira: `https://xpto.atlassian.net/browse/XYZ-504`
- GitHub Issue: `https://github.com/org/repo/issues/123`
- Trello card: `https://trello.com/c/abc12345`

### Step 2 — Collect the changes

Replace `<BASE_BRANCH>` with the resolved base branch name.

```bash
# 1. List of changed files
git diff <BASE_BRANCH>...HEAD --name-status

# 2. Change statistics
git diff <BASE_BRANCH>...HEAD --stat

# 3. Full diff (limit to avoid context overflow)
git diff <BASE_BRANCH>...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' | head -500

# 4. Commits for supporting context only
git log <BASE_BRANCH>...HEAD --oneline --no-merges
```

Commits are **supporting context only** — do not build one description per commit.

### Step 3 — Resolve the template

1. Check: does `.github/pull_request_template.md` exist in the workspace root?
   - **Yes** → read and load that file as the template structure.
   - **No** → load [./assets/default-template.md](./assets/default-template.md) as the template structure.

### Step 4 — Analyze the changes

Using the collected diff and the resolved template, identify:

- **What changed**: features, components, services, DTOs, configs, etc.
- **Why**: problem solved or improvement made (infer from code; if unclear, leave as `_a ser preenchido pelo autor_`)
- **Impact**: other modules, routes, API contracts, env vars, migrations
- **How to test**: concrete user flows or scenarios
- **Change type**: bug fix, new feature, refactoring, performance, docs, or config

### Step 5 — Write the description

Fill **all** sections of the resolved template with concrete information from the diff. Avoid generic or vague text. Mark the correct change type(s) with `[x]`.

Write the entire output in **pt-BR**.

### Step 6 — Save to file

Save the generated description to `pr-description.md` at the **project root** (not in subfolders).

The file must contain only the filled description — no extra metadata, headers, or commit lists.

### Step 7 — Check for GitHub CLI and offer PR creation

Check if the GitHub CLI is installed:

```bash
gh --version
```

- **If the command fails** (CLI not installed): skip to Step 8 (generate-only flow).
- **If the CLI is installed**: ask the user in pt-BR:

  > "A GitHub CLI está instalada. Deseja abrir o PR diretamente no GitHub agora?"

#### Step 7a — User chooses to open the PR on GitHub

Ask the following questions, one at a time, in pt-BR:

1. **Título do PR**: "Qual será o título do PR?"
2. **Rascunho**: "Deseja abrir o PR como rascunho (draft)? (sim/não)"
3. **Branch base**: "Qual é a branch base do PR?" _(pre-fill with the base branch detected in Step 1; allow the user to confirm or override)_
4. **Responsável**: "Qual é o seu nome de usuário no GitHub para assinar o PR?"

##### Step 7a.1 — Review the generated description

After collecting the answers, ask the user to review the generated file before proceeding:

> "O arquivo `pr-description.md` foi gerado. Por favor, revise o conteúdo e faça os ajustes necessários. Quando estiver pronto, confirme para continuar e abrir o PR."

Wait for explicit confirmation from the user before proceeding. Do **not** run the CLI command until the user confirms.

##### Step 7a.2 — Open the PR via CLI

After confirmation, run:

```bash
gh pr create \
  --title "<TITLE>" \
  --body-file pr-description.md \
  --base <BASE_BRANCH> \
  --assignee <GITHUB_USERNAME> \
  [--draft]   # include only if user chose draft
```

##### Step 7a.3 — Remove the description file

After the PR is successfully created, delete the `pr-description.md` file as it is no longer needed:

```bash
rm pr-description.md
```

Then report to the user:

- PR URL returned by the CLI
- Branch base used
- Whether it was opened as draft or not
- Confirmation that `pr-description.md` was removed

#### Step 7b — User chooses NOT to open on GitHub

Continue to Step 8 normally.

### Step 8 — Confirm to the user

Report briefly:

- Which base branch was used
- Which template was used (project template or default)
- Number of changed files
- Output path: `pr-description.md`
- If the PR was opened on GitHub: include the PR URL

## Invocation Examples

```
/generator-pr-description
/generator-pr-description feature/PFC-44/elo-xpays
/generator-pr-description develop
/generator-pr-description main
```

## Important Notes

- Never list commits as separate bullets in the description.
- If the diff is very large, focus on the most significant files (services, controllers, DTOs, main modules).
- The `pr-description.md` file is overwritten on each run.
- If the base branch cannot be detected and the user does not provide it, ask in pt-BR before proceeding.
