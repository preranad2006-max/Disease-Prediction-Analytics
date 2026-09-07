"""Disease Prediction Analytics

Educational decision-support dashboard for healthcare analytics.
This app is not a medical device and must not be used as a diagnosis.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import streamlit as st
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier


st.set_page_config(
    page_title="Disease Prediction Analytics",
    page_icon="D",
    layout="wide",
    initial_sidebar_state="expanded",
)

REQUIRED_COLUMNS = [
    "Patient_ID",
    "Age",
    "Gender",
    "Symptoms",
    "Blood_Pressure",
    "Sugar_Level",
    "Cholesterol",
    "Medical_History",
    "Disease",
]
NUMERIC_COLUMNS = ["Age", "Blood_Pressure", "Sugar_Level", "Cholesterol"]
CATEGORICAL_COLUMNS = ["Gender", "Symptoms", "Medical_History"]
MODEL_NAMES = [
    "Logistic Regression",
    "Decision Tree",
    "Random Forest",
    "Naive Bayes",
    "SVM",
]


def normalize_columns(data: pd.DataFrame) -> pd.DataFrame:
    """Make common spreadsheet header variations predictable."""
    renamed = {column: column.strip().replace(" ", "_") for column in data.columns}
    return data.rename(columns=renamed)


def clean_dataset(data: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Clean values at the application boundary and return audit notes."""
    cleaned = normalize_columns(data.copy())
    audit: list[str] = []
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in cleaned.columns]
    if missing_columns:
        raise ValueError("Missing required columns: " + ", ".join(missing_columns))

    cleaned = cleaned[REQUIRED_COLUMNS].copy()
    for column in NUMERIC_COLUMNS:
        before = cleaned[column].isna().sum()
        cleaned[column] = pd.to_numeric(cleaned[column], errors="coerce")
        after = cleaned[column].isna().sum()
        if after:
            audit.append(f"{column}: {after} value(s) will be imputed during training")
        elif before:
            audit.append(f"{column}: {before} blank value(s) detected")

    for column in CATEGORICAL_COLUMNS + ["Disease", "Patient_ID"]:
        cleaned[column] = cleaned[column].astype("string").str.strip()

    duplicates = cleaned.duplicated(subset=["Patient_ID"]).sum()
    if duplicates:
        cleaned = cleaned.drop_duplicates(subset=["Patient_ID"], keep="first")
        audit.append(f"Removed {duplicates} duplicate Patient_ID row(s)")

    cleaned = cleaned.dropna(subset=["Disease"])
    cleaned["Gender"] = cleaned["Gender"].fillna("Not recorded")
    cleaned["Symptoms"] = cleaned["Symptoms"].fillna("Not recorded")
    cleaned["Medical_History"] = cleaned["Medical_History"].fillna("Not recorded")
    cleaned = cleaned.reset_index(drop=True)
    return cleaned, audit


@st.cache_data
def load_sample_data() -> pd.DataFrame:
    sample_path = Path(__file__).parent / "data" / "sample_patient_data.csv"
    return pd.read_csv(sample_path)


def get_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_COLUMNS),
            ("categorical", categorical_pipeline, CATEGORICAL_COLUMNS),
        ]
    )


def build_models() -> dict[str, Any]:
    return {
        "Logistic Regression": LogisticRegression(max_iter=1500, random_state=42),
        "Decision Tree": DecisionTreeClassifier(max_depth=7, random_state=42),
        "Random Forest": RandomForestClassifier(
            n_estimators=180, max_depth=10, random_state=42, class_weight="balanced"
        ),
        "Naive Bayes": MultinomialNB(),
        "SVM": SVC(probability=True, random_state=42, class_weight="balanced"),
    }


