import { Activity, BrainCircuit, Database, FolderOpenDot, Menu, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import UsersPanel from './components/Admin/UsersPanel'
import AuthScreen from './components/Auth/AuthScreen'
import Sidebar from './components/Sidebar/Sidebar'
import ChatWindow from './components/Chat/ChatWindow'
import DocumentsPanel from './components/Documents/DocumentsPanel'
import {
  clearAccessToken,
  fetchAuthStatus,
  fetchCurrentUser,
  fetchHealth,
  getAccessToken,
  setAccessToken,
} from './lib/api'

const viewMeta = {
  workspace: {
    title: 'Workspace',
    description: 'Ask questions and, when helpful, let uploaded files support the answer.',
  },
  documents: {
    title: 'Documents',
    description: 'See which uploaded files the assistant can use and review your file library.',
  },
  users: {
    title: 'People & Access',
    description: 'Manage people, access levels, passwords, and sign-in for this workspace.',
  },
}

function getRoleLabel(role) {
  return role === 'admin' ? 'Admin' : 'Member'
}

function App() {
  const [currentView, setCurrentView] = useState('workspace')
  const [documentsVersion, setDocumentsVersion] = useState(0)
  const [authLoading, setAuthLoading] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [serviceState, setServiceState] = useState({
    tone: 'checking',
    label: 'Checking workspace status...',
    modelName: 'llama3',
    security: {
      llm_guard_enabled: false,
    },
    services: {
      api: false,
      database: false,
      chroma: false,
      ollama: false,
      llm_guard: false,
    },
  })

  useEffect(() => {
    let active = true

    async function loadHealth() {
      try {
        const health = await fetchHealth()
        if (!active) {
          return
        }

        const ollamaState = health.services?.ollama ? 'AI ready' : 'AI unavailable'
        const chromaState = health.services?.chroma ? 'File search ready' : 'File search unavailable'

        setServiceState({
          tone: health.status === 'healthy' ? 'online' : 'degraded',
          label: `${health.status === 'healthy' ? 'Workspace ready' : 'Some features are limited'} · ${ollamaState} · ${chromaState}`,
          modelName: health.model?.name ?? 'llama3',
          security: health.security ?? { llm_guard_enabled: false },
          services: health.services ?? {},
        })
      } catch {
        if (!active) {
          return
        }

        setServiceState({
          tone: 'error',
          label: 'Workspace unavailable',
          modelName: 'llama3',
          security: {
            llm_guard_enabled: false,
          },
          services: {
            api: false,
            database: false,
            chroma: false,
            ollama: false,
            llm_guard: false,
          },
        })
      }
    }

    loadHealth()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadAuthState() {
      setAuthLoading(true)

      const token = getAccessToken()
      if (token) {
        try {
          const user = await fetchCurrentUser()
          if (!active) {
            return
          }
          setCurrentUser(user)
          setSetupRequired(false)
          setAuthLoading(false)
          return
        } catch {
          clearAccessToken()
        }
      }

      try {
        const status = await fetchAuthStatus()
        if (!active) {
          return
        }
        setSetupRequired(status.setup_required)
      } catch {
        if (!active) {
          return
        }
        setSetupRequired(false)
      } finally {
        if (active) {
          setCurrentUser(null)
          setAuthLoading(false)
        }
      }
    }

    loadAuthState()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentView === 'users') {
      setCurrentView('workspace')
    }
  }, [currentUser, currentView])

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [sidebarOpen])

  const handleAuthenticated = (response) => {
    setAccessToken(response.access_token)
    setCurrentUser(response.user)
    setSetupRequired(false)
    setCurrentView('workspace')
  }

  const handleLogout = async () => {
    clearAccessToken()
    setCurrentUser(null)
    setCurrentView('workspace')
    setSidebarOpen(false)

    try {
      const status = await fetchAuthStatus()
      setSetupRequired(status.setup_required)
    } catch {
      setSetupRequired(false)
    }
  }

  if (authLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <div className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-ember-500/15 blur-3xl motion-safe:animate-[float_16s_ease-in-out_infinite]" />
        <div className="absolute right-0 top-1/4 h-72 w-72 rounded-full bg-lagoon-500/12 blur-3xl motion-safe:animate-[float_18s_ease-in-out_infinite]" />
        <div className="panel relative z-10 flex items-center gap-3 px-6 py-5 text-sm text-mist-200">
          <Activity className="h-4 w-4 animate-pulse text-ember-400" />
          Opening workspace...
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <AuthScreen
        setupRequired={setupRequired}
        onAuthenticated={handleAuthenticated}
      />
    )
  }

  const currentViewMeta = viewMeta[currentView] ?? viewMeta.workspace
  const isHealthy = serviceState.tone === 'online'
  const serviceToneClass =
    serviceState.tone === 'online'
      ? 'border-lagoon-400/30 bg-lagoon-500/10 text-lagoon-300'
      : serviceState.tone === 'error'
        ? 'border-coral-400/30 bg-coral-400/10 text-coral-400'
        : 'border-ember-400/30 bg-ember-500/10 text-ember-300'

  const serviceBadges = [
    {
      key: 'database',
      label: 'Accounts',
      icon: Database,
      online: Boolean(serviceState.services.database),
    },
    {
      key: 'chroma',
      label: 'File search',
      icon: FolderOpenDot,
      online: Boolean(serviceState.services.chroma),
    },
    {
      key: 'ollama',
      label: `AI · ${serviceState.modelName}`,
      icon: BrainCircuit,
      online: Boolean(serviceState.services.ollama),
    },
    ...(serviceState.security?.llm_guard_enabled
      ? [
          {
            key: 'llm_guard',
            label: 'Safety',
            icon: ShieldCheck,
            online: Boolean(serviceState.services.llm_guard),
          },
        ]
      : []),
  ]

  return (
    <div className="relative flex h-full flex-col overflow-hidden lg:flex-row">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-12 h-64 w-64 rounded-full bg-ember-500/12 blur-3xl motion-safe:animate-[float_16s_ease-in-out_infinite]" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-lagoon-500/10 blur-3xl motion-safe:animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-4rem] left-1/3 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>
      <Sidebar
        currentUser={currentUser}
        currentView={currentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        setCurrentView={setCurrentView}
        onDocumentUploaded={() => setDocumentsVersion((prev) => prev + 1)}
        onLogout={handleLogout}
      />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 lg:px-0 lg:pr-5 lg:pt-5">
        <header className="panel sticky top-4 z-20 mb-4 flex flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              className="ghost-button px-4 py-2.5"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
              Menu
            </button>

            <span className="stat-pill border-white/15 bg-white/8">
              <ShieldCheck className="h-3.5 w-3.5 text-ember-300" />
              {getRoleLabel(currentUser.role)}
            </span>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="section-block">
              <p className="eyebrow">Signed-In Workspace</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-mist-50 sm:text-3xl">
                  {currentViewMeta.title}
                </h1>
                <span className="stat-pill hidden border-white/15 bg-white/8 sm:inline-flex">
                  <ShieldCheck className="h-3.5 w-3.5 text-ember-300" />
                  {getRoleLabel(currentUser.role)} access
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-mist-400">
                {currentViewMeta.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:max-w-[34rem] xl:items-end">
              <div className={`stat-pill ${serviceToneClass}`}>
                {isHealthy ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <TriangleAlert className="h-3.5 w-3.5" />
                )}
                {serviceState.label}
              </div>

              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 md:flex-wrap xl:justify-end">
                {serviceBadges.map((service) => {
                  const Icon = service.icon

                  return (
                    <span
                      key={service.key}
                      className={`stat-pill ${
                        service.online
                          ? 'border-lagoon-400/25 bg-lagoon-500/10 text-lagoon-300'
                          : 'border-white/10 text-mist-400'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {service.label}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          {currentView === 'workspace' ? (
            <ChatWindow
              modelName={serviceState.modelName}
              ragAvailable={Boolean(serviceState.services.chroma)}
            />
          ) : currentView === 'documents' ? (
            <DocumentsPanel documentsVersion={documentsVersion} />
          ) : (
            <UsersPanel
              currentUser={currentUser}
              onCurrentUserUpdated={setCurrentUser}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
