import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import './App.css'

type HealthyChoice = 'healthy' | 'neutral' | 'unhealthy'

type FoodEntry = {
  id: number
  text: string
  healthy: HealthyChoice
  protein: number
  carbs: number
  fat: number
  calories: number
}

type ExpenseEntry = {
  id: number
  name: string
  category: string
  amount: string
}

type DailyForm = {
  date: string
  foods: FoodEntry[]
  exercised: boolean
  exerciseText: string
  exerciseCalories: number
  phoneMinutes: string
  happiness: number
  highlightText: string
  photoDataUrl: string
  expenses: ExpenseEntry[]
  sleepHours: string
}

const STORAGE_KEY_PREFIX = 'daily-life-tracker-v1:'
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const REMOTE_SYNC_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

const createFoodEntry = (): FoodEntry => ({
  id: Date.now() + Math.random(),
  text: '',
  healthy: 'neutral',
  protein: 0,
  carbs: 0,
  fat: 0,
  calories: 0,
})

const createExpenseEntry = (): ExpenseEntry => ({
  id: Date.now() + Math.random(),
  name: '',
  category: 'Food',
  amount: '',
})

const defaultForm = (): DailyForm => ({
  date: new Date().toISOString().slice(0, 10),
  foods: [createFoodEntry()],
  exercised: false,
  exerciseText: '',
  exerciseCalories: 0,
  phoneMinutes: '',
  happiness: 3,
  highlightText: '',
  photoDataUrl: '',
  expenses: [createExpenseEntry()],
  sleepHours: '',
})

const normalizeForm = (draft?: Partial<DailyForm>): DailyForm => {
  const base = defaultForm()
  return {
    ...base,
    ...draft,
    foods: draft?.foods?.length ? draft.foods : [createFoodEntry()],
    expenses: draft?.expenses?.length ? draft.expenses : [createExpenseEntry()],
  }
}

const getLocalKey = (date: string) => `${STORAGE_KEY_PREFIX}${date}`

const readLocalEntry = (date: string): DailyForm | null => {
  const savedValue = localStorage.getItem(getLocalKey(date))
  if (!savedValue) return null

  try {
    const parsed = JSON.parse(savedValue) as Partial<DailyForm>
    return normalizeForm(parsed)
  } catch {
    return null
  }
}

const estimateMeal = (rawText: string) => {
  const section = rawText.toLowerCase().trim()
  if (!section) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0 }
  }

  const entries = [
    { key: 'egg', protein: 6, carbs: 1, fat: 5, calories: 70 },
    { key: 'eggs', protein: 12, carbs: 1, fat: 10, calories: 140 },
    { key: 'chicken', protein: 30, carbs: 0, fat: 7, calories: 180 },
    { key: 'salmon', protein: 25, carbs: 0, fat: 15, calories: 240 },
    { key: 'fish', protein: 23, carbs: 0, fat: 12, calories: 200 },
    { key: 'tofu', protein: 18, carbs: 5, fat: 11, calories: 180 },
    { key: 'rice', protein: 3, carbs: 40, fat: 1, calories: 180 },
    { key: 'oat', protein: 5, carbs: 27, fat: 3, calories: 150 },
    { key: 'bread', protein: 4, carbs: 25, fat: 2, calories: 120 },
    { key: 'pasta', protein: 8, carbs: 38, fat: 3, calories: 190 },
    { key: 'banana', protein: 1, carbs: 27, fat: 0, calories: 105 },
    { key: 'apple', protein: 0, carbs: 25, fat: 0, calories: 95 },
    { key: 'yogurt', protein: 12, carbs: 7, fat: 4, calories: 110 },
    { key: 'cereal', protein: 5, carbs: 25, fat: 2, calories: 130 },
    { key: 'pizza', protein: 12, carbs: 34, fat: 10, calories: 300 },
    { key: 'burger', protein: 26, carbs: 30, fat: 18, calories: 420 },
    { key: 'pita', protein: 6, carbs: 35, fat: 2, calories: 170 },
    { key: 'salad', protein: 4, carbs: 10, fat: 2, calories: 90 },
    { key: 'beans', protein: 15, carbs: 20, fat: 1, calories: 160 },
    { key: 'lentils', protein: 18, carbs: 25, fat: 1, calories: 180 },
  ]

  let protein = 0
  let carbs = 0
  let fat = 0
  let calories = 0

  entries.forEach(({ key, protein: p, carbs: c, fat: f, calories: cal }) => {
    if (section.includes(key)) {
      protein += p
      carbs += c
      fat += f
      calories += cal
    }
  })

  if (protein === 0 && carbs === 0 && fat === 0) {
    protein = 25
    carbs = 30
    fat = 18
    calories = 390
  }

  return {
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    calories: Math.round(calories),
  }
}