def train_models(data: pd.DataFrame) -> tuple[dict[str, Any], pd.DataFrame, str, list[str]]:
    """Train all five models and return fitted pipelines plus an evaluation table."""
    if len(data) < 12:
        raise ValueError("Add at least 12 patient rows before training.")
    if data["Disease"].nunique() < 2:
        raise ValueError("Training requires at least two disease classes.")

    x = data[NUMERIC_COLUMNS + CATEGORICAL_COLUMNS]
    y = data["Disease"].astype(str)
    class_counts = y.value_counts()
    stratify = y if class_counts.min() >= 2 else None
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=42, stratify=stratify
    )

    fitted: dict[str, Any] = {}
    rows: list[dict[str, Any]] = []
    for name, estimator in build_models().items():
        # MultinomialNB requires non-negative values, so it receives a one-hot-only
        # pipeline with numeric features imputed but not standardized.
        if name == "Naive Bayes":
            numeric_nb = Pipeline([("imputer", SimpleImputer(strategy="median"))])
            preprocessor = ColumnTransformer(
                [
                    ("numeric", numeric_nb, NUMERIC_COLUMNS),
                    (
                        "categorical",
                        Pipeline(
                            [
                                ("imputer", SimpleImputer(strategy="most_frequent")),
                                ("onehot", OneHotEncoder(handle_unknown="ignore")),
                            ]
                        ),
                        CATEGORICAL_COLUMNS,
                    ),
                ]
            )
        else:
            preprocessor = get_preprocessor()

        pipeline = Pipeline([("preprocessor", preprocessor), ("model", estimator)])
        pipeline.fit(x_train, y_train)
        predictions = pipeline.predict(x_test)
        rows.append(
            {
                "Model": name,
                "Accuracy": accuracy_score(y_test, predictions),
                "Precision": precision_score(y_test, predictions, average="weighted", zero_division=0),
                "Recall": recall_score(y_test, predictions, average="weighted", zero_division=0),
                "F1-Score": f1_score(y_test, predictions, average="weighted", zero_division=0),
            }
        )
        fitted[name] = pipeline

    metrics = pd.DataFrame(rows).sort_values("F1-Score", ascending=False).reset_index(drop=True)
    best_model = str(metrics.iloc[0]["Model"])
    return fitted, metrics, best_model, list(y.unique())


def get_risk_assessment(patient: dict[str, Any]) -> tuple[str, int, list[str]]:
    """A transparent educational screening heuristic, separate from model output."""
    score = 0
    contributors: list[str] = []
    age = float(patient["Age"])
    bp = float(patient["Blood_Pressure"])
    sugar = float(patient["Sugar_Level"])
    cholesterol = float(patient["Cholesterol"])
    history = str(patient["Medical_History"]).lower()

    if age >= 60:
        score += 2
        contributors.append("Age band 60+")
    elif age >= 45:
        score += 1
        contributors.append("Age band 45–59")
    if bp >= 140:
        score += 2
        contributors.append("Elevated blood pressure")
    elif bp >= 130:
        score += 1
        contributors.append("Borderline blood pressure")
    if sugar >= 126:
        score += 2
        contributors.append("Elevated sugar level")
    elif sugar >= 100:
        score += 1
        contributors.append("Borderline sugar level")
    if cholesterol >= 240:
        score += 2
        contributors.append("Elevated cholesterol")
    elif cholesterol >= 200:
        score += 1
        contributors.append("Borderline cholesterol")
    if history not in {"none", "no history", "not recorded", ""}:
        score += 1
        contributors.append("Relevant medical history")

    if score >= 6:
        return "High", score, contributors
    if score >= 3:
        return "Moderate", score, contributors
    return "Low", score, contributors


def make_prediction(
    pipeline: Any, patient: dict[str, Any]
) -> tuple[str, float, str, int, list[str], pd.DataFrame]:
    row = pd.DataFrame([{key: patient[key] for key in NUMERIC_COLUMNS + CATEGORICAL_COLUMNS}])
    disease = str(pipeline.predict(row)[0])
    probabilities = pipeline.predict_proba(row)[0]
    classes = list(pipeline.classes_)
    confidence = float(np.max(probabilities))
    probability_table = pd.DataFrame(
        {"Disease": classes, "Model probability": probabilities}
    ).sort_values("Model probability", ascending=False)
    risk, score, contributors = get_risk_assessment(patient)
    return disease, confidence, risk, score, contributors, probability_table


def metric_chart(metrics: pd.DataFrame) -> plt.Figure:
    melted = metrics.melt("Model", var_name="Metric", value_name="Score")
    fig, ax = plt.subplots(figsize=(10, 4.5))
    sns.barplot(data=melted, x="Model", y="Score", hue="Metric", palette="crest", ax=ax)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Score")
    ax.set_xlabel("")
    ax.tick_params(axis="x", rotation=18)
    ax.grid(axis="y", alpha=0.18)
    fig.tight_layout()
    return fig


def risk_color(level: str) -> str:
    return {"Low": "green", "Moderate": "orange", "High": "red"}.get(level, "gray")


