import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = '/api'

const TRAIT_OPTIONS = [
  { id: 'funny', label: 'funny' },
  { id: 'light', label: 'light' },
  { id: 'sarcastic', label: 'sarcastic' },
  { id: 'rude', label: 'rude' },
  { id: 'buddha', label: 'full buddha' },
]

function loadTraits() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('chatbuddy_traits')
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    const allowed = new Set(TRAIT_OPTIONS.map((item) => item.id))
    return parsed.filter((id) => allowed.has(id))
  } catch {
    return []
  }
}

function App() {
  const storedSession =
    typeof window !== 'undefined' ? localStorage.getItem('chatbuddy_session') || '' : ''
  const [sessionId, setSessionId] = useState(storedSession)
  const [temperature, setTemperature] = useState(0.75)
  const [traits, setTraits] = useState(loadTraits)
  const [messages, setMessages] = useState(
    storedSession
      ? [
          {
            role: 'assistant',
            text: 'welcome back, friend. the line was quiet, but i kept listening.',
          },
        ]
      : [],
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasMessages = useMemo(() => messages.length > 0, [messages])
  const traitLine = useMemo(() => {
    if (!traits.length) return 'connected to buddy.bbs'
    const labels = TRAIT_OPTIONS.filter((item) => traits.includes(item.id)).map(
      (item) => item.label,
    )
    return `connected to buddy.bbs -- ${labels.join(', ')}`
  }, [traits])

  useEffect(() => {
    localStorage.setItem('chatbuddy_traits', JSON.stringify(traits))
  }, [traits])

  useEffect(() => {
    if (sessionId) {
      return
    }

    const createSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/session/new`)
        if (!res.ok) throw new Error('failed to start session')
        const data = await res.json()
        setSessionId(data.session_id)
        localStorage.setItem('chatbuddy_session', data.session_id)
        setMessages([{ role: 'assistant', text: data.greeting }])
      } catch (err) {
        setError(err.message || 'could not connect to backend')
      }
    }

    createSession()
  }, [sessionId])

  const toggleTrait = (id) => {
    setTraits((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading || !sessionId) return

    setError('')
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setInput('')

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: trimmed,
          temperature,
          traits,
        }),
      })
      if (!res.ok) throw new Error('backend error while generating reply')
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
    } catch (err) {
      setError(err.message || 'request failed')
    } finally {
      setLoading(false)
    }
  }

  const resetSession = async () => {
    if (!sessionId || loading) return
    try {
      await fetch(`${API_BASE}/session/${sessionId}/reset`, { method: 'POST' })
      setMessages([
        {
          role: 'assistant',
          text: 'forgotten. we begin as strangers again.',
        },
      ])
    } catch (err) {
      setError(err.message || 'failed to reset session')
    }
  }

  const exportChat = () => {
    if (!messages.length) return

    const transcript = messages
      .map((message) => `${message.role === 'assistant' ? 'buddy' : 'you'}:\n${message.text}`)
      .join('\n\n')
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `chatbuddy-${date}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <main className="app-shell">
      <header className="terminal-header">
        <div className="title-row">
          <h1>chatbuddy</h1>
          <span className="muted">{traitLine}</span>
        </div>
        <div className="controls-row">
          <label htmlFor="temp">
            temperature: <strong>{temperature.toFixed(2)}</strong>
          </label>
          <input
            id="temp"
            type="range"
            min="0.2"
            max="1.4"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            disabled={loading}
          />
          <div className="control-actions">
            <button type="button" onClick={exportChat} disabled={!hasMessages}>
              export chat
            </button>
            <button type="button" onClick={resetSession} disabled={loading || !hasMessages}>
              reset memory
            </button>
          </div>
        </div>
        <fieldset className="trait-row" disabled={loading}>
          <legend>voice</legend>
          {TRAIT_OPTIONS.map((option) => (
            <label key={option.id} className="trait-check">
              <input
                type="checkbox"
                checked={traits.includes(option.id)}
                onChange={() => toggleTrait(option.id)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </header>

      <section className="messages" aria-live="polite">
        {messages.map((message, idx) => (
          <article key={`${message.role}-${idx}`} className={`bubble ${message.role}`}>
            <div className="role">{message.role === 'assistant' ? 'buddy' : 'you'}</div>
            <p>{message.text}</p>
          </article>
        ))}
        {loading && (
          <article className="bubble assistant pending">
            <div className="role">buddy</div>
            <p>...</p>
          </article>
        )}
      </section>

      <footer className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="type a message, friend..."
          rows={3}
          disabled={!sessionId || loading}
        />
        <div className="composer-row">
          <small>enter to send, shift+enter for newline</small>
          <button type="button" onClick={sendMessage} disabled={loading || !input.trim()}>
            send
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </footer>
    </main>
  )
}

export default App
