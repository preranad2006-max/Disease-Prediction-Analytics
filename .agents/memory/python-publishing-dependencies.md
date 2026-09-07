---
name: Python publishing dependencies
description: Replit publishing behavior for Python dependency manifests in mixed pnpm and Python projects.
---

Replit's publishing package phase auto-detects a top-level `requirements.txt` and runs `pip install -r requirements.txt`, even when the project already has a valid `pyproject.toml` and `uv.lock`.

**Why:** Replit's production environment uses an externally managed Nix Python installation without a system `pip`; the auto-detected pip command fails with `ModuleNotFoundError: No module named 'pip'` and `externally-managed-environment`.

**How to apply:** For projects using uv, declare direct Python dependencies in `pyproject.toml`, commit `uv.lock`, and do not keep a top-level `requirements.txt` unless the deployment is intentionally configured to use a supported isolated environment.