def init_state() -> None:
    if "dataset" not in st.session_state:
        raw = load_sample_data()
        st.session_state.dataset, st.session_state.audit = clean_dataset(raw)
    if "models" not in st.session_state:
        st.session_state.models = {}
    if "metrics" not in st.session_state:
        st.session_state.metrics = pd.DataFrame()
    if "best_model" not in st.session_state:
        st.session_state.best_model = ""
    if "predictions" not in st.session_state:
        st.session_state.predictions = []


def render_safety_note() -> None:
    st.warning(
        "Decision-support only: this educational prediction tool is not a diagnosis, "
        "medical device, or substitute for a qualified healthcare professional. "
        "Do not use it for emergency decisions or treatment planning."
    )


def render_sidebar() -> str:
    st.sidebar.markdown("## Disease Prediction Analytics")
    st.sidebar.caption("Healthcare ML lab · educational decision support")
    page = st.sidebar.radio(
        "Workspace",
        ["Overview", "Dataset Upload", "Data Analysis", "Model Training", "Disease Prediction", "Results"],
    )
    st.sidebar.divider()
    data = st.session_state.dataset
    st.sidebar.metric("Active records", f"{len(data):,}")
    st.sidebar.metric("Disease classes", f"{data['Disease'].nunique():,}")
    st.sidebar.caption("Version 1.0 · Local analysis")
    return page


def page_overview() -> None:
    data = st.session_state.dataset
    st.title("Healthcare analytics, made explainable")
    st.markdown(
        "A practical workspace for exploring patient patterns, comparing models, "
        "and reviewing probable disease signals with a clear line between prediction and diagnosis."
    )
    render_safety_note()

    columns = st.columns(4)
    columns[0].metric("Patient records", f"{len(data):,}", "active dataset")
    columns[1].metric("Disease classes", f"{data['Disease'].nunique():,}", "target labels")
    columns[2].metric("Data completeness", f"{data.notna().mean().mean() * 100:.0f}%", "before imputation")
    columns[3].metric(
        "Best model",
        st.session_state.best_model or "Not trained",
        "highest F1-score" if st.session_state.best_model else "train from Model Training",
    )

    left, right = st.columns([1.4, 1])
    with left:
        st.subheader("Disease distribution")
        counts = data["Disease"].value_counts().rename_axis("Disease").reset_index(name="Patients")
        st.bar_chart(counts.set_index("Disease"), color="#19a974")
    with right:
        st.subheader("Model readiness")
        if st.session_state.metrics.empty:
            st.info("Train the five baseline classifiers to unlock comparison metrics.")
            if st.button("Train models now", type="primary"):
                with st.spinner("Training baseline models..."):
                    try:
                        fitted, metrics, best, _ = train_models(data)
                        st.session_state.models = fitted
                        st.session_state.metrics = metrics
                        st.session_state.best_model = best
                        st.rerun()
                    except ValueError as error:
                        st.error(str(error))
        else:
            st.success(f"{st.session_state.best_model} is ready for prediction.")
            st.dataframe(
                st.session_state.metrics[["Model", "F1-Score"]].style.format({"F1-Score": "{:.1%}"}),
                hide_index=True,
                use_container_width=True,
            )

    st.subheader("Quick start")
    st.write("1. Upload or review the sample dataset  ·  2. Explore patterns  ·  3. Train models  ·  4. Review a prediction")


def page_dataset() -> None:
    st.title("Dataset Upload")
    st.caption("Load a CSV or Excel workbook, then validate the schema before using it for analysis.")
    render_safety_note()
    uploaded = st.file_uploader("Choose a patient dataset", type=["csv", "xlsx", "xls"])
    if uploaded is not None:
        try:
            content = uploaded.getvalue()
            incoming = (
                pd.read_excel(io.BytesIO(content))
                if uploaded.name.lower().endswith((".xlsx", ".xls"))
                else pd.read_csv(io.BytesIO(content))
            )
            cleaned, audit = clean_dataset(incoming)
            if st.button("Use uploaded dataset", type="primary"):
                st.session_state.dataset = cleaned
                st.session_state.audit = audit
                st.session_state.models = {}
                st.session_state.metrics = pd.DataFrame()
                st.session_state.best_model = ""
                st.success(f"Loaded {len(cleaned):,} patient records.")
        except (ValueError, pd.errors.ParserError, ImportError) as error:
            st.error(f"Could not read this file: {error}")

    data = st.session_state.dataset
    left, right = st.columns(2)
    with left:
        st.subheader("Schema health")
        for column in REQUIRED_COLUMNS:
            missing = int(data[column].isna().sum())
            st.write(f"{'✓' if missing == 0 else '!'}  **{column}** — {data[column].dtype}, {missing} missing")
    with right:
        st.subheader("Cleaning audit")
        if st.session_state.audit:
            for note in st.session_state.audit:
                st.write("• " + note)
        else:
            st.success("No cleaning warnings for the active sample.")

    st.subheader("Patient data preview")
    st.dataframe(data.head(12), use_container_width=True, hide_index=True)
    st.download_button(
        "Download cleaned dataset",
        data.to_csv(index=False).encode("utf-8"),
        "cleaned_patient_data.csv",
        "text/csv",
    )


