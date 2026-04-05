# Runtime Templates Reference

Canonical templates for each supported runtime. The agent loads this file when generating files in Phase 3.

> **INVIOLABLE RULE**
> `.devcontainer/Dockerfile` → single-stage, for development only.
> `Dockerfile` (project root) → multi-stage, for production only.
> Never mix these two concerns in the same file.

---

## Dev Dockerfile Patterns

Simple, **single-stage** Dockerfiles used exclusively by `.devcontainer/`.  
Do NOT add build steps, artifact copying, or multi-stage patterns here.

### Node.js (dev)

```dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:{{VERSION}}

# Install extra CLI tools not available as devcontainer features
RUN apt-get update && apt-get install -y --no-install-recommends \
    {{EXTRA_PACKAGES}} \
    && rm -rf /var/lib/apt/lists/*
```

### Python (dev)

```dockerfile
FROM mcr.microsoft.com/devcontainers/python:{{VERSION}}

RUN apt-get update && apt-get install -y --no-install-recommends \
    {{EXTRA_PACKAGES}} \
    && rm -rf /var/lib/apt/lists/*
```

### Go (dev)

```dockerfile
FROM mcr.microsoft.com/devcontainers/go:{{VERSION}}

RUN apt-get update && apt-get install -y --no-install-recommends \
    {{EXTRA_PACKAGES}} \
    && rm -rf /var/lib/apt/lists/*
```

### Java (dev)

```dockerfile
FROM mcr.microsoft.com/devcontainers/java:{{VERSION}}

RUN apt-get update && apt-get install -y --no-install-recommends \
    {{EXTRA_PACKAGES}} \
    && rm -rf /var/lib/apt/lists/*
```

### Generic / Any runtime (dev)

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu

