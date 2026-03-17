# Secure Local AI Workspace (SLAW) 🛡️🤖

A fully offline, secure AI workspace featuring RAG, prompt protection, and local LLM execution.

## Features
- **Document Intelligence (RAG)**: Index PDFs and text files for context-aware chat.
- **Security Layer**: 
  - Prompt injection detection.
  - Malicious query logging.
  - Input/Output sanitization.
- **Local Execution**: Uses **Ollama** for LLM and **ChromaDB** for vector storage. No data leaves the local machine.
- **Role-Based Access**: Toggle between User and Admin modes.

## Architecture
- **Frontend**: Vite + React (Premium Dark UI).
- **Backend**: FastAPI (Python).
- **LLM Service**: Ollama.
- **Vector DB**: ChromaDB.
- **Database**: PostgreSQL.

## How to Run

### Prerequisites
1. [Docker & Docker Compose](https://docs.docker.com/get-docker/)
2. [Ollama](https://ollama.com/) (Make sure it's running locally) or run via Docker.

### Running Infrastructure
```bash
docker-compose up -d
```

### Running Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python main.py`

### Running Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Security Note
This workspace implements basic prompt injection filtering. For production use, consider integrating more advanced security frameworks like LLM-Guard.