def page_analysis() -> None:
    data = st.session_state.dataset
    st.title("Data Analysis")
    st.caption("Use these views to identify patterns in the active dataset before model training.")
    render_safety_note()

    tab1, tab2, tab3 = st.tabs(["Disease patterns", "Risk factors", "Demographics"])
    with tab1:
        st.subheader("Disease distribution")
        counts = data["Disease"].value_counts().rename_axis("Disease").reset_index(name="Patients")
        st.bar_chart(counts.set_index("Disease"), color="#19a974")
        st.dataframe(counts, hide_index=True, use_container_width=True)
    with tab2:
        fig, axes = plt.subplots(2, 2, figsize=(11, 7))
        for axis, column, color in zip(
            axes.flat, ["Age", "Blood_Pressure", "Sugar_Level", "Cholesterol"], ["#176b87", "#19a974", "#e5a11a", "#d95d39"]
        ):
            sns.boxplot(data=data, x="Disease", y=column, color=color, ax=axis)
            axis.tick_params(axis="x", rotation=25)
            axis.set_xlabel("")
            axis.grid(axis="y", alpha=0.15)
        fig.tight_layout()
        st.pyplot(fig, use_container_width=True)
        st.caption("Box plots show spread and outliers; they do not establish clinical thresholds on their own.")
    with tab3:
        gender = pd.crosstab(data["Gender"], data["Disease"])
        st.subheader("Disease counts by gender")
        st.bar_chart(gender, color=["#176b87", "#19a974", "#e5a11a", "#d95d39"])
        st.subheader("Average measurements by disease")
        st.dataframe(
            data.groupby("Disease")[NUMERIC_COLUMNS].mean(numeric_only=True).round(1),
            use_container_width=True,
        )


def page_models() -> None:
    data = st.session_state.dataset
    st.title("Model Training")
    st.caption("Train and compare five classical supervised learning baselines on the active dataset.")
    render_safety_note()
    st.info("The scores below are holdout-test metrics. They are educational benchmarks, not clinical validation.")
    if st.button("Train / retrain all models", type="primary"):
        with st.spinner("Fitting Logistic Regression, Decision Tree, Random Forest, Naive Bayes, and SVM..."):
            try:
                fitted, metrics, best, _ = train_models(data)
                st.session_state.models = fitted
                st.session_state.metrics = metrics
                st.session_state.best_model = best
                st.success(f"Training complete. {best} leads on weighted F1-score.")
            except ValueError as error:
                st.error(str(error))

    if st.session_state.metrics.empty:
        st.warning("No trained models yet. Use the button above to begin.")
        return
    metrics = st.session_state.metrics
    st.pyplot(metric_chart(metrics), use_container_width=True)
    st.dataframe(
        metrics.style.format({"Accuracy": "{:.1%}", "Precision": "{:.1%}", "Recall": "{:.1%}", "F1-Score": "{:.1%}"}),
        use_container_width=True,
        hide_index=True,
    )
    st.success(f"Recommended demo model: {st.session_state.best_model}")


