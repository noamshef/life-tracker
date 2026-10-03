import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')

fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(path.join(dataDir, 'tracker.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_entries (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/entries', (req, res) => {
  const date = req.query.date

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'A date query parameter is required.' })
  }

  const row = db
    .prepare('SELECT payload FROM daily_entries WHERE date = ?')
    .get(date)

  if (!row) {
    return res.json({})
  }

  try {
    return res.json(JSON.parse(row.payload))
  } catch {
    return res.json({})
  }
})

app.post('/api/entries', (req, res) => {
  const { date, payload } = req.body ?? {}

  if (!date || !payload) {
    return res.status(400).json({ error: 'date and payload are required.' })
  }

  const updatedAt = new Date().toISOString()
  const record = {
    id: `day-${date}`,
    date,
    payload: JSON.stringify(payload),
    updated_at: updatedAt,
  }

  db.prepare(`
    INSERT INTO daily_entries (id, date, payload, updated_at)
    VALUES (@id, @date, @payload, @updated_at)
    ON CONFLICT(date) DO UPDATE SET
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `).run(record)

  return res.json({ ok: true, date, updatedAt })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Life tracker API running at http://localhost:${PORT}`)
})
