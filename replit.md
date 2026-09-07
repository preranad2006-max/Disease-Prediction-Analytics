# Disease Prediction Analytics

Educational healthcare analytics workspace that cleans patient datasets, compares classical ML models, and presents transparent probable-disease signals for decision-support demonstrations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `streamlit run streamlit_app.py --server.port 5000` — run the Python ML dashboard
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- ML companion: Python, Pandas, NumPy, scikit-learn, Matplotlib, Seaborn, Streamlit

## Where things live

- `streamlit_app.py` — complete Streamlit workflow, preprocessing, training, metrics, prediction, and risk explanation
- `data/sample_patient_data.csv` — synthetic sample dataset for demos and viva walkthroughs
- `requirements.txt` — Python package list for the Streamlit app
- `artifacts/disease-prediction/src/` — polished React dashboard preview for the project surface

## Architecture decisions

- The Streamlit app is the source of truth for the requested Python ML workflow; the React artifact provides the polished preview experience.
- Preprocessing is kept inside scikit-learn pipelines to avoid train/test leakage and keep inference consistent.
- Risk level is presented as a separate, transparent screening heuristic rather than being conflated with model confidence.
- The bundled sample data is synthetic and deliberately labeled as educational, not clinically representative.

## Product

- Upload and validate CSV/XLSX patient data.
- Explore disease distribution, demographics, and risk-factor patterns.
- Train Logistic Regression, Decision Tree, Random Forest, Naive Bayes, and SVM baselines.
- Compare Accuracy, Precision, Recall, and weighted F1-Score.
- Generate a probable disease signal with model confidence, class probabilities, contributing screening factors, and exportable prediction history.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The project intentionally does not present predictions as clinical diagnoses.
- Naive Bayes uses a non-negative preprocessing path; the other models use standardized numeric features.
- Excel uploads require `openpyxl`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
