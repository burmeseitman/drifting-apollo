import React, { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import ChatWindow from './components/Chat/ChatWindow'
import { fetchHealth } from './lib/api'
import './App.css'

function App() {
  const [role, setRole] = useState('user')
  const [serviceState, setServiceState] = useState({
    tone: 'checking',
    label: 'Checking local services...',
  })

  useEffect(() => {
    let active = true

    async function loadHealth() {
      try {
        const health = await fetchHealth()
        if (!active) {
          return
        }

        const ollamaState = health.services?.ollama ? 'LLM ready' : 'LLM offline'
        const chromaState = health.services?.chroma ? 'RAG ready' : 'RAG offline'

        setServiceState({
          tone: health.status === 'healthy' ? 'online' : 'degraded',
          label: `${health.status === 'healthy' ? 'Local services ready' : 'Local services degraded'} · ${ollamaState} · ${chromaState}`,
        })
      } catch {
        if (!active) {
          return
        }

        setServiceState({
          tone: 'error',
          label: 'Backend unavailable',
        })
      }
    }

    loadHealth()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="app-container">
      <Sidebar role={role} setRole={setRole} />
      <main className="main-content">
        <header className="top-bar">
          <div className="status-indicator">
            <span className={`dot ${serviceState.tone}`}></span>
            {serviceState.label}
          </div>
          <div className="user-info">
             Workspace View: <span className="badge">{role.toUpperCase()}</span>
          </div>
        </header>
        <ChatWindow />
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at top left, #1e293b, #0f172a);
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .top-bar {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          border-bottom: 1px solid var(--border);
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot.online {
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
        }
        .dot.degraded,
        .dot.checking {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }
        .dot.error {
          background: var(--danger);
          box-shadow: 0 0 8px var(--danger);
        }
        .badge {
          background: var(--primary);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}

export default App
