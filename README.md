# Green Campaign AI: Sustainability Education Visual Generator

A full-stack web application designed for municipal utility companies, environmental organizations, and sustainability educators to generate high-impact environmental campaign visuals locally using **Black Forest Labs FLUX.1 Dev (12B Q4_K_S GGUF)** via **ComfyUI**.

---

## Key Features

- **FLUX.1 Dev (12B) Local Diffusion Engine**:
  - Quantized `flux1-dev-Q4_K_S.gguf` UNet + `t5-v1_1-xxl-encoder-Q4_K_M.gguf` + `clip_l.safetensors` + `ae.safetensors` VAE via `ComfyUI-GGUF`.
  - **Fast Mode** (`512×512` base, `18` steps, `euler` / `simple`, `FluxGuidance 3.5`).
  - **Quality Mode** (`768×768` base, `26` steps, `euler` / `beta`, `FluxGuidance 3.5`).
  - Preserves the user's exact scene description at the front of the prompt and supports verbatim `custom_prompt` override.
- **Real-Time Progress & Hardware Telemetry**:
  - Asynchronous generation jobs with live ComfyUI WebSocket step progress (`loading_model` → `encoding` → `sampling` → `decoding`), elapsed timer, and cancellation support.
  - Real hardware monitor (`nvidia-smi` + `psutil` + ComfyUI `/system_stats`) showing GPU utilization, VRAM usage, System RAM, model load time, and generation duration.
- **Authentication & Security**:
  - Local PBKDF2-SHA256 + HS256 JWT authentication (plus optional Supabase Auth integration), email verification, password reset, strict ownership checks, and path-traversal protection.
- **Responsive Light & Dark UI**:
  - Top-right theme toggle with persistent `localStorage` state across all pages (`Landing`, `Dashboard`, `Generator`, `Result`, `History`, `Explore`, `Profile`, and auth pages).

---

## Project Structure

```
GREEN-CAMPAIGN-GENAI/
├── backend/
│   ├── app.py                     # Flask application factory, CORS, /api/health, /api/config
│   ├── config.py                  # Environment configuration
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment variable template
│   ├── test_app.py                # Backend unit & security test suite
│   ├── database/
│   │   ├── db.py                  # SQLite schema & indexes
│   │   └── models.py              # UserModel & CampaignModel with path & ownership guards
│   ├── routes/
│   │   ├── auth.py                # Auth endpoints (/api/auth/*)
│   │   ├── generation.py          # Sync/async FLUX.1 Dev generation, progress, cancel, telemetry
│   │   └── history.py             # Saved campaign CRUD endpoints
│   ├── services/
│   │   ├── auth_service.py        # Password hashing, JWT verification, SMTP helper
│   │   ├── image_generator.py     # ComfyUI FLUX.1 Dev service, WebSocket progress & SystemMonitor
│   │   ├── model_config.py        # Flux1DevConfig & Fast/Quality presets
│   │   └── prompt_builder.py      # User-faithful FLUX.1 Dev prompt builder
│   └── scripts/
│       ├── download_flux_models.py # FLUX.1 Dev Q4 GGUF model downloader (into external ComfyUI dir)
│       ├── test_auth_e2e_live.py   # Live E2E auth, telemetry & FLUX.1 Dev test
│       └── verify_full_stack.py    # Full stack connectivity check
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── components/            # Navbar (top-right theme toggle), Footer, SystemMonitorCard, AuthShared, Toast, ConfirmationModal
│       ├── context/               # AuthContext & authContextValue
│       ├── data/                  # Shared campaignOptions & exploreExamples
│       ├── lib/                   # supabaseClient
│       ├── pages/                 # Landing, Dashboard, Generator, Result, History, Explore, Profile, Auth pages
│       ├── services/api.js        # REST API client
│       └── utils/                 # authValidation, download
└── supabase/schema.sql
```

---

## Exact Commands to Start the Application

### 1. Start ComfyUI (Optimized for 6–8 GB VRAM + 16 GB RAM on Windows)
```powershell
cd C:\Users\deepa\ComfyUI
python main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch --fp8_e4m3fn-text-enc --use-pytorch-cross-attention --reserve-vram 0.6 --fast-disk
```
*(The Flask backend will also auto-launch ComfyUI with these flags if it is not already running.)*

### 2. Start the Flask Backend
```powershell
cd C:\Users\deepa\GREEN-CAMPAIGN-GENAI
python -m backend.app
```
Backend runs on `http://127.0.0.1:5000`.

### 3. Start the Frontend Dev Server
```powershell
cd C:\Users\deepa\GREEN-CAMPAIGN-GENAI\frontend
npm run dev
```
*(In restricted PowerShell environments, use `npm.cmd run dev`.)*
Application is available at `http://localhost:5173`.

---

## Running Tests
```powershell
cd C:\Users\deepa\GREEN-CAMPAIGN-GENAI
python -m unittest backend/test_app.py -v
python backend/scripts/verify_full_stack.py
python backend/scripts/test_auth_e2e_live.py

cd C:\Users\deepa\GREEN-CAMPAIGN-GENAI\frontend
npm.cmd run lint
npm.cmd run build
```
