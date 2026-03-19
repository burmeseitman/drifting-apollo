import { Bot, BrainCircuit, CornerDownLeft, Eraser, FileSearch2, History, SendHorizonal, Shield, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { clearChatHistory, fetchChatHistory, sendChatMessage } from '../../lib/api'

function createWelcomeMessage(model) {
  return {
    role: 'assistant',
    content: `Welcome to SLAW. Ask a question and I will answer using ${model} on this device. Turn on file help if you want me to check uploaded files first.`,
    contextUsed: false,
    isWelcome: true,
  }
}

function mapPersistedMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    contextUsed: Boolean(message.context_used),
    createdAt: message.created_at,
    model: message.model,
  }
}

const ChatWindow = ({ modelName, ragAvailable }) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(() => [createWelcomeMessage(modelName || 'llama3')])
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isClearingHistory, setIsClearingHistory] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [useRag, setUseRag] = useState(true)
  const endRef = useRef(null)
  const activeModelName = modelName || 'llama3'
  const initialModelNameRef = useRef(activeModelName)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  useEffect(() => {
    if (!ragAvailable) {
      setUseRag(false)
    }
  }, [ragAvailable])

  useEffect(() => {
    let active = true

    async function loadHistory() {
      setIsLoadingHistory(true)
      setHistoryError('')

      try {
        const data = await fetchChatHistory()
        if (!active) {
          return
        }

        const persistedMessages = (data.messages ?? []).map(mapPersistedMessage)
        setMessages(
          persistedMessages.length > 0
            ? persistedMessages
            : [createWelcomeMessage(initialModelNameRef.current)],
        )
      } catch (error) {
        if (!active) {
          return
        }

        setMessages([createWelcomeMessage(initialModelNameRef.current)])
        setHistoryError(`Unable to load saved history: ${error.message}`)
      } finally {
        if (active) {
          setIsLoadingHistory(false)
        }
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].isWelcome) {
        return [createWelcomeMessage(activeModelName)]
      }

      return prev
    })
  }, [activeModelName])

  const handleSend = async () => {
    const prompt = input.trim()
    if (!prompt || isSending) {
      return
    }

    setMessages((prev) => [...prev, { role: 'user', content: prompt }])
    setInput('')
    setIsSending(true)

    try {
      const result = await sendChatMessage({
        prompt,
        model: activeModelName,
        use_rag: useRag && ragAvailable,
      })

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          contextUsed: Boolean(result.context_used),
          model: result.model,
        },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Request failed: ${error.message}`,
          contextUsed: false,
          tone: 'error',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const toggleRag = () => {
    if (!ragAvailable) {
      return
    }
    setUseRag((prev) => !prev)
  }

  const handleClearHistory = async () => {
    if (isClearingHistory || isSending) {
      return
    }

    setIsClearingHistory(true)
    setHistoryError('')

    try {
      await clearChatHistory()
      setMessages([createWelcomeMessage(activeModelName)])
    } catch (error) {
      setHistoryError(`Unable to clear saved history: ${error.message}`)
    } finally {
      setIsClearingHistory(false)
    }
  }

  return (
    <section className="grid h-full min-h-0 gap-4 overflow-y-auto pr-1 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="panel flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="section-block">
              <p className="eyebrow">Conversation</p>
              <h2 className="text-2xl font-semibold tracking-tight text-mist-50">
                Ask the assistant
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-mist-400">
                Messages stay in this workspace. Turn on file help when uploaded files should support the answer.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`stat-pill ${
                  useRag
                    ? 'border-lagoon-400/30 bg-lagoon-500/10 text-lagoon-300'
                    : 'border-white/10 text-mist-400'
                }`}
              >
                <FileSearch2 className="h-3.5 w-3.5" />
                File help {useRag ? 'on' : 'off'}
              </span>
              <span className="stat-pill">
                <CornerDownLeft className="h-3.5 w-3.5" />
                Shift+Enter for newline
              </span>
              <span className="stat-pill">
                <BrainCircuit className="h-3.5 w-3.5" />
                {activeModelName}
              </span>
              <button
                type="button"
                className="ghost-button px-4 py-2 text-xs"
                onClick={handleClearHistory}
                disabled={isClearingHistory || isLoadingHistory || isSending}
              >
                <Eraser />
                {isClearingHistory ? 'Clearing...' : 'Clear chat'}
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {historyError ? (
            <div className="rounded-[24px] border border-coral-400/25 bg-coral-400/10 px-4 py-3 text-sm leading-6 text-coral-400">
              {historyError}
            </div>
          ) : null}

          {isLoadingHistory ? (
            <div className="panel-subtle flex items-center gap-3 px-4 py-3 text-sm text-mist-400">
              <History className="h-4 w-4 text-ember-300" />
              Loading previous messages...
            </div>
          ) : null}

          {messages.map((message, index) => {
            const isUser = message.role === 'user'

            return (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} motion-safe:animate-[rise_0.35s_ease-out]`}
              >
                <div className={`flex max-w-3xl gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`icon-box mt-1 ${
                      isUser
                        ? 'bg-ember-500/15 text-ember-300'
                        : message.tone === 'error'
                          ? 'bg-coral-400/12 text-coral-400'
                          : 'bg-lagoon-500/12 text-lagoon-300'
                    }`}
                  >
                    {isUser ? <User /> : <Bot />}
                  </div>

                  <article
                    className={`rounded-[26px] border px-4 py-3 ${
                      isUser
                        ? 'border-ember-400/20 bg-ember-500/12 text-mist-50'
                        : message.tone === 'error'
                          ? 'border-coral-400/20 bg-coral-400/10 text-mist-50'
                          : 'border-white/10 bg-white/5 text-mist-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mist-400">
                        {isUser ? 'You' : 'Assistant'}
                      </span>
                      {message.model && !isUser ? (
                        <span className="stat-pill border-white/10 bg-white/8 text-mist-300">
                          {message.model}
                        </span>
                      ) : null}
                      {!isUser && message.contextUsed ? (
                        <span className="stat-pill border-lagoon-400/25 bg-lagoon-500/10 text-lagoon-300">
                          Used uploaded files
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-mist-200">
                      {message.content}
                    </p>
                  </article>
                </div>
              </div>
            )
          })}

          {isSending ? (
            <div className="flex justify-start">
              <div className="flex max-w-3xl gap-3">
                <div className="icon-box mt-1 bg-lagoon-500/12 text-lagoon-300">
                  <Bot />
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3 text-sm text-mist-400">
                    <span className="h-2 w-2 rounded-full bg-lagoon-300 animate-pulse" />
                    Writing answer...
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={endRef} />
        </div>

        <div className="border-t border-white/10 px-4 py-4 sm:px-6">
          <label className="field-label" htmlFor="chat-message-input">
            Message
          </label>
          <div className="mt-3 rounded-[28px] border border-white/10 bg-night-950/55 p-3">
            <textarea
              id="chat-message-input"
              className="min-h-[120px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-mist-50 outline-none placeholder:text-mist-500"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your files, notes, or anything else saved in this workspace..."
              onKeyDown={handleComposerKeyDown}
              disabled={isSending}
            />

            <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-mist-400">
                Press Enter to send. Use Shift+Enter for a new line.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={handleSend}
                disabled={isSending || !input.trim()}
              >
                <SendHorizonal className="h-4 w-4" />
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="grid gap-4 xl:max-h-full xl:overflow-y-auto xl:pr-1">
        <section className="panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="section-block">
              <p className="eyebrow">File Help</p>
              <h2 className="text-xl font-semibold text-mist-50">
                Let uploaded files help answer
              </h2>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={useRag}
              aria-label="Toggle retrieval mode"
              onClick={toggleRag}
              disabled={!ragAvailable}
              className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                useRag
                  ? 'border-lagoon-400/40 bg-lagoon-500/25'
                  : 'border-white/10 bg-white/8'
              } ${!ragAvailable ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <span
                className={`absolute h-5 w-5 rounded-full bg-mist-50 shadow transition ${
                  useRag ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-mist-400">
            {ragAvailable
              ? 'When this is on, the app looks through uploaded files before answering.'
              : 'File search is unavailable right now, so this is turned off.'}
          </p>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="icon-box bg-lagoon-500/12 text-lagoon-300">
                <FileSearch2 />
              </div>
              <div>
                <p className="text-sm font-semibold text-mist-50">
                  {useRag ? 'Files are helping' : 'AI-only answer'}
                </p>
                <p className="text-xs leading-5 text-mist-400">
                  {useRag ? 'Uploaded files may shape the answer.' : 'The answer comes only from the AI model.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <p className="eyebrow">About This Workspace</p>
          <h2 className="mt-2 text-xl font-semibold text-mist-50">Runs on this device</h2>

          <div className="mt-4 space-y-3">
            <div className="data-card flex items-start gap-3">
              <div className="icon-box bg-ember-500/15 text-ember-300">
                <BrainCircuit />
              </div>
              <div>
                <p className="text-sm font-semibold text-mist-50">AI model</p>
                <p className="mt-1 text-sm leading-6 text-mist-400">
                  Answers are created by the AI model chosen for this workspace.
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-ember-300">
                  Active model: {activeModelName}
                </p>
              </div>
            </div>

            <div className="data-card flex items-start gap-3">
              <div className="icon-box bg-white/8 text-mist-200">
                <Shield />
              </div>
              <div>
                <p className="text-sm font-semibold text-mist-50">Safety checks</p>
                <p className="mt-1 text-sm leading-6 text-mist-400">
                  Each request is checked before it is sent to the AI model.
                </p>
              </div>
            </div>

            <div className="data-card flex items-start gap-3">
              <div className="icon-box bg-lagoon-500/12 text-lagoon-300">
                <History />
              </div>
              <div>
                <p className="text-sm font-semibold text-mist-50">Saved chat</p>
                <p className="mt-1 text-sm leading-6 text-mist-400">
                  Your messages are saved for this account and shown again when you return.
                </p>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </section>
  )
}

export default ChatWindow