RUN apt-get update && apt-get install -y --no-install-recommends \
    {{EXTRA_PACKAGES}} \
    && rm -rf /var/lib/apt/lists/*
```

> If no extra packages are needed, omit the `RUN` block entirely — the base image is sufficient.

---

## devcontainer

### Node.js (no external services)

```json
{
  "name": "{{PROJECT_NAME}}",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "remoteUser": "node",
  "forwardPorts": [{{PORTS}}],
  "postCreateCommand": "{{INSTALL_COMMAND}}",
  "customizations": {
    "vscode": {
      "extensions": [{{EXTENSIONS}}],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  }
}
```

### Node.js (with external services via docker-compose)

```json
{
  "name": "{{PROJECT_NAME}}",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "remoteUser": "node",
  "forwardPorts": [{{PORTS}}],
  "postCreateCommand": "{{INSTALL_COMMAND}}",
  "customizations": {
    "vscode": {
      "extensions": [{{EXTENSIONS}}],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  }
}
```

### Python

```json
{
  "name": "{{PROJECT_NAME}}",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "remoteUser": "vscode",
  "forwardPorts": [{{PORTS}}],
  "postCreateCommand": "pip install -r requirements.txt",
  "customizations": {
    "vscode": {
      "extensions": [{{EXTENSIONS}}],
      "settings": {
        "editor.formatOnSave": true,
        "python.defaultInterpreterPath": "/usr/local/bin/python"
      }
    }
  }
}
```

### Go

```json
{
  "name": "{{PROJECT_NAME}}",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "remoteUser": "vscode",
  "forwardPorts": [{{PORTS}}],
  "postCreateCommand": "go mod download",
  "customizations": {
    "vscode": {
      "extensions": [{{EXTENSIONS}}],
      "settings": {
        "editor.formatOnSave": true,
        "[go]": { "editor.defaultFormatter": "golang.go" }
      }
    }
  }
}
```

### Java

```json
{
  "name": "{{PROJECT_NAME}}",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "remoteUser": "vscode",
  "forwardPorts": [{{PORTS}}],
  "postCreateCommand": "{{BUILD_TOOL}} dependency:resolve -q",
  "features": {
    "ghcr.io/devcontainers/features/java:1": {
      "version": "{{VERSION}}",
      "jdkDistro": "ms"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [{{EXTENSIONS}}],
      "settings": {
        "editor.formatOnSave": true,
        "java.configuration.runtimes": [
          {
            "name": "JavaSE-{{VERSION}}",
            "path": "/usr/local/sdkman/candidates/java/current",
            "default": true
          }
        ]
      }
    }
  }
}
```

---

## Production Dockerfile Patterns

### Node.js — SPA (Vite / CRA / Next.js static export)

```dockerfile
# ---- deps ----
FROM node:{{VERSION}}-alpine AS deps
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{INSTALL_CMD}} --frozen-lockfile

# ---- builder ----
FROM node:{{VERSION}}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN {{BUILD_CMD}}

# ---- runner ----
FROM nginx:stable-alpine AS runner
COPY --from=builder /app/{{DIST_FOLDER}} /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE {{PORT}}
CMD ["nginx", "-g", "daemon off;"]
```

### Node.js — API / SSR (Express, Fastify, Next.js server)

```dockerfile
# ---- deps ----
FROM node:{{VERSION}}-alpine AS deps
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{INSTALL_CMD}} --frozen-lockfile --prod

# ---- builder ----
FROM node:{{VERSION}}-alpine AS builder
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{INSTALL_CMD}} --frozen-lockfile
COPY . .
RUN {{BUILD_CMD}}

# ---- runner ----
FROM node:{{VERSION}}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
USER appuser
EXPOSE {{PORT}}
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:{{PORT}}/health || exit 1
CMD ["node", "dist/index.js"]
```

### Python — API (FastAPI / Django / Flask)

```dockerfile
# ---- deps ----
FROM python:{{VERSION}}-slim AS deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- builder ----
FROM python:{{VERSION}}-slim AS builder
WORKDIR /app
COPY --from=deps /usr/local/lib/python{{VERSION}}/site-packages /usr/local/lib/python{{VERSION}}/site-packages
COPY . .

# ---- runner ----
FROM python:{{VERSION}}-slim AS runner
WORKDIR /app
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
COPY --from=builder /app .
COPY --from=deps /usr/local/lib/python{{VERSION}}/site-packages /usr/local/lib/python{{VERSION}}/site-packages
USER appuser
EXPOSE {{PORT}}
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:{{PORT}}/health || exit 1
CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:{{PORT}}", "--workers", "2"]
```

### Go — Binary API

```dockerfile
# ---- builder ----
FROM golang:{{VERSION}}-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/...

# ---- runner ----
FROM scratch AS runner
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE {{PORT}}
USER 65534
HEALTHCHECK --interval=30s --timeout=5s CMD ["/server", "healthcheck"]
CMD ["/server"]
```

### Java — Spring Boot (Maven)

```dockerfile
# ---- builder ----
FROM maven:3.9-eclipse-temurin-{{VERSION}} AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

# ---- runner ----
FROM eclipse-temurin:{{VERSION}}-jre-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/target/*.jar app.jar
USER appuser
EXPOSE {{PORT}}
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:{{PORT}}/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### NestJS — API

```dockerfile
# ---- deps ----
FROM node:{{VERSION}}-alpine AS deps
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{INSTALL_CMD}} --frozen-lockfile

# ---- builder ----
FROM node:{{VERSION}}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN {{INSTALL_CMD}} --frozen-lockfile
RUN {{BUILD_CMD}}

# ---- runner ----
FROM node:{{VERSION}}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
USER appuser
EXPOSE {{PORT}}
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:{{PORT}}/health || exit 1
CMD ["node", "dist/main.js"]
```

### Angular — Static SPA (Nginx)

```dockerfile
# ---- deps ----
FROM node:{{VERSION}}-alpine AS deps
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{INSTALL_CMD}} --frozen-lockfile

# ---- builder ----
FROM node:{{VERSION}}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN {{BUILD_CMD}}

# ---- runner ----
FROM nginx:stable-alpine AS runner
COPY --from=builder /app/dist/{{PROJECT_NAME}}/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE {{PORT}}
CMD ["nginx", "-g", "daemon off;"]
```

> Angular 17+ outputs to `dist/{{PROJECT_NAME}}/browser`. For older versions use `dist/{{PROJECT_NAME}}`.
> Use the [nginx-spa](#nginx-spa) config to support client-side routing.

### Vue — Static SPA (Nginx)

```dockerfile
# ---- deps ----
FROM node:{{VERSION}}-alpine AS deps
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{INSTALL_CMD}} --frozen-lockfile

# ---- builder ----
FROM node:{{VERSION}}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN {{BUILD_CMD}}

# ---- runner ----
FROM nginx:stable-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE {{PORT}}
CMD ["nginx", "-g", "daemon off;"]
```

> Use the [nginx-spa](#nginx-spa) config to support Vue Router in history mode.

### Nuxt — SSR (Node.js server)

```dockerfile
# ---- deps ----
FROM node:{{VERSION}}-alpine AS deps
WORKDIR /app
COPY package.json {{LOCKFILE}} ./
RUN {{INSTALL_CMD}} --frozen-lockfile

# ---- builder ----
FROM node:{{VERSION}}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN {{BUILD_CMD}}

# ---- runner ----
FROM node:{{VERSION}}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/.output ./.output
USER appuser
EXPOSE {{PORT}}
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:{{PORT}}/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
```

> For Nuxt in static/SPA mode (`nuxt generate`), use the Vue — Static SPA pattern and copy `dist/` instead of `.output/`.

---

## nginx-spa

Nginx configuration for Single Page Applications with client-side routing.

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## docker-compose (dev services)

### PostgreSQL + Redis

```yaml
version: "3.9"
services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
    command: sleep infinity
    environment:
      - DATABASE_URL=postgresql://app:app@db:5432/appdb
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: appdb
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

### MongoDB

```yaml
version: "3.9"
services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
    command: sleep infinity
    environment:
      - MONGODB_URI=mongodb://app:app@mongo:27017/appdb

  mongo:
    image: mongo:7
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: app
      MONGO_INITDB_ROOT_PASSWORD: app
      MONGO_INITDB_DATABASE: appdb
    ports:
      - "127.0.0.1:27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

## .dockerignore baseline

```
# Version control
.git
.gitignore

# Dependencies (rebuilt inside image)
node_modules
vendor
__pycache__
*.pyc
target/
.gradle/

# Environment & secrets
.env
.env.*
!.env.example

# Build outputs (rebuilt inside image)
dist/
build/
out/
coverage/

# Dev container config (not needed in production)
.devcontainer/

# Test & documentation
tests/
*.test.*
*.spec.*
*.md
*.log

# OS artifacts
.DS_Store
Thumbs.db
```
