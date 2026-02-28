# Supabase Migrations

Database migrations are versioned here using Supabase CLI conventions.

## Creating a new migration

```bash
npx supabase migration new <name>
```

## Applying migrations locally

```bash
npx supabase db reset
```

## Deployment

- **Staging**: Auto-deployed via CI on push to main
- **Production**: Manual via `npx supabase db push --db-url <prod-url>`
