# Life Tracker

A daily tracking app for food, exercise, sleep, happiness, expenses, and notes.

## Features

- quick daily form entries
- food and exercise estimates
- local autosave
- optional Supabase cloud sync
- browser-ready and mobile-friendly UI

## Local setup

1. Install dependencies:
   npm install
2. Create a `.env` file from `.env.example`:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
3. Run locally:
   npm run dev

## Full-stack local mode

npm run dev:full

This runs the frontend and the local API together.

## Supabase setup

Run the SQL in `supabase-schema.sql` in your Supabase project.

## Remote access away from home

To work while your computer is off, the frontend must be deployed to a hosted environment, and the data must live in Supabase.

## GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-url>
git push -u origin main
```
