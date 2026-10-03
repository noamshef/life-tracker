# Life Tracker Resume

## Project
- Workspace: c:\Users\maon2\OneDrive\Documents\אישי\tracker-app
- Goal: daily life tracker with food, exercise, happiness, phone time, expenses, sleep, notes/photo
- Status: app built, Supabase sync path added, local fallback in place

## Important files
- src/App.tsx: main tracker UI and sync logic
- src/App.css: styling
- server/index.js: local API for local-first sync
- .env: Supabase credentials
- .env.example: env example
- supabase-schema.sql: SQL schema for Supabase
- README.md: project overview

## Key facts
- Supabase login values should be in .env.
- Without env vars, app falls back to local browser storage.
- To work away from home with the computer off, the frontend must be hosted online, and data must live in Supabase.
- Local home-PC mode still works with npm run dev:full.

## Run commands
- npm install
- npm run dev
- npm run dev:full

## Supabase setup
- Create project in Supabase
- Run SQL from supabase-schema.sql
- Add:
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key

## GitHub
- Install GitHub CLI if needed
- gh auth login
- gh repo create life-tracker --public --source=. --remote=origin --push

## Next restart plan
1. Reopen VS Code
2. Open tracker-app folder
3. Check .env values
4. Run npm install if needed
5. Run npm run dev or npm run dev:full
6. If public remote access is desired, deploy the frontend to a hosted service and keep data in Supabase