def page_prediction() -> None:
    st.title("Disease Prediction")
    st.caption("Enter a patient profile to review the model's probable disease and transparent risk factors.")
    render_safety_note()
    if not st.session_state.models:
        st.warning("Train the models first. The sample dataset is ready to use.")
        return

    defaults = {
        "Age": 52,
        "Gender": "Female",
        "Symptoms": "Fatigue, frequent thirst",
        "Blood_Pressure": 132,
        "Sugar_Level": 142,
        "Cholesterol": 218,
        "Medical_History": "Hypertension",
    }
    with st.form("prediction_form"):
        left, right = st.columns(2)
        with left:
            patient_id = st.text_input("Patient ID", "P-NEW-001")
            age = st.number_input("Age", min_value=1, max_value=110, value=defaults["Age"])
            gender = st.selectbox("Gender", ["Female", "Male", "Non-binary", "Not recorded"], index=0)
            symptoms = st.text_input("Symptoms", defaults["Symptoms"])
        with right:
            bp = st.number_input("Blood Pressure (systolic)", 60, 240, defaults["Blood_Pressure"])
            sugar = st.number_input("Sugar Level (mg/dL)", 40, 500, defaults["Sugar_Level"])
            cholesterol = st.number_input("Cholesterol (mg/dL)", 80, 450, defaults["Cholesterol"])
            history = st.text_input("Medical History", defaults["Medical_History"])
        selected_model = st.selectbox("Prediction model", list(st.session_state.models), index=list(st.session_state.models).index(st.session_state.best_model))
        submitted = st.form_submit_button("Generate prediction", type="primary")

    if not submitted:
        return
    patient = {
        "Patient_ID": patient_id,
        "Age": age,
        "Gender": gender,
        "Symptoms": symptoms,
        "Blood_Pressure": bp,
        "Sugar_Level": sugar,
        "Cholesterol": cholesterol,
        "Medical_History": history,
    }
    disease, confidence, risk, score, contributors, probabilities = make_prediction(
        st.session_state.models[selected_model], patient
    )
    result = {
        "Patient_ID": patient_id,
        "Probable disease": disease,
        "Confidence": confidence,
        "Risk level": risk,
        "Model": selected_model,
        "Risk score": score,
    }
    st.session_state.predictions.insert(0, result)

    st.divider()
    st.subheader("Prediction result")
    a, b, c = st.columns(3)
    a.metric("Probable disease", disease)
    b.metric("Model confidence", f"{confidence:.1%}")
    c.metric("Screening risk level", risk)
    if contributors:
        st.write("**Contributing screening factors:** " + " · ".join(contributors))
    else:
        st.write("No elevated screening factors were detected by the simple heuristic.")
    st.progress(min(confidence, 1.0), text=f"Model confidence · {confidence:.1%}")
    st.subheader("Class probabilities")
    probabilities["Model probability"] = probabilities["Model probability"].map(lambda value: f"{value:.1%}")
    st.dataframe(probabilities, hide_index=True, use_container_width=True)
    st.info("Confidence is model probability on this dataset. It is not a probability of having a disease in clinical practice.")


def page_results() -> None:
    st.title("Results")
    st.caption("Review model performance and prediction history in one place.")
    render_safety_note()
    if not st.session_state.metrics.empty:
        st.subheader("Model comparison")
        st.dataframe(
            st.session_state.metrics.style.format({"Accuracy": "{:.1%}", "Precision": "{:.1%}", "Recall": "{:.1%}", "F1-Score": "{:.1%}"}),
            hide_index=True,
            use_container_width=True,
        )
    else:
        st.info("Train the models to populate the comparison table.")
    st.subheader("Recent predictions")
    if st.session_state.predictions:
        history = pd.DataFrame(st.session_state.predictions)
        st.dataframe(
            history.style.format({"Confidence": "{:.1%}"}),
            hide_index=True,
            use_container_width=True,
        )
        st.download_button(
            "Export prediction history",
            history.to_csv(index=False).encode("utf-8"),
            "prediction_history.csv",
            "text/csv",
        )
    else:
        st.info("Predictions generated in the Disease Prediction page will appear here.")
    st.subheader("Clinical safety boundary")
    st.write(
        "This project demonstrates machine-learning workflow design for a college major project. "
        "It should not be used to diagnose, triage, prescribe, or make emergency decisions. "
        "A qualified healthcare professional must review any real patient information and make all clinical decisions."
    )


def main() -> None:
    init_state()
    page = render_sidebar()
    pages = {
        "Overview": page_overview,
        "Dataset Upload": page_dataset,
        "Data Analysis": page_analysis,
        "Model Training": page_models,
        "Disease Prediction": page_prediction,
        "Results": page_results,
    }
    pages[page]()


if __name__ == "__main__":
    main()