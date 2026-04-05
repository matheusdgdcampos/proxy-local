# Common devcontainer features

Quick reference for `ghcr.io/devcontainers/features` — prefer these over custom shell scripts in the Dockerfile.

| Tool | Feature URI |
|------|-------------|
| Git (latest) | `ghcr.io/devcontainers/features/git:1` |
| Node.js | `ghcr.io/devcontainers/features/node:1` |
| Python | `ghcr.io/devcontainers/features/python:1` |
| Go | `ghcr.io/devcontainers/features/go:1` |
| Java (JDK) | `ghcr.io/devcontainers/features/java:1` |
| Docker-in-Docker | `ghcr.io/devcontainers/features/docker-in-docker:2` |
| Docker CLI (socket) | `ghcr.io/devcontainers/features/docker-outside-of-docker:1` |
| AWS CLI | `ghcr.io/devcontainers/features/aws-cli:1` |
| GitHub CLI | `ghcr.io/devcontainers/features/github-cli:1` |
| Azure CLI | `ghcr.io/devcontainers/features/azure-cli:1` |
| kubectl + Helm | `ghcr.io/devcontainers/features/kubectl-helm-minikube:1` |
| Terraform | `ghcr.io/devcontainers/features/terraform:1` |
| Common utils (curl, jq, zip) | `ghcr.io/devcontainers/features/common-utils:2` |

## Usage in devcontainer.json

```json
{
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "installOhMyZsh": false,
      "upgradePackages": true
    },
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  }
}
```
