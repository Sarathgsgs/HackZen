# HackZen Platform — Complete Deployment & Handover Guide

This comprehensive guide is prepared for incoming team members and interns to deploy, configure, and maintain the **HackZen Platform** in production and local development.

---

## 1. Architecture Overview

| Component | Technology | Hosting Provider | Default Production URL |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS | **Vercel** | `https://hack-zen-ten.vercel.app` |
| **Backend** | Python 3.11, FastAPI, Uvicorn | **Render** | `https://hackzen-backend.onrender.com` |
| **Database** | MongoDB (Async Motor driver) | **MongoDB Atlas** | Cloud M0 Cluster (`hackathon_db`) |
| **Repository** | Git / GitHub | **GitHub** | `proeduvate/HackZen` |

---

## 2. Prerequisites & Accounts Required

Before starting deployment, ensure you have access to:
1. **GitHub**: Access to `proeduvate/HackZen` (or your personal fork).
2. **MongoDB Atlas Account**: [cloud.mongodb.com](https://cloud.mongodb.com) (free M0 cluster).
3. **Render Account**: [render.com](https://render.com) (connected to your GitHub account).
4. **Vercel Account**: [vercel.com](https://vercel.com) (connected to your GitHub account).
5. **Third-Party API Credentials** (Optional / Feature-dependent):
   - Google Cloud Console (for Google OAuth login)
   - GitHub Developer Settings (for GitHub OAuth login)
   - Gmail App Password (for SMTP emails & registration verification)
   - NVIDIA / Gemini API keys (for AI assistant features)

---

## 3. Phase 1: Database Setup (MongoDB Atlas)

1. **Log in to MongoDB Atlas** and create a new **Free (M0) Shared Cluster** (e.g. AWS / Singapore or nearest region).
2. **Create a Database User**:
   - Go to **Security > Database Access > Add New Database User**.
   - Authentication Method: **Password**.
   - Username: `hackzen_admin` (or your chosen name).
   - Password: generate a strong password and save it securely.
   - User Privileges: **Read and write to any database**.
3. **Configure Network Access (IP Whitelist)**:
   - Go to **Security > Network Access > Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Why?* Render dynamic web services do not have static outbound IPs on the free tier.
4. **Get Connection String**:
   - Go to **Deployments > Database > Connect > Drivers > Python**.
   - Copy the URI, which looks like:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/hackathon_db?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials.
   - Ensure the database name in the path is `hackathon_db`.

---

## 4. Phase 2: Backend Deployment on Render

### Option A: Using `render.yaml` (Blueprint)
The repository includes a ready-to-use [`render.yaml`](./render.yaml). In Render:
1. Click **New + > Blueprint**.
2. Connect your GitHub repository.
3. Render will detect `render.yaml` and prompt you to input the secret environment variables.

### Option B: Manual Web Service Setup (Recommended for Step-by-Step Control)
1. In Render Dashboard, click **New + > Web Service**.
2. Connect the **HackZen** repository from GitHub.
3. Configure the service settings:
   - **Name**: `hackzen-backend` (or your choice)
   - **Region**: Singapore (or nearest to your MongoDB Atlas cluster)
   - **Branch**: `admin-pages` (or `main`)
   - **Root Directory**: `backend` *(CRITICAL: do not leave empty!)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Expand **Advanced Settings**:
   - **Health Check Path**: `/health`
5. Under **Environment Variables**, add the following key-value pairs:

| Variable Name | Example / Production Value | Notes |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Ensures clean package resolution |
| `APP_NAME` | `ProEduvate Hackathon Platform` | Platform display title |
| `DEBUG` | `false` | Disable debug logs in production |
| `LOG_LEVEL` | `INFO` | Standard logging level |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.../hackathon_db?retryWrites=true&w=majority` | Atlas URI from Phase 1 |
| `DB_NAME` | `hackathon_db` | Main database name |
| `SECRET_KEY` | `supersecretkey_proeduvate_hackathon_platform_2026` | 32+ char random string for JWT |
| `JWT_EXPIRES_IN` | `30` | Token expiration in days |
| `FRONTEND_URL` | `https://hack-zen-ten.vercel.app` | Your Vercel frontend domain |
| `CORS_ORIGINS` | `https://hack-zen-ten.vercel.app,http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |
| `OAUTH_REDIRECT_BASE_URL` | `https://hackzen-backend.onrender.com` | Your Render public service URL |
| `SMTP_HOST` | `smtp.gmail.com` | Email server host |
| `SMTP_PORT` | `587` | Email server port |
| `SMTP_USER` | `your-email@gmail.com` | Gmail account |
| `SMTP_PASSWORD` | `xxxx xxxx xxxx xxxx` | 16-character Gmail App Password |
| `EMAIL_FROM` | `your-email@gmail.com` | Sender address |
| `GOOGLE_CLIENT_ID` | `579648232100-...apps.googleusercontent.com` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google OAuth Client Secret |
| `GITHUB_CLIENT_ID` | `Ov23liJVtiMqDCJoYxo6` | GitHub OAuth App ID |
| `GITHUB_CLIENT_SECRET` | `317291bd631f8e5bfe3c0541df4e589ac30f5be6` | GitHub OAuth Secret |
| `NVIDIA_API_KEY` | `nvapi-ceRP_...` | For AI project evaluation & prompts |
| `GEMINI_API_KEY` | `AQ.Ab8RN6LqTNy5...` | For AI Assistant features |

6. Click **Create Web Service**. Wait 2–4 minutes for the build to finish.
7. Test the health check endpoint in your browser:
   `https://<your-render-app>.onrender.com/health` (should return `{"status":"ok"}`).

---

## 5. Phase 3: Frontend Deployment on Vercel

1. In Vercel Dashboard, click **Add New... > Project**.
2. Select your GitHub repository (`HackZen`).
3. In **Project Configuration**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend` *(CRITICAL!)*
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)
4. Under **Environment Variables**, add:

| Key | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://hackzen-backend.onrender.com/api` | Directs client API requests to Render backend |

5. Click **Deploy**.
6. The client single-page application routing is already configured in `frontend/vercel.json` to route all page requests (`/student/*`, `/admin/*`, etc.) to `index.html`.

---

## 6. Phase 4: Finalizing Cross-Origin & OAuth URLs

Once both backend and frontend URLs are active:

1. **Update Backend CORS on Render**:
   - Set `FRONTEND_URL` = `https://<your-vercel-domain>.vercel.app`
   - Set `CORS_ORIGINS` = `https://<your-vercel-domain>.vercel.app,http://localhost:5173`
   - Save and trigger a manual redeploy on Render.
2. **Update OAuth Authorized Redirect URIs** (in Google Cloud Console & GitHub):
   - **Google Console > Credentials > OAuth 2.0 Client IDs**:
     - Authorized JavaScript origins: `https://<your-vercel-domain>.vercel.app`
     - Authorized redirect URI: `https://<your-render-backend>.onrender.com/api/auth/google/callback`
   - **GitHub > Settings > Developer settings > OAuth Apps**:
     - Homepage URL: `https://<your-vercel-domain>.vercel.app`
     - Authorization callback URL: `https://<your-render-backend>.onrender.com/api/auth/github/callback`

---

## 7. Local Development Setup (For Testing Before Pushing)

### Backend Setup:
```powershell
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env file with local configuration
# (MONGO_URI=mongodb://localhost:27017/hackathon_db or your Atlas URI)

# Run server with auto-reload
uvicorn main:app --reload --port 8000
```
Backend API will be accessible at `http://localhost:8000` and Swagger docs at `http://localhost:8000/docs`.

### Frontend Setup:
```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Verify .env has local backend URL:
# VITE_API_URL=http://localhost:8000/api

# Run Vite dev server
npm run dev
```
Frontend will be accessible at `http://localhost:5173`.

---

## 8. Continuous Deployment Workflow

1. Whenever code is pushed to the target branch (e.g. `admin-pages` or `main`):
   - **Vercel** automatically detects commits in `frontend/` and rebuilds the frontend in ~1–2 minutes.
   - **Render** automatically detects commits in `backend/` and restarts the web service.
2. To push your latest changes:
   ```bash
   git add .
   git commit -m "your commit message"
   git push origin <your-branch>
   ```
3. If an automated build does not trigger:
   - On **Vercel**: Go to **Deployments > Redeploy**.
   - On **Render**: Go to **Manual Deploy > Deploy latest commit**.

---

## 9. Common Gotchas & Troubleshooting

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **First request takes 30-50s** | Render Free Tier spins down after 15 minutes of inactivity | Normal behavior on free tier. Upgrading to a paid instance ($7/mo) keeps it permanently warm, or use an external ping service (e.g. UptimeRobot) to ping `/health` every 10 min. |
| **CORS Policy Error in Browser Console** | Backend `CORS_ORIGINS` does not match the exact frontend URL | Check for trailing slashes. Add the exact Vercel URL (e.g. `https://hack-zen-ten.vercel.app`) to `CORS_ORIGINS` in Render dashboard. |
| **Vercel 404 on Page Refresh** | Single Page Application (SPA) route not rewriting to `index.html` | Verify that `frontend/vercel.json` exists with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`. |
| **`Database not connected` error** | MongoDB Atlas IP whitelist blocking Render | In MongoDB Atlas, verify **Network Access** has `0.0.0.0/0` enabled. |
| **`npm run build` fails on Vercel** | Incorrect root directory in Vercel project settings | Ensure **Root Directory** in Vercel Project Settings is set to `frontend`. |
| **OAuth redirect fails** | `OAUTH_REDIRECT_BASE_URL` points to localhost | Update `OAUTH_REDIRECT_BASE_URL` in Render environment variables to your Render public URL. |
