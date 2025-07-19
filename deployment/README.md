# IFTAA Deployment Guide

## Quick Start for Development

1. **Copy environment file:**
   ```bash
   cd deployment
   cp .env.dev.example .env.dev
   ```

2. **Modify credentials in `.env.dev` if needed** (optional for development)

3. **Start all services:**
   ```bash
   docker-compose --env-file .env.dev up -d
   ```

4. **Check status:**
   ```bash
   docker-compose ps
   ```

## Docker Files Safe for GitHub

✅ **Safe to commit:**
- `Dockerfile.python` - No secrets, uses environment variables
- `src/backend/Dockerfile` - Clean .NET build, no secrets
- `docker-compose.yml` - Uses environment variables, no hardcoded passwords
- `production/docker-compose.prod.yml` - Uses environment variables
- `production/*.prod` Dockerfiles - Production optimized, no secrets

✅ **Configuration templates (safe):**
- `.env.dev.example` - Sample development configuration
- `production/.env.prod.example` - Sample production configuration

🚨 **Protected from GitHub (.gitignore):**
- `.env.dev` - Actual development credentials
- `.env.prod` - Actual production credentials
- `config/config.env` - Sensitive configuration

## Environment Files Structure

```
deployment/
├── .env.dev.example      # ← Safe template (committed)
├── .env.dev             # ← Your actual dev config (ignored)
└── production/
    ├── .env.prod.example # ← Safe template (committed)
    └── .env.prod        # ← Your actual prod config (ignored)
```

## Security Features

- ✅ No hardcoded passwords in Docker files
- ✅ Environment variable separation
- ✅ Production/development configuration isolation
- ✅ Sensitive files protected by .gitignore
- ✅ Sample configurations for easy setup

## Next Steps

1. **Development**: Copy and modify `.env.dev.example` → `.env.dev`
2. **Production**: Copy and modify `production/.env.prod.example` → `production/.env.prod`
3. **Deploy**: Use appropriate docker-compose file with `--env-file` flag