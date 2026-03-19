import { KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createUser, fetchUsers, updateUser } from '../../lib/api'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleString()
}

const emptyCreateForm = {
  username: '',
  password: '',
  role: 'user',
}

function getRoleLabel(role) {
  return role === 'admin' ? 'Admin' : 'Member'
}

const UsersPanel = ({ currentUser, onCurrentUserUpdated }) => {
  const [users, setUsers] = useState([])
  const [drafts, setDrafts] = useState({})
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [savingUserId, setSavingUserId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const syncDrafts = (items) => {
    setDrafts(
      Object.fromEntries(
        items.map((user) => [
          user.id,
          {
            role: user.role,
            is_active: user.is_active,
            password: '',
          },
        ]),
      ),
    )
  }

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await fetchUsers()
      setUsers(data)
      syncDrafts(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadInitialUsers() {
      setIsLoading(true)
      setError('')

      try {
        const data = await fetchUsers()
        if (!active) {
          return
        }
        setUsers(data)
        syncDrafts(data)
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

    loadInitialUsers()

    return () => {
      active = false
    }
  }, [])

  const handleCreateChange = (event) => {
    const { name, value } = event.target
    setCreateForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleDraftChange = (userId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: value,
      },
    }))
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsCreating(true)

    try {
      await createUser({
        username: createForm.username.trim(),
        password: createForm.password,
        role: createForm.role,
      })
      setCreateForm(emptyCreateForm)
      setMessage('Person added.')
      await loadUsers()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveUser = async (userId) => {
    const user = users.find((item) => item.id === userId)
    const draft = drafts[userId]
    if (!user || !draft) {
      return
    }

    const payload = {}
    if (draft.role !== user.role) {
      payload.role = draft.role
    }
    if (draft.is_active !== user.is_active) {
      payload.is_active = draft.is_active
    }
    if (draft.password.trim()) {
      payload.password = draft.password.trim()
    }

    if (Object.keys(payload).length === 0) {
      setMessage('Nothing to save.')
      return
    }

    setSavingUserId(userId)
    setError('')
    setMessage('')

    try {
      const updatedUser = await updateUser(userId, payload)
      const nextUsers = users.map((item) => (item.id === updatedUser.id ? updatedUser : item))
      setUsers(nextUsers)
      syncDrafts(nextUsers)
      setMessage(`Saved changes for ${updatedUser.username}.`)

      if (updatedUser.id === currentUser.id) {
        onCurrentUserUpdated?.(updatedUser)
      }
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingUserId(null)
    }
  }

  const adminCount = users.filter((user) => user.role === 'admin').length
  const activeCount = users.filter((user) => user.is_active).length

  return (
    <section className="grid h-full min-h-0 gap-4 overflow-y-auto pr-1 xl:grid-cols-[340px_minmax(0,1fr)]">
      <form className="panel flex h-fit flex-col gap-5 p-5 sm:p-6" onSubmit={handleCreateUser}>
        <div className="section-block">
          <p className="eyebrow">Add People</p>
          <h2 className="text-2xl font-semibold tracking-tight text-mist-50">
            Add a person
          </h2>
          <p className="text-sm leading-6 text-mist-400">
            Create an account and choose what this person can do. You can change it later.
          </p>
        </div>

        <label className="block space-y-2" htmlFor="new-username">
          <span className="field-label">Username</span>
          <input
            id="new-username"
            className="field-input"
            name="username"
            value={createForm.username}
            onChange={handleCreateChange}
            minLength={3}
            maxLength={50}
            placeholder="new-user"
            required
          />
        </label>

        <label className="block space-y-2" htmlFor="new-password">
          <span className="field-label">Password</span>
          <input
            id="new-password"
            className="field-input"
            name="password"
            type="password"
            value={createForm.password}
            onChange={handleCreateChange}
            minLength={8}
            maxLength={128}
            placeholder="Minimum 8 characters"
            required
          />
        </label>

        <label className="block space-y-2" htmlFor="new-role">
          <span className="field-label">Access level</span>
          <select
            id="new-role"
            className="field-input"
            name="role"
            value={createForm.role}
            onChange={handleCreateChange}
          >
            <option value="user">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <button className="primary-button w-full" type="submit" disabled={isCreating}>
          <UserPlus className="h-4 w-4" />
          {isCreating ? 'Adding...' : 'Add Person'}
        </button>

        {message ? (
          <div className="rounded-2xl border border-lagoon-400/20 bg-lagoon-500/10 px-4 py-3 text-sm leading-6 text-lagoon-300">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-coral-400/30 bg-coral-400/10 px-4 py-3 text-sm leading-6 text-coral-400">
            {error}
          </div>
        ) : null}

        <div className="data-card">
          <p className="text-sm font-semibold text-mist-50">Access summary</p>
          <p className="mt-2 text-sm leading-6 text-mist-400">
            Members can chat and view files. Admins can also upload files and manage people.
          </p>
        </div>
      </form>

      <div className="flex min-h-0 flex-col gap-4">
        <div className="panel flex flex-col gap-5 px-5 py-5 sm:px-6">
          <div className="section-block">
            <p className="eyebrow">People & Access</p>
            <h2 className="text-2xl font-semibold tracking-tight text-mist-50">
              Change access and sign-in
            </h2>
            <p className="text-sm leading-6 text-mist-400">
              Change access levels, turn sign-in on or off, and reset passwords.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="metric-card">
              <div className="icon-box bg-ember-500/15 text-ember-300">
                <Users />
              </div>
              <div className="metric-copy">
                <p className="text-sm font-semibold text-mist-50">People</p>
                <p className="text-xs leading-5 text-mist-400">{users.length} account{users.length === 1 ? '' : 's'}</p>
              </div>
            </article>

            <article className="metric-card">
              <div className="icon-box bg-lagoon-500/15 text-lagoon-300">
                <ShieldCheck />
              </div>
              <div className="metric-copy">
                <p className="text-sm font-semibold text-mist-50">Admins</p>
                <p className="text-xs leading-5 text-mist-400">{adminCount} admin account{adminCount === 1 ? '' : 's'}</p>
              </div>
            </article>

            <article className="metric-card">
              <div className="icon-box bg-white/8 text-mist-200">
                <KeyRound />
              </div>
              <div className="metric-copy">
                <p className="text-sm font-semibold text-mist-50">Active accounts</p>
                <p className="text-xs leading-5 text-mist-400">{activeCount} can sign in right now</p>
              </div>
            </article>
          </div>
        </div>

        <div className="panel min-h-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-mist-400">
              Loading people...
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-mist-400">
              No people yet.
            </div>
          ) : (
            <div className="min-h-0 space-y-4 overflow-y-auto p-5 sm:p-6">
              {users.map((user) => {
                const draft = drafts[user.id] ?? {
                  role: user.role,
                  is_active: user.is_active,
                  password: '',
                }

                const isSelf = user.id === currentUser.id

                return (
                  <article key={user.id} className="data-card">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-mist-50">{user.username}</h3>
                          {isSelf ? (
                            <span className="stat-pill border-white/10 bg-white/8">You</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-mist-400">
                          Added {formatDate(user.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`stat-pill ${
                            user.role === 'admin'
                              ? 'border-lagoon-400/20 bg-lagoon-500/10 text-lagoon-300'
                              : 'border-white/10 text-mist-200'
                          }`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                        <span
                          className={`stat-pill ${
                            user.is_active
                              ? 'border-ember-400/20 bg-ember-500/10 text-ember-300'
                              : 'border-coral-400/30 bg-coral-400/10 text-coral-400'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,220px)_minmax(0,240px)_minmax(0,1fr)]">
                      <label className="block space-y-2">
                        <span className="field-label">Access level</span>
                        <select
                          className="field-input"
                          value={draft.role}
                          onChange={(event) => handleDraftChange(user.id, 'role', event.target.value)}
                        >
                          <option value="user">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>

                      <div className="space-y-2">
                        <span className="field-label">Account Access</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={draft.is_active}
                          onClick={() => handleDraftChange(user.id, 'is_active', !draft.is_active)}
                          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-night-950/55 px-4 py-3 text-left"
                        >
                          <span>
                            <span className="block text-sm font-medium text-mist-50">
                              {draft.is_active ? 'Can sign in' : "Can't sign in"}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-mist-400">
                              This person cannot sign in while this is turned off.
                            </span>
                          </span>

                          <span
                            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                              draft.is_active
                                ? 'border-lagoon-400/40 bg-lagoon-500/25'
                                : 'border-white/10 bg-white/8'
                            }`}
                          >
                            <span
                              className={`absolute h-5 w-5 rounded-full bg-mist-50 shadow transition ${
                                draft.is_active ? 'left-6' : 'left-1'
                              }`}
                            />
                          </span>
                        </button>
                      </div>

                      <label className="block space-y-2">
                        <span className="field-label">Reset password</span>
                        <input
                          className="field-input"
                          type="password"
                          value={draft.password}
                          placeholder="Leave blank to keep the current password"
                          onChange={(event) => handleDraftChange(user.id, 'password', event.target.value)}
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={savingUserId === user.id}
                        onClick={() => handleSaveUser(user.id)}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {savingUserId === user.id ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default UsersPanel