const estimateExercise = (rawText: string) => {
  const section = rawText.toLowerCase().trim()
  if (!section) {
    return 0
  }

  const durationMatch = section.match(/(\d+)\s*(min|minute|minutes|hr|hrs|hour|hours)/)
  const durationMinutes = durationMatch
    ? Number(durationMatch[1]) * (durationMatch[2].startsWith('h') ? 60 : 1)
    : 30

  let caloriesPer30Minutes = 180

  if (/(run|jog|sprint|interval)/.test(section)) caloriesPer30Minutes = 320
  if (/(walk|hike|stairs)/.test(section)) caloriesPer30Minutes = 170
  if (/(cycle|bike|spin)/.test(section)) caloriesPer30Minutes = 260
  if (/(lift|weight|strength|gym)/.test(section)) caloriesPer30Minutes = 240
  if (/(swim|laps)/.test(section)) caloriesPer30Minutes = 300
  if (/(yoga|stretch|mobility)/.test(section)) caloriesPer30Minutes = 120
  if (/(boxing|kickboxing|martial)/.test(section)) caloriesPer30Minutes = 360

  return Math.round((durationMinutes / 30) * caloriesPer30Minutes)
}

const loadRemoteEntry = async (date: string): Promise<DailyForm | null> => {
  if (!REMOTE_SYNC_ENABLED || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/daily_entries?date=eq.${encodeURIComponent(date)}&select=payload`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    )

    if (!response.ok) {
      return null
    }

    const rows = (await response.json()) as Array<{ payload: Partial<DailyForm> }>
    const firstRow = rows[0]
    if (!firstRow?.payload) {
      return null
    }

    return normalizeForm(firstRow.payload)
  } catch {
    return null
  }
}

const saveRemoteEntry = async (date: string, payload: DailyForm): Promise<boolean> => {
  if (!REMOTE_SYNC_ENABLED || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return false
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_entries`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ date, payload }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.warn('Supabase save failed:', text)
      return false
    }

    return true
  } catch (error) {
    console.warn('Supabase save error:', error)
    return false
  }
}

