import { Clock3, Database, FileText, HardDrive, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchDocuments } from '../../lib/api'

function formatDate(value) {
  if (!value) {
    return 'Time unavailable'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable'
  }

  return date.toLocaleString()
}

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
    return 'Size unavailable'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const DocumentsPanel = ({ documentsVersion }) => {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let active = true

    async function loadDocuments() {
      setIsLoading(true)
      setError('')

      try {
        const data = await fetchDocuments()
        if (!active) {
          return
        }

        setDocuments(data.documents ?? [])
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError.message)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadDocuments()

    return () => {
      active = false
    }
  }, [documentsVersion, refreshTick])

  const totalBytes = documents.reduce(
    (sum, document) => sum + (typeof document.file_size === 'number' ? document.file_size : 0),
    0,
  )
  const latestUpload = documents[0]?.uploaded_at
  const fileTypeCount = new Set(documents.map((document) => document.type || 'unknown')).size

  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-y-auto pr-1">
      <div className="panel flex flex-col gap-5 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="section-block">
            <p className="eyebrow">File Library</p>
            <h2 className="text-2xl font-semibold tracking-tight text-mist-50">
              Files the assistant can use
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-mist-400">
              See which uploaded files are ready to help answer questions.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setRefreshTick((prev) => prev + 1)}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="metric-card">
            <div className="icon-box bg-ember-500/15 text-ember-300">
              <Database />
            </div>
            <div className="metric-copy">
              <p className="text-sm font-semibold text-mist-50">Available files</p>
              <p className="text-xs leading-5 text-mist-400">
                {documents.length} document{documents.length === 1 ? '' : 's'} available
              </p>
            </div>
          </article>

          <article className="metric-card">
            <div className="icon-box bg-lagoon-500/15 text-lagoon-300">
              <HardDrive />
            </div>
            <div className="metric-copy">
              <p className="text-sm font-semibold text-mist-50">Total size</p>
              <p className="text-xs leading-5 text-mist-400">{formatFileSize(totalBytes)}</p>
            </div>
          </article>

          <article className="metric-card">
            <div className="icon-box bg-white/8 text-mist-200">
              <Clock3 />
            </div>
            <div className="metric-copy">
              <p className="text-sm font-semibold text-mist-50">Last added</p>
              <p className="text-xs leading-5 text-mist-400">
                {latestUpload ? formatDate(latestUpload) : 'No uploads yet'}
              </p>
            </div>
          </article>
        </div>
      </div>

      <div className="panel min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-mist-400">
            Loading files...
          </div>
        ) : error ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm leading-6 text-coral-400">
            Failed to load documents: {error}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="icon-box-lg bg-white/8 text-mist-200">
              <FileText />
            </div>
            <div>
              <p className="text-base font-semibold text-mist-50">No files yet</p>
              <p className="mt-2 text-sm leading-6 text-mist-400">
                Upload a PDF or TXT file from the sidebar so the assistant can use it.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="stat-pill border-ember-400/20 bg-ember-500/10 text-ember-300">
                {fileTypeCount} file format{fileTypeCount === 1 ? '' : 's'}
              </span>
              <span className="stat-pill">
                Ready for answers
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {documents.map((document) => (
              <article key={document.id} className="data-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="icon-box-lg bg-ember-500/15 text-ember-300">
                      <FileText />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-mist-50">
                      {document.filename}
                    </h3>
                    <p className="mt-2 break-all font-mono text-[11px] leading-5 text-mist-500">
                      {document.id}
                    </p>
                  </div>

                  <span className="stat-pill border-white/10 bg-white/8">
                    {(document.type || 'file').replace('.', '').toUpperCase()}
                  </span>
                </div>

                <dl className="mt-5 space-y-3 text-sm leading-6 text-mist-400">
                  <div className="flex items-center justify-between gap-4">
                    <dt>Added</dt>
                    <dd className="text-right text-mist-200">
                      {formatDate(document.uploaded_at)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>Size</dt>
                    <dd className="text-right text-mist-200">
                      {formatFileSize(document.file_size)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>Status</dt>
                    <dd className={document.indexed ? 'text-lagoon-300' : 'text-coral-400'}>
                      {document.indexed ? 'Ready' : 'Not ready'}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default DocumentsPanel
