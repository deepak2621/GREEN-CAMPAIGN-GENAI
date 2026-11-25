# Green Campaign AI: Sustainability Education Visual Generator

A modern, professional, full-stack web application designed for municipal utility companies, environmental organizations, and clean energy leaders to generate engaging sustainability and environmental education campaign visuals using Generative AI.

---

## 🌿 Project Overview

Utility companies frequently need educational campaign artwork for critical initiatives, including:
- **Water Conservation** (drought response, leak prevention, smart metering)
- **Energy Conservation** (peak demand shifting, phantom load reduction, LED lighting)
- **Renewable Energy** (rooftop solar, community wind farms, clean microgrids)
- **Climate Change Awareness** (carbon footprint reduction, biodiversity, climate resilience)
- **Waste Management** (circular economy, zero single-use plastics, community composting)
- **Pollution Control** (clean waterways, smog reduction, ocean preservation)
- **Sustainable Living** (urban tree planting, local food systems, passive solar homes)

Instead of manually designing illustrations from scratch, **Green Campaign AI** translates strategic campaign themes and objectives into publication-ready, high-resolution visuals powered by diffusion text-to-image technology.

---

## 🛠️ Technology Stack

### Frontend
- **React.js 19** with **Vite** for rapid, responsive UI
- **Tailwind CSS v4** for clean, commercial SaaS design (emerald and slate palette)
- **Lucide React** icons for consistent, clean iconography

### Backend
- **Python 3.13+** with **Flask 3** REST API
- **Flask-CORS** for secure cross-origin communication
- Modular architecture with distinct blueprint routes and service layers

### AI Diffusion Engine & Prompt Engineering
- **Modular Diffusion Architecture**:
  - `pollinations` (default): Live SDXL Turbo / FLUX hosted diffusion endpoint for immediate, working visual generation without requiring paid tokens.
  - `huggingface`: Hugging Face Inference API / router (`black-forest-labs/FLUX.1-schnell` or `stabilityai/stable-diffusion-xl-base-1.0`) with `HF_TOKEN`.
  - `stability`: Stability AI REST API with `STABILITY_API_KEY`.
- **Structured Prompt Builder**: Injects sector-specific visual motifs, style descriptors, target audience focus, and negative prompts to suppress artifacts, blurry elements, or text overlays.
- **Pillow (PIL)**: Verifies image byte integrity, optimizes colors, resizes to target aspect ratios, and saves lossless PNG files.

### Database
- **SQLite** database (`database/campaigns.db`) with parameterized queries, indexed timestamps, UUID primary keys, and duplicate prevention.

---

## 🚀 Key Features

1. **AI Campaign Generator Dashboard**:
   - Campaign Theme & Title with rapid suggestion chips
   - Educational narrative context
   - 7 Campaign Categories (Water, Energy, Renewable, Climate, Waste, Pollution, Sustainable Living)
   - 6 Visual Art Styles (Realistic Photography, 3D Illustration, Digital Art, Flat Vector, Infographic, Cartoon)
   - 5 Target Audiences (General Public, Students, Children, Households, Industrial Consumers)
   - 3 Aspect Ratios: Square (1:1), Portrait (4:5), Landscape (16:9)
   - Additional art direction notes (lighting, tone, color palette)
   - Real-time client-side and server-side validation

2. **Generated Image Result Showcase**:
   - High-resolution large image preview with zoom framing
   - Download PNG button with direct file attachment headers
   - "Save to History" with duplicate record prevention
   - "Generate Again" and "Edit Prompt" workflows
   - Expandable diffusion prompt inspector

3. **Persistent Campaign History**:
   - Grid of saved campaign visuals with metadata
   - Search bar and category filtering
   - Lightbox view modal
   - Direct PNG download
   - Safe deletion with confirmation modal (cleans up SQLite records and files on disk)
   - Graceful handling of missing image files

4. **Explore Gallery**:
   - 8 curated, pre-engineered campaign templates:
     - *Save Water* (Water Conservation)
     - *Save Electricity* (Energy Conservation)
     - *Go Solar* (Renewable Energy)
     - *Reduce Plastic* (Pollution Control)
     - *Plant More Trees* (Sustainable Living)
     - *Clean Energy* (Renewable Energy)
     - *Protect Wildlife* (Climate Awareness)
     - *Reduce Carbon Footprint* (Climate Awareness)
   - "Use This Template" loads parameters directly into the generator