function App() {
  const [form, setForm] = useState<DailyForm>(() => {
    const localEntry = readLocalEntry(new Date().toISOString().slice(0, 10))
    return localEntry ?? defaultForm()
  })
  const [saveState, setSaveState] = useState('Saved locally')

  useEffect(() => {
    let ignore = false

    const loadDay = async () => {
      const localEntry = readLocalEntry(form.date)

      try {
        const remoteEntry = await loadRemoteEntry(form.date)

        if (remoteEntry && !ignore) {
          setForm(normalizeForm(remoteEntry))
          return
        }

        if (localEntry && !ignore) {
          setForm(normalizeForm(localEntry))
        }
      } catch {
        if (localEntry && !ignore) {
          setForm(normalizeForm(localEntry))
        }
      }
    }

    void loadDay()
    return () => {
      ignore = true
    }
  }, [form.date])

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const currentEntry = normalizeForm(form)
      localStorage.setItem(getLocalKey(form.date), JSON.stringify(currentEntry))

      const remoteSaved = await saveRemoteEntry(form.date, currentEntry)

      if (remoteSaved) {
        setSaveState(`Synced to cloud • ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`)
      } else {
        setSaveState(`Saved locally • ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [form])

  const totalExpense = useMemo(
    () =>
      form.expenses.reduce((sum, expense) => {
        const value = Number(expense.amount)
        return sum + (Number.isFinite(value) ? value : 0)
      }, 0),
    [form.expenses],
  )

  const totalFoodCalories = useMemo(
    () => form.foods.reduce((sum, food) => sum + food.calories, 0),
    [form.foods],
  )

  const updateFoodEntry = (entryId: number, field: 'text' | 'healthy', value: string | HealthyChoice) => {
    setForm((current) => ({
      ...current,
      foods: current.foods.map((food) => {
        if (food.id !== entryId) {
          return food
        }

        const nextFood = {
          ...food,
          [field]: value,
        }

        const estimate = estimateMeal(field === 'text' ? String(value) : food.text)

        return {
          ...nextFood,
          protein: estimate.protein,
          carbs: estimate.carbs,
          fat: estimate.fat,
          calories: estimate.calories,
        }
      }),
    }))
  }

  const addFoodEntry = () => {
    setForm((current) => ({
      ...current,
      foods: [...current.foods, createFoodEntry()],
    }))
  }

  const removeFoodEntry = (entryId: number) => {
    setForm((current) => ({
      ...current,
      foods: current.foods.length > 1 ? current.foods.filter((food) => food.id !== entryId) : current.foods,
    }))
  }

  const addExpenseEntry = () => {
    setForm((current) => ({
      ...current,
      expenses: [...current.expenses, createExpenseEntry()],
    }))
  }

  const updateExpenseEntry = (expenseId: number, field: 'name' | 'category' | 'amount', value: string) => {
    setForm((current) => ({
      ...current,
      expenses: current.expenses.map((expense) =>
        expense.id === expenseId ? { ...expense, [field]: value } : expense,
      ),
    }))
  }

  const removeExpenseEntry = (expenseId: number) => {
    setForm((current) => ({
      ...current,
      expenses: current.expenses.length > 1 ? current.expenses.filter((expense) => expense.id !== expenseId) : current.expenses,
    }))
  }

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        photoDataUrl: String(reader.result ?? ''),
      }))
    }
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    const fresh = defaultForm()
    setForm(fresh)
    localStorage.setItem(getLocalKey(fresh.date), JSON.stringify(fresh))
    setSaveState('Saved locally')
  }

  return (
    <main className="tracker-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Daily rhythm</p>
          <h1>Life tracker</h1>
        </div>
        <div className="header-actions">
          <span className="save-state">{saveState}</span>
          <button type="button" className="secondary-button" onClick={resetForm}>
            Reset day
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Food</span>
          <strong>{totalFoodCalories} kcal</strong>
        </article>
        <article className="summary-card">
          <span>Exercise</span>
          <strong>{form.exerciseCalories || 0} kcal</strong>
        </article>
        <article className="summary-card">
          <span>Happiness</span>
          <strong>{form.happiness}/5</strong>
        </article>
        <article className="summary-card">
          <span>Expenses</span>
          <strong>₪{totalExpense.toFixed(2)}</strong>
        </article>
      </section>

      <section className="daily-form">
        <div className="date-row panel">
          <label className="field-label">
            Date
            <input
              type="date"
              value={form.date}
              onChange={(event) => {
                const nextDate = event.target.value
                setForm((current) => ({ ...current, date: nextDate }))
              }}
            />
          </label>
        </div>

        <div className="panel">
          <div className="section-header">
            <h2>Food</h2>
            <button type="button" className="small-button" onClick={addFoodEntry}>
              + Add meal
            </button>
          </div>

          {form.foods.map((food, index) => {
            const estimate = food.text ? estimateMeal(food.text) : { protein: 0, carbs: 0, fat: 0, calories: 0 }

            return (
              <div key={food.id} className="stack-card">
                <div className="meal-header">
                  <h3>Meal {index + 1}</h3>
                  {form.foods.length > 1 && (
                    <button type="button" className="danger-button" onClick={() => removeFoodEntry(food.id)}>
                      Remove
                    </button>
                  )}
                </div>

                <label className="field-label">
                  What did you eat?
                  <textarea
                    placeholder="Example: chicken salad with rice and yogurt"
                    value={food.text}
                    onChange={(event) => updateFoodEntry(food.id, 'text', event.target.value)}
                  />
                </label>

                <div className="inline-row">
                  <label className="field-label compact">
                    Healthy?
                    <select
                      value={food.healthy}
                      onChange={(event) => updateFoodEntry(food.id, 'healthy', event.target.value as HealthyChoice)}
                    >
                      <option value="healthy">Healthy</option>
                      <option value="neutral">Neutral</option>
                      <option value="unhealthy">Not so healthy</option>
                    </select>
                  </label>
                </div>

                <div className="macro-grid">
                  <div className="macro-box">
                    <span>Protein</span>
                    <strong>{estimate.protein}g</strong>
                  </div>
                  <div className="macro-box">
                    <span>Carbs</span>
                    <strong>{estimate.carbs}g</strong>
                  </div>
                  <div className="macro-box">
                    <span>Fat</span>
                    <strong>{estimate.fat}g</strong>
                  </div>
                  <div className="macro-box accent">
                    <span>Calories</span>
                    <strong>{estimate.calories} kcal</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="panel">
          <div className="section-header">
            <h2>Exercise</h2>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.exercised}
              onChange={(event) => {
                const exercised = event.target.checked
                setForm((current) => ({
                  ...current,
                  exercised,
                  exerciseCalories: exercised ? estimateExercise(current.exerciseText) : 0,
                }))
              }}
            />
            I exercised today
          </label>

          {form.exercised && (
            <>
              <label className="field-label">
                Exercise details
                <textarea
                  placeholder="Example: 35 minute run + 15 minute mobility"
                  value={form.exerciseText}
                  onChange={(event) => {
                    const value = event.target.value
                    setForm((current) => ({
                      ...current,
                      exerciseText: value,
                      exerciseCalories: estimateExercise(value),
                    }))
                  }}
                />
              </label>

              <div className="estimate-banner">
                Approximate calories burned: <strong>{form.exerciseCalories} kcal</strong>
              </div>
            </>
          )}
        </div>

        <div className="panel two-col">
          <div>
            <h2>Phone time</h2>
            <label className="field-label compact">
              Minutes on phone
              <input
                type="number"
                min="0"
                value={form.phoneMinutes}
                onChange={(event) => setForm((current) => ({ ...current, phoneMinutes: event.target.value }))}
              />
            </label>
          </div>

          <div>
            <h2>Sleep time</h2>
            <label className="field-label compact">
              Hours slept
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.sleepHours}
                onChange={(event) => setForm((current) => ({ ...current, sleepHours: event.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="section-header">
            <h2>Happiness</h2>
          </div>

          <div className="rating-row">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={form.happiness === value ? 'rating-button active' : 'rating-button'}
                onClick={() => setForm((current) => ({ ...current, happiness: value }))}
              >
                {value}
              </button>
            ))}
          </div>

          <label className="field-label">
            Highlight of the day (optional)
            <textarea
              placeholder="What was the best part today?"
              value={form.highlightText}
              onChange={(event) => setForm((current) => ({ ...current, highlightText: event.target.value }))}
            />
          </label>

          <label className="field-label">
            Add photo (optional)
            <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          </label>

          {form.photoDataUrl && (
            <div className="photo-preview">
              <img src={form.photoDataUrl} alt="Daily highlight" />
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-header">
            <h2>Expenses</h2>
            <button type="button" className="small-button" onClick={addExpenseEntry}>
              + Add expense
            </button>
          </div>

          <div className="expense-table">
            <div className="table-header">
              <span>Name</span>
              <span>Category</span>
              <span>₪ Total</span>
              <span></span>
            </div>

            {form.expenses.map((expense) => (
              <div key={expense.id} className="table-row">
                <input
                  type="text"
                  value={expense.name}
                  placeholder="Groceries"
                  onChange={(event) => updateExpenseEntry(expense.id, 'name', event.target.value)}
                />
                <input
                  type="text"
                  value={expense.category}
                  placeholder="Food"
                  onChange={(event) => updateExpenseEntry(expense.id, 'category', event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={expense.amount}
                  placeholder="0"
                  onChange={(event) => updateExpenseEntry(expense.id, 'amount', event.target.value)}
                />
                <button type="button" className="danger-button" onClick={() => removeExpenseEntry(expense.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="total-row">
            <span>Total today</span>
            <strong>₪{totalExpense.toFixed(2)}</strong>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
