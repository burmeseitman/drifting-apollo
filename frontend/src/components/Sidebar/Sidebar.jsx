import { FileText, LayoutGrid, LogOut, Shield, UploadCloud, Users, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { uploadDocument } from '../../lib/api'

const Sidebar = ({
  currentUser,
  currentView,
  isOpen,
  onClose,
  setCurrentView,
  onDocumentUploaded,
  onLogout,
}) => {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadState, setUploadState] = useState('You can upload PDF and TXT files.')

  const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'Member'

  const handleNavigate = (view) => {
    setCurrentView(view)
    onClose?.()
  }

  const handleLogoutClick = () => {
    onClose?.()
    onLogout?.()
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setIsUploading(true)
    setUploadState(`Uploading ${file.name}...`)

    try {
      await uploadDocument(file)
      setUploadState(`${file.name} is ready to use.`)
      handleNavigate('documents')
      onDocumentUploaded?.()
    } catch (error) {
      setUploadState(error.message)
    } finally {
      event.target.value = ''
      setIsUploading(false)
    }
  }

  const navigation = [
    {
      id: 'workspace',
      label: 'Workspace',
      description: 'Chat with the local assistant',
      icon: LayoutGrid,
    },
    {
      id: 'documents',
      label: 'Documents',
      description: 'Review files used for answers',
      icon: FileText,
    },
  ]

  if (currentUser.role === 'admin') {
    navigation.push({
      id: 'users',
      label: 'People',
      description: 'Manage people and access',
      icon: Users,
    })
  }

  const uploadToneClass = uploadState.includes('successfully')
    ? 'text-lagoon-300'
    : uploadState.startsWith('Uploading')
      ? 'text-ember-300'
      : uploadState.includes('supported')
        ? 'text-mist-400'
        : 'text-coral-400'

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-night-950/70 backdrop-blur-sm transition duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[min(20rem,calc(100vw-1rem))] p-3 transition duration-300 lg:relative lg:z-10 lg:w-[320px] lg:shrink-0 lg:px-4 lg:pt-4 lg:pb-4 ${
          isOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'
        } lg:translate-x-0`}
      >
        <div className="panel flex h-[calc(100dvh-1.5rem)] flex-col gap-5 overflow-y-auto px-5 py-5 lg:h-full">
          <div className="flex items-start gap-4">
            <div className="icon-box-lg bg-ember-500/15 text-ember-300 shadow-[0_12px_30px_rgba(229,142,15,0.18)]">
              <Shield />
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Secure Local AI</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-mist-50">SLAW</h1>
              <p className="mt-2 text-sm leading-6 text-mist-400">
                Private chat, file-based answers, and access control in one workspace.
              </p>
            </div>
            <button
              type="button"
              className="ghost-button px-3 py-3 lg:hidden"
              onClick={onClose}
              aria-label="Close navigation"
            >
              <X />
            </button>
          </div>

          <nav className="grid gap-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-3 rounded-[22px] border px-4 py-3 text-left ${
                    isActive
                      ? 'border-white/15 bg-white/10 text-mist-50 shadow-[0_16px_40px_rgba(7,14,30,0.22)]'
                      : 'border-transparent bg-transparent text-mist-400 hover:border-white/10 hover:bg-white/5 hover:text-mist-50'
                  }`}
                >
                  <span
                    className={`icon-box ${
                      isActive ? 'bg-ember-500/15 text-ember-300' : 'bg-white/6 text-mist-400'
                    }`}
                  >
                    <Icon />
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-xs leading-5 text-mist-400">
                      {item.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="panel-subtle space-y-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lagoon-500/15 text-sm font-semibold uppercase text-lagoon-300">
                {currentUser.username.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-mist-50">{currentUser.username}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-mist-500">
                  {roleLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="stat-pill border-lagoon-400/20 bg-lagoon-500/10 text-lagoon-300">
                Signed in
              </span>
              <span className="stat-pill">
                {currentUser.role === 'admin' ? 'Can manage people + uploads' : 'Can chat + view files'}
              </span>
            </div>

            <button className="ghost-button w-full" type="button" onClick={handleLogoutClick}>
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>

          {currentUser.role === 'admin' ? (
            <div className="panel-subtle mt-auto p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="section-block">
                  <p className="eyebrow">Add Files</p>
                  <h2 className="text-lg font-semibold text-mist-50">
                    Add files for the assistant
                  </h2>
                </div>
                <div className="icon-box-lg bg-lagoon-500/15 text-lagoon-300">
                  <UploadCloud />
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-mist-400">
                Upload PDF or TXT files so the assistant can use them in answers.
              </p>

              <button
                className="primary-button mt-4 w-full"
                type="button"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                <UploadCloud className="h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload File'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                hidden
              />

              <p className={`mt-3 text-sm leading-6 ${uploadToneClass}`}>
                {uploadState}
              </p>
            </div>
          ) : (
            <div className="panel-subtle mt-auto p-4">
              <p className="eyebrow">Upload Access</p>
              <h2 className="mt-2 text-lg font-semibold text-mist-50">Ask an admin to add files</h2>
              <p className="mt-3 text-sm leading-6 text-mist-400">
                You can view files and use chat, but only admins can add or replace the files the assistant uses.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