---

## 📦 Project Structure

```
GREEN-CAMPAIGN-GENAI/
├── backend/
│   ├── app.py                      # Flask application factory, CORS, health & config endpoints
│   ├── config.py                   # Environment configuration and provider settings
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Template for environment variables
│   ├── .env                        # Local active environment configuration
│   ├── test_app.py                 # Backend unit test suite
│   ├── database/
│   │   ├── __init__.py
│   │   ├── db.py                   # SQLite connection & schema initialization
│   │   ├── models.py               # Campaign CRUD operations & duplicate guards
│   │   └── campaigns.db            # SQLite persistent database file
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── generation.py           # /api/generate & /api/images endpoints
│   │   └── history.py              # /api/history CRUD endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── prompt_builder.py       # Educational prompt synthesis & negative prompts
│   │   └── image_generator.py      # Modular diffusion service (Pollinations / HF / Stability)
│   └── generated_images/           # Local persistent PNG storage
├── frontend/
│   ├── index.html                  # HTML entry point with Plus Jakarta Sans typography
│   ├── package.json                # Frontend dependencies & scripts
│   ├── vite.config.js              # Vite config with Tailwind & /api proxy to Flask
│   └── src/
│       ├── main.jsx                # React root mount
│       ├── App.jsx                 # Main state coordinator & page router
│       ├── index.css               # Tailwind CSS & custom animation styles
│       ├── components/
│       │   ├── Navbar.jsx          # Header with navigation & live AI engine status badge
│       │   ├── Footer.jsx          # Sustainability footer with utility links
│       │   ├── Toast.jsx           # Global animated notification toast
│       │   └── ConfirmationModal.jsx # Safe modal for campaign deletions
│       ├── pages/
│       │   ├── LandingPage.jsx     # Modern marketing hero, how it works, features
│       │   ├── GeneratorPage.jsx   # Interactive diffusion campaign form & live spinner
│       │   ├── ResultPage.jsx      # Result preview, prompt details, download & save
│       │   ├── HistoryPage.jsx     # Saved campaigns archive, search, filters & actions
│       │   └── ExplorePage.jsx     # 8 sample campaign templates
│       ├── services/
│       │   └── api.js              # REST client methods communicating with backend
│       └── data/
│           └── exploreExamples.js  # Curated utility campaign presets
├── test_e2e_full.py                # Comprehensive 18-step end-to-end verification suite
└── README.md                       # Documentation & run instructions
```

---

## ⚙️ Installation & Setup Instructions

### Prerequisites
- **Python 3.10+** (tested on Python 3.13)
- **Node.js 18+** & **npm**

### Step 1: Backend Setup

1. Open a terminal and navigate to the project directory:
   ```bash
   cd c:\Users\deepa\GREEN-CAMPAIGN-GENAI
   ```

2. Install Python backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Configure environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *(By default, `IMAGE_PROVIDER=pollinations` works out-of-the-box with live SDXL Turbo diffusion. To switch to Hugging Face or Stability AI, edit `backend/.env` with your API token).*

4. Run the Flask backend server:
   ```bash
   python -m backend.app
   ```
   The backend will start on **http://127.0.0.1:5000**.

---

### Step 2: Frontend Setup

1. Open a second terminal window and navigate to the frontend directory:
   ```bash
   cd c:\Users\deepa\GREEN-CAMPAIGN-GENAI\frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at **http://localhost:5173**.

---

## 🧪 Testing and Verification

To execute the automated unit and end-to-end test suites:

### 1. Run Backend Unit Tests:
```bash
python -m unittest backend/test_app.py
```

### 2. Run Comprehensive 18-Step End-to-End Suite:
```bash
python test_e2e_full.py
```

Tests cover:
- Health check & database connection
- Configuration options & allowed metadata
- Required field validation & error codes
- Clear configuration messages when API keys are missing
- Real diffusion image generation & Pillow PNG verification
- Static image serving & forced attachment download
- SQLite history persistence & duplicate prevention
- Safe file cleanup upon deletion
- Missing image file handling

---

## 📄 License
MIT License. Built for municipal utility companies, educational initiatives, and clean energy advocates.
