import { DatabaseZap, KeyRound, ShieldCheck, UserCog } from 'lucide-react'
import { useState } from 'react'
import { bootstrapAdmin, login } from '../../lib/api'

const initialForm = {
  username: '',
  password: '',
  confirmPassword: '',
}

const AuthScreen = ({ setupRequired, onAuthenticated }) => {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (setupRequired && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        username: form.username.trim(),
        password: form.password,
      }
      const response = setupRequired
        ? await bootstrapAdmin(payload)
        : await login(payload)

      onAuthenticated(response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const highlights = setupRequired
    ? [
        {
          title: 'Set Up Once',
          copy: 'Create the first admin account, then add everyone else from inside the app.',
          icon: ShieldCheck,
        },
        {
          title: 'Admin-Only Controls',
          copy: 'Only admins can add files or manage people after they sign in.',
          icon: UserCog,
        },
        {
          title: 'Stays On This Device',
          copy: 'Chats and files stay in your local app instead of being sent to a hosted service.',
          icon: DatabaseZap,
        },
      ]
    : [
        {
          title: 'Sign In Safely',
          copy: 'Use the username and password given to you by an admin.',
          icon: KeyRound,
        },
        {
          title: 'Different Access Levels',
          copy: 'Members can chat and view files. Admins can also upload files and manage people.',
          icon: UserCog,
        },
        {
          title: 'Runs Locally',
          copy: 'The assistant and file search run in your local setup.',
          icon: DatabaseZap,
        },
      ]

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute -left-16 top-12 h-64 w-64 rounded-full bg-ember-500/15 blur-3xl motion-safe:animate-[float_18s_ease-in-out_infinite]" />
      <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-lagoon-500/12 blur-3xl motion-safe:animate-[float_20s_ease-in-out_infinite]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <div className="panel grid w-full gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,1.15fr)_420px]">
          <section className="flex flex-col justify-between rounded-[28px] border border-white/8 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-6 sm:p-8 lg:p-10">
            <div className="max-w-2xl space-y-5">
              <p className="eyebrow">{setupRequired ? 'First-Time Setup' : 'Sign In'}</p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-mist-50 sm:text-5xl">
                {setupRequired ? 'Create the first admin account.' : 'Sign in to continue.'}
              </h1>
              <p className="text-base leading-7 text-mist-200">
                {setupRequired
                  ? 'This first account can add more people, choose who can upload files, and manage access later.'
                  : 'Use your username and password to open the assistant and the files you have access to.'}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map((highlight) => {
                const Icon = highlight.icon

                return (
                  <article
                    key={highlight.title}
                    className="data-card motion-safe:animate-[rise_0.45s_ease-out] flex flex-col"
                  >
                    <div className="icon-box bg-ember-500/15 text-ember-300">
                      <Icon />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-mist-50">
                      {highlight.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-mist-400">
                      {highlight.copy}
                    </p>
                  </article>
                )
              })}
            </div>
          </section>

          <form className="panel-strong flex flex-col gap-5 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div className="section-block">
              <div className="stat-pill border-ember-400/20 bg-ember-500/10 text-ember-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {setupRequired ? 'First admin needed' : 'Protected sign-in'}
              </div>
              <div className="section-block">
                <h2 className="text-2xl font-semibold tracking-tight text-mist-50">
                  {setupRequired ? 'First Admin Setup' : 'Sign In'}
                </h2>
                <p className="text-sm leading-6 text-mist-400">
                  {setupRequired
                    ? 'Choose a username and password for the first admin. Passwords must be at least eight characters.'
                    : 'Enter the username and password given to you.'}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block space-y-2" htmlFor="auth-username">
                <span className="field-label">Username</span>
                <input
                  id="auth-username"
                  className="field-input"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  minLength={3}
                  maxLength={50}
                  placeholder="Enter username"
                  required
                />
              </label>

              <label className="block space-y-2" htmlFor="auth-password">
                <span className="field-label">Password</span>
                <input
                  id="auth-password"
                  className="field-input"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  maxLength={128}
                  placeholder="Enter password"
                  required
                />
              </label>

              {setupRequired ? (
                <label className="block space-y-2" htmlFor="auth-confirm-password">
                  <span className="field-label">Confirm Password</span>
                  <input
                    id="auth-confirm-password"
                    className="field-input"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    minLength={8}
                    maxLength={128}
                    placeholder="Repeat password"
                    required
                  />
                </label>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-2xl border border-coral-400/30 bg-coral-400/10 px-4 py-3 text-sm leading-6 text-coral-400">
                {error}
              </div>
            ) : null}

            <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
              <KeyRound className="h-4 w-4" />
              {isSubmitting
                ? 'Working...'
                : setupRequired
                  ? 'Create Admin'
                  : 'Sign In'}
            </button>

            <p className="text-xs leading-6 text-mist-500">
              This browser remembers your sign-in on this device until you log out.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AuthScreen
