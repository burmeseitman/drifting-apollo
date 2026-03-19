const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001'
const TOKEN_STORAGE_KEY = 'slaw_access_token'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.join(', ') : data.detail
    throw new ApiError(detail || 'Request failed.', response.status, data)
  }

  return data
}

function getAuthHeaders(headers, includeJson = true) {
  const resolvedHeaders = new Headers(headers ?? {})

  if (includeJson && !resolvedHeaders.has('Content-Type')) {
    resolvedHeaders.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (token && !resolvedHeaders.has('Authorization')) {
    resolvedHeaders.set('Authorization', `Bearer ${token}`)
  }

  return resolvedHeaders
}

async function request(path, options = {}) {
  const { method = 'GET', body, headers, includeJson = true } = options
  const requestBody = body instanceof FormData ? body : body ? JSON.stringify(body) : undefined

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: getAuthHeaders(headers, body instanceof FormData ? false : includeJson),
    body: requestBody,
  })

  return parseResponse(response)
}

export function getAccessToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAccessToken(token) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export async function fetchHealth() {
  return request('/health', { includeJson: false })
}

export async function sendChatMessage({ prompt, model = 'llama3', use_rag = true }) {
  return request('/api/chat', {
    method: 'POST',
    body: { prompt, model, use_rag },
  })
}

export async function fetchChatHistory(limit = 100) {
  return request(`/api/chat/history?limit=${limit}`, { includeJson: false })
}

export async function clearChatHistory() {
  return request('/api/chat/history', {
    method: 'DELETE',
    includeJson: false,
  })
}

export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)

  return request('/api/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function fetchDocuments() {
  return request('/api/documents', { includeJson: false })
}

export async function fetchAuthStatus() {
  return request('/api/auth/status', { includeJson: false })
}

export async function login(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

export async function bootstrapAdmin(credentials) {
  return request('/api/auth/bootstrap', {
    method: 'POST',
    body: credentials,
  })
}

export async function fetchCurrentUser() {
  return request('/api/auth/me', { includeJson: false })
}

export async function fetchUsers() {
  return request('/api/users', { includeJson: false })
}

export async function createUser(payload) {
  return request('/api/users', {
    method: 'POST',
    body: payload,
  })
}

export async function updateUser(userId, payload) {
  return request(`/api/users/${userId}`, {
    method: 'PATCH',
    body: payload,
  })
}
