# ElectraWireless Business Console

A financial forecasting dashboard for demo day (Saturday). Input sliders drive a live projection of revenue, expenses, and profit — including what-if scenarios like adding a full-time hire.

---

## Project Structure

```
ElectraWireless-Business-Console/
├── backend/
│   ├── main.py          ← FastAPI app (POST /forecast, GET /sample-data)
│   ├── forecast.py      ← Compound-growth projection logic
│   ├── requirements.txt
│   └── sample_data.csv  ← 12 months of realistic demo data (pre-loaded)
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx           ← Root layout, state, API calls
        ├── InputPanel.tsx    ← Sliders + what-if toggles (Cole)
        └── ForecastChart.tsx ← Recharts line chart (Jeffrey)
```

---

## Team

| Person   | Role      |
|----------|-----------|
| Abdullah | Frontend  |
| Jeffrey  | Frontend  |
| Cole     | Backend   |
| Quinn    | Backend   |
| Nishant  | Backend   |

---

## Running the Backend

```bash
cd backend
pip install -r requirements.txt OR python3 -m pip install -r requirements.txt
uvicorn main:app --reload OR python3 -m uvicorn main:app --reload
```

API runs at `http://localhost:8000`

- `GET /` — health check
- `GET /sample-data` — returns 12 months of historical demo data
- `POST /forecast` — accepts JSON body, returns historical + forecast arrays

### Example request

```bash
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "revenue": 40100,
    "expenses": 26000,
    "growth_rate": 0.05,
    "cost_growth_rate": 0.02,
    "months": 12,
    "what_if_annual_cost": 0
  }'
```

---

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`. Vite proxies `/forecast` and `/sample-data` to the backend automatically — no CORS issues.

---

## API Contract (for frontend devs)

`POST /forecast` body:

```ts
{
  revenue: number           // current monthly revenue
  expenses: number          // current monthly expenses
  growth_rate: number       // monthly revenue growth (0.05 = 5%)
  cost_growth_rate: number  // monthly expense growth
  months: number            // periods to project (1–60)
  what_if_annual_cost: number // extra annual cost (0 = off, 80000 = full hire)
}
```

Response:

```ts
{
  historical: { month: string, revenue: number, expenses: number, profit: number }[],
  forecast:   { month: number, revenue: number, expenses: number, profit: number }[]
}
```

---

## What's Skipped for Demo

- User auth / login
- Database persistence
- Monte Carlo simulations
- AI-generated suggestions
- Mobile layout

These are post-demo stretch goals.
