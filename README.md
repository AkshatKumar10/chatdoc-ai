# ChatDoc AI — Conversational PDF Question Answering System

A full-stack, conversational document intelligence platform built with **FastAPI**, **LangChain**, **Google Gemini**, and **React (Vite)**. Upload multiple PDF documents, vectorize their content with FAISS, and engage in multi-turn, context-aware conversations grounded strictly in your documents.

---

## ✨ Features

- **Multi-PDF Processing**: Extract, chunk, and index text across multiple PDF documents simultaneously.
- **Conversational Memory**: Retains conversation history across queries to handle follow-up questions, pronouns, and references.
- **Strict Grounding**: Prompt engineering ensures the model cites and responds strictly based on document contents with zero hallucinations.
- **Vector Search (FAISS)**: Fast, local similarity search over document chunks using Google Generative AI Embeddings (`gemini-embedding-001`).
- **Clean Editorial Interface**: Modern, human-centric design inspired by reading workspaces—no generic neon AI templates.
- **Configurable Environment**: Fully decoupled frontend and backend using environment variables (`.env`) for easy local setup and production deployment.

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — High-performance asynchronous Python API framework
- **LangChain** — Orchestration, prompt templates, and QA retrieval chains
- **Google Gemini API** (`gemini-3.8-flash` & `gemini-embedding-001`) — LLM & text embeddings
- **FAISS (CPU)** — Efficient vector similarity search
- **PyPDF** — PDF text extraction

### Frontend
- **React 19** + **Vite** — Fast, modern frontend architecture
- **Tailwind CSS v4** — Clean, custom editorial design system
- **React Markdown** — Structured typography for headings, lists, and code blocks

---

## 📁 Project Structure

```text
├── server.py              # FastAPI server, endpoints, and LangChain QA pipeline
├── requirements.txt       # Python dependencies
├── .env.example           # Example backend environment variables
├── .gitignore             # Consolidated Git ignore rules
│
└── frontend/              # React + Vite application
    ├── src/
    │   ├── App.jsx        # Main chat and upload interface
    │   ├── index.css      # Custom typography and editorial styling
    │   └── main.jsx       # React DOM root
    ├── .env.example       # Example frontend environment variables
    ├── index.html         # HTML root and web fonts
    ├── package.json       # Node dependencies and scripts
    └── vite.config.js     # Vite configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm
- A [Google Gemini API Key](https://aistudio.google.com/)

---

### 1. Backend Setup

1. Clone the repository and navigate to the project root:
   ```bash
   git clone https://github.com/AkshatKumar10/chatdoc-ai.git
   cd chatdoc-ai
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

5. Start the FastAPI backend server:
   ```bash
   uvicorn server:app --reload --port 8000
   ```
   The backend API will be available at `http://localhost:8000`. You can test the interactive documentation at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_BASE=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🔄 CI/CD & Deployment

### Continuous Integration (GitHub Actions)
The repository includes automated CI via [`.github/workflows/ci.yml`](.github/workflows/ci.yml) that triggers on every push and pull request to `main`:
- **Backend:** Lints with `flake8` and verifies that all FastAPI/LangChain modules import cleanly on Python 3.11.
- **Frontend:** Validates clean dependency installation and executes `npm run build` using Node.js 20.

---