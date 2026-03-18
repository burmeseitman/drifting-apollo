const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001'

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.join(', ') : data.detail
    throw new Error(detail || 'Request failed.')
  }

  return data
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)
  return parseResponse(response)
}

export async function sendChatMessage({ prompt, model = 'llama3', use_rag = true }) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, model, use_rag }),
  })

  return parseResponse(response)
}

export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  return parseResponse(response)
}
