# Disease Prediction Analytics

Disease Prediction Analytics is a complete college-major-project demonstration of machine learning in healthcare analytics. It analyzes patient records, compares classical supervised-learning models, and produces a probable disease signal plus a transparent screening risk level.

> **Important medical safety notice:** This is an educational decision-support and prediction tool. It is not a medical device, diagnosis engine, treatment recommender, or replacement for a qualified healthcare professional. Never use it for emergency decisions or real-world clinical care.

## What is included

- CSV and Excel upload with schema validation and data cleaning
- Sample patient dataset in `data/sample_patient_data.csv`
- Dataset preview, missing-value audit, duplicate handling, and cleaned CSV export
- Exploratory data analysis with disease distribution, demographic counts, box plots, and group summaries
- Five model baselines:
  - Logistic Regression
  - Decision Tree
  - Random Forest
  - Naive Bayes
  - Support Vector Machine (SVM)
- Holdout evaluation with Accuracy, Precision, Recall, and weighted F1-Score
- Patient prediction form with probable disease, model confidence, class probabilities, and risk level
- Transparent screening-factor explanation for age, blood pressure, sugar, cholesterol, and medical history
- Recent prediction history and CSV export
- A polished React dashboard preview in `artifacts/disease-prediction`

## Dataset schema

The input file should contain these columns:

| Column | Description |
| --- | --- |
| `Patient_ID` | Unique patient reference |
| `Age` | Patient age in years |
| `Gender` | Gender label |
| `Symptoms` | Free-text symptom summary |
| `Blood_Pressure` | Systolic blood pressure |
| `Sugar_Level` | Blood sugar level in mg/dL |
| `Cholesterol` | Cholesterol level in mg/dL |
| `Medical_History` | Relevant history summary |
| `Disease` | Training target label |

## Run the Streamlit application

Python dependencies are listed in `requirements.txt`.

```bash
streamlit run streamlit_app.py --server.port 5000
```

The sidebar contains the full workflow:

1. **Overview** — dataset health and model readiness
2. **Dataset Upload** — load and validate CSV/XLSX data
3. **Data Analysis** — inspect disease and risk-factor patterns
4. **Model Training** — fit and compare all five classifiers
5. **Disease Prediction** — review an individual prediction
6. **Results** — compare metrics and export prediction history

## How the ML pipeline works

1. Numeric columns use median imputation and standardization for most models.
2. Categorical columns use most-frequent imputation and one-hot encoding.
3. A stratified 75/25 holdout split is used when each disease class has enough examples.
4. Each model is trained as a scikit-learn pipeline so preprocessing is learned only from the training split.
5. The model with the strongest weighted F1-Score is marked as the recommended demonstration model.
6. A separate, deliberately simple rule-based screening heuristic summarizes risk factors. It is shown separately from model confidence to make the distinction clear.

## Viva / presentation talking points

- **Why multiple models?** Different algorithms make different assumptions; comparing them makes model selection explicit.
- **Why F1-Score?** It balances precision and recall and is useful when class distributions differ.
- **Why a pipeline?** It prevents preprocessing leakage and keeps training/prediction transformations consistent.
- **What are the limitations?** The sample dataset is small and synthetic. It is not clinically representative, externally validated, or suitable for patient care.
- **What would be needed for production?** Clinically governed data, fairness and subgroup evaluation, calibration, external validation, privacy controls, audit logs, monitoring, and clinician oversight.

## Project structure

```text
.
├── streamlit_app.py
├── data/
│   └── sample_patient_data.csv
├── requirements.txt
├── README.md
└── artifacts/disease-prediction/
    └── React dashboard preview
```