# CDS — Crack Detection System (Production Edition)

<img width="1600" height="819" alt="CDS Overview" src="https://github.com/user-attachments/assets/fd7cdf38-c6c5-4015-9774-470e04c05cd9" />
<img width="731" height="710" alt="Inspection Dashboard" src="https://github.com/user-attachments/assets/8714e184-b489-4532-af1c-d23ff27ccc59" />
<img width="485" height="943" alt="Mobile View" src="https://github.com/user-attachments/assets/fc15c6ac-24d9-4628-9edc-ed29b0f22aaf" />
<img width="1600" height="822" alt="Live Camera Inspection" src="https://github.com/user-attachments/assets/96ff6ca9-cbd1-4813-be69-522996a7e8a8" />
<img width="1058" height="1309" alt="Report Export" src="https://github.com/user-attachments/assets/5d990974-6b4d-42c4-a1dc-9b584456aae0" />

> **Production-Ready, AI-powered structural defect detection platform for images, videos, and live camera feeds.**

[![Frontend Deployed](https://img.shields.io/badge/Vercel-Frontend-black?style=flat-square&logo=vercel)](https://cds-nu-six.vercel.app)
[![Backend Deployed](https://img.shields.io/badge/Render-Docker_Backend-informational?style=flat-square&logo=render)](https://cds-backend-cgbp.onrender.com)
[![Database](https://img.shields.io/badge/PostgreSQL-SQLAlchemy_2.0-blue?style=flat-square&logo=postgresql)](https://cds-backend-cgbp.onrender.com)

Built for **Hackverse 2.0** at **Manipal Institute of Technology, Bengaluru** — reached the **IBM-judged final round out of 90 teams**, now upgraded to a **cloud-deployed, production-grade architecture**.

---

## 🌐 Live Production Links

* **Live Web Application (Vercel)**: [https://cds-nu-six.vercel.app](https://cds-nu-six.vercel.app)
* **Live API Backend (Render)**: [https://cds-backend-cgbp.onrender.com](https://cds-backend-cgbp.onrender.com)
* **API Health Check**: [https://cds-backend-cgbp.onrender.com/api/status](https://cds-backend-cgbp.onrender.com/api/status)

---

## 🚀 Overview

**Crack Detection System (CDS)** is an enterprise-grade AI infrastructure inspection platform that detects and analyzes structural defects, including:

* Concrete structural cracks
* Surface fractures & micro-cracking
* Spalling & surface delamination
* Structural load stress anomalies

CDS supports **three inspection modes** from a single web application:

| Mode | Technology | Description |
| :--- | :--- | :--- |
| 📷 **Image Inspection** | Cloud Vision AI (Gemini / OpenRouter) | High-resolution static image defect analysis with bounding box overlay |
| 🎥 **Video Inspection** | OpenCV Frame Extraction + Cloud VLM | Infrastructure inspection video footage analyzed frame-by-frame |
| 📡 **Live Camera** | Web-based Realtime Polling (OpenCV) | Real-time surface inspection using browser camera stream over HTTPS |

Detected defects are converted into normalized inspection data and passed through a multi-role human-in-the-loop workflow:

$$\text{Public Reporter} \longrightarrow \text{Drone Vision Operator} \longrightarrow \text{Inspector} \longrightarrow \text{Administrator}$$

---

## ✨ Production Features

### 🤖 Multi-Engine AI Cascade (Zero Downtime)

CDS utilizes a provider-independent, multi-tier failover AI architecture:

1. **Primary AI Vision**: Google Gemini 2.5 Flash / OpenRouter Vision LLM
2. **Secondary Backup**: OpenRouter Candidate Vision Models
3. **Offline Fallback**: OpenCV Morphological Edge & Contour Detector

```text
Bounding Box: [ymin, xmin, ymax, xmax]
Defect Type: 'Structural Crack' | 'Concrete Spalling'
Severity: 'Critical' | 'Warning' | 'Low'
Confidence Rating: 0.0 - 1.0
```

If a cloud provider experiences an outage, CDS automatically cascades to the next available engine without failing the request.

---

### 📊 AI Structural Assessment Reports

Detected defects are processed by **Google Gemini 2.5 Flash / IBM Granite AI** to generate a 4-part engineering report:

1. **FINDINGS**: Defect types, dimensions, coverage area, and spatial distribution.
2. **RISKS**: Structural load stress concerns and collapse failure probabilities.
3. **RECOMMENDATIONS**: Carbon-fiber reinforcement, epoxy injection, and traffic termination guidelines.
4. **URGENCY**: `IMMEDIATE` \| `WITHIN 30 DAYS` \| `ROUTINE MONITORING`

---

### 🗄️ Enterprise Database & Storage

* **Managed PostgreSQL Connection Pooling**: Uses SQLAlchemy 2.0 ORM with connection pooling (`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`) for high concurrency.
* **Alembic Database Migrations**: Version-controlled database schema migrations.
* **AWS S3 / Cloudflare R2 Object Storage**: Decoupled media storage using `boto3` for persistent asset hosting with Data URI fallback.

---

## 🧠 Production Architecture

```mermaid
graph TD
    Client["User Browser (Vercel SPA)"]
    Vercel["Frontend (Vercel CDN)"]
    Backend["Backend (Render Docker - FastAPI + OpenCV)"]
    Postgres["Database (Managed PostgreSQL)"]
    Storage["Object Storage (AWS S3 / Cloudflare R2)"]
    Gemini["Google Gemini 2.5 Flash API"]
    OpenRouter["OpenRouter Vision API"]

    Client -->|HTTPS / React 19| Vercel
    Client -->|REST API & Uploads| Backend
    Backend -->|SQLAlchemy 2.0 ORM| Postgres
    Backend -->|Persistent Media Uploads| Storage
    Backend -->|Primary Vision Scan| Gemini
    Backend -->|Backup Vision Scan| OpenRouter
```

---

## 👥 Role-Based Access Control (RBAC)

CDS includes multiple pre-seeded role permissions:

| Role | Pre-Seeded Credentials | Capabilities |
| :--- | :--- | :--- |
| **Administrator / Inspector** | `admin@email.com` / `password` | Review reports, assign inspectors, approve pending accounts |
| **Drone Vision Operator** | `drone1@email.com` / `password` | Perform aerial scans and view telemetry history |
| **Manual Inspector** | `manual1@email.com` / `password` | Review AI findings and sign off on repair recommendations |
| **Public Reporter** | `publicreporter1@email.com` / `password` | Submit public infrastructure images/videos |

> 🛡️ *Inspector and Drone Operator accounts registered on the site require explicit approval by an Administrator before access is granted.*

---

## 🧩 Tech Stack

### Frontend (Deployed on Vercel)
* **Framework**: React 19, TypeScript, Vite 6
* **Styling**: Vanilla CSS, TailwindCSS, Framer Motion, Lucide Icons
* **Client**: Axios, Dynamic API resolution (`client.ts`), Vercel SPA Rewrites (`vercel.json`)
* **Export**: `html2canvas`, `jsPDF`

### Backend (Deployed on Render Docker)
* **Framework**: Python 3.11, FastAPI, Uvicorn / Gunicorn WSGI
* **Computer Vision**: OpenCV (`opencv-python-headless`), NumPy, Pillow
* **Database**: SQLAlchemy 2.0 ORM, PostgreSQL (`psycopg2-binary`), Alembic
* **Storage**: AWS S3 / Cloudflare R2 (`boto3`), Data URI fallback

### Cloud AI Services
* **Vision Models**: Google Gemini 2.5 Flash (`google-genai`), OpenRouter Vision
* **Report Generation**: Google Gemini 2.5 Flash, IBM Granite 3.0 8B Instruct (Hugging Face)

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a user account |
| `POST` | `/api/auth/login` | Authenticate user & return session profile |
| `GET` | `/api/admin/inspectors` | List all registered inspectors and drone operators |
| `POST` | `/api/admin/approve-inspector` | Approve or reject pending inspector/drone accounts |
| `POST` | `/api/upload` | Upload & analyze image/video with AI cascade |
| `POST` | `/api/live-detect` | Analyze a live camera frame using OpenCV |
| `POST` | `/api/live-report` | Save a live camera frame as an official inspection report |
| `GET` | `/api/reports` | Retrieve inspection reports filtered by role |
| `POST` | `/api/reports/assign` | Assign inspector or update report status |
| `DELETE` | `/api/reports/{report_id}` | Delete an inspection report |
| `GET` | `/api/status` | Get backend health and active AI engine status |

---

## 🛠️ Getting Started & Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/RahulSokkalingam/CDS.git
cd CDS/DevUchihas
```

---

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Backend will run locally at: `http://127.0.0.1:8000`

---

### 3. Frontend Setup

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

Frontend will run locally at: `http://localhost:5173`

---

## 🔑 Environment Variables Template

Create a `.env` file in the `backend/` directory or set these in your Render / Railway Cloud Dashboard:

```ini
# Database Connection (PostgreSQL or SQLite)
DATABASE_URL=postgresql://username:password@postgres-host:5432/cds_db

# CORS Allowed Origins
ALLOWED_ORIGINS=https://cds-nu-six.vercel.app,http://localhost:5173

# AI Provider API Keys
GEMINI_API_KEY=AQ.your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_key
HF_TOKEN=your_huggingface_token

# Object Storage (AWS S3 / Cloudflare R2 / DigitalOcean Spaces)
S3_BUCKET=cds-media-bucket
AWS_ACCESS_KEY_ID=your_aws_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_REGION=us-east-1
```

For the Vercel Frontend:

```ini
VITE_API_BASE_URL=https://cds-backend-cgbp.onrender.com
```

---

## 📁 Repository Structure

```text
CDS/DevUchihas/
├── backend/
│   ├── alembic/                  # Alembic DB Migrations
│   ├── alembic.ini
│   ├── db.py                     # SQLAlchemy 2.0 ORM & Postgres pooling
│   ├── main.py                   # FastAPI REST API & AI Orchestration
│   ├── requirements.txt          # Python dependencies
│   ├── storage.py                # S3 Object Storage Client
│   └── gemini_api_key.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts         # Dynamic API Client
│   │   ├── components/           # AuthView, InspectorDashboard, DroneDashboard
│   │   ├── App.tsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vercel.json               # Vercel SPA Rewrites
│   └── vite.config.ts
│
├── Dockerfile                    # Production Multi-Stage Dockerfile
├── .dockerignore
├── .env.example
├── .gitignore
└── README.md
```

---

## 🏆 Hackathon & Credits

* **Event**: Hackverse 2.0 (36-Hour Hackathon)
* **Institution**: Manipal Institute of Technology, Bengaluru
* **Achievement**: IBM-judged final round (Top 90 teams)
* **Deployment**: Upgraded to full production deployment on **Vercel** & **Render Docker**.
