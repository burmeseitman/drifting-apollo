<p align="center">
  <img src="assets/logo.png" width="200" alt="Drifting-Apollo Logo">
</p>

<h1 align="center">Drifting-Apollo</h1>
<p align="center">Private local AI workspace for chat, files, and access-controlled collaboration.</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-16a34a?style=for-the-badge&logo=open-source-initiative&logoColor=white" alt="MIT License">
  </a>
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-0f172a?style=for-the-badge&logo=react&logoColor=61dafb" alt="React and Vite">
  <img src="https://img.shields.io/badge/UI-Tailwind%20CSS-0f172a?style=for-the-badge&logo=tailwindcss&logoColor=38bdf8" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Backend-FastAPI-0f172a?style=for-the-badge&logo=fastapi&logoColor=10b981" alt="FastAPI">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Python-0f172a?style=for-the-badge&logo=python&logoColor=facc15" alt="Python">
  <img src="https://img.shields.io/badge/Infra-Docker-0f172a?style=for-the-badge&logo=docker&logoColor=60a5fa" alt="Docker">
  <img src="https://img.shields.io/badge/Data-SQLite%20%7C%20PostgreSQL-0f172a?style=for-the-badge&logo=postgresql&logoColor=93c5fd" alt="SQLite and PostgreSQL">
  <img src="https://img.shields.io/badge/AI-Ollama%20%2B%20Chroma-0f172a?style=for-the-badge&logoColor=white" alt="Ollama and Chroma">
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,vite,tailwind,fastapi,python,docker,postgres,sqlite" alt="Tech icons">
</p>

## Overview

Drifting-Apollo is a private workspace for chatting with a local AI model and your uploaded files. It is built for teams or individuals who want local-first AI workflows, sign-in, saved chat, and file-backed answers in one app.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: FastAPI, Python
- Database: SQLite by default, PostgreSQL through `DATABASE_URL`
- AI services: Ollama for generation, Chroma for file search
- Optional safety service: LLM-Guard sidecar
- Packaging and local infra: Docker Compose

## What It Does

- Sign-in with two access levels: `admin` and `user`
- First admin setup from the same machine by default
- Saved chat history per signed-in person
- PDF and TXT uploads with file-backed answers
- Admin-only people management
- Health and service status in the UI
- Optional safety scanning for prompts, files, retrieved context, and model output

## Safety and Access

- Frontend access is limited to local development origins such as `http://localhost:5173`
- Backend listens on `127.0.0.1` by default
- Login and first-admin setup are rate-limited
- Uploaded files are capped at 10 MB
- Auth signing data is generated automatically when not provided
- Docker services are bound to `127.0.0.1` by default
- Optional LLM-Guard scanning can be enabled for stricter deployments

## Architecture

```mermaid
graph TD
    UI["React Frontend"] -->|API calls| API["FastAPI Backend"]
    API -->|Sign-in and access| DB["SQLite or PostgreSQL"]
    API -->|File search| CHROMA["Chroma"]
    API -->|Answer generation| OLLAMA["Ollama"]
    API -->|Optional safety scan| GUARD["LLM-Guard"]
```

## Quick Start

### 1. Prerequisites

- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/)
- [Python 3.10+](https://www.python.org/)

### 2. Start Local Services

```bash
docker compose up -d
```

To include the optional safety sidecar, configure its local auth setting in your shell and start the `security` profile.

```bash
docker compose --profile security up -d
```

### 3. Start the Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

If you want to customize database, model, host, or safety-service behavior, add a local `.env` file before starting the backend.

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the app at `http://localhost:5173`.

## Access Model

- Not signed in: health checks and first admin setup only
- User: chat, view files, and manage personal chat history
- Admin: everything a user can do, plus upload files and manage people

## LLM-Guard Sidecar

LLM-Guard runs as a separate API service in this project. When enabled, it can scan:

- user prompts
- uploaded file text
- retrieved file context
- model output

The included [scanners.yml](/Users/minhtet/Projects/drifting-apollo/llm-guard/scanners.yml) focuses on prompt injection, hidden text, input size checks, sensitive content checks, and unsafe links.

## Roadmap

- More detailed access rules beyond `admin` and `user`
- Named conversations and history search
- More advanced file management
- Stricter LLM-Guard tuning for production use

## License

Licensed under the [MIT License](https://opensource.org/licenses/MIT).
