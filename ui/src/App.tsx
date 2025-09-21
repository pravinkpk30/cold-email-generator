import { useEffect, useMemo, useState } from 'react'

// Shared types
type ToastType = 'info' | 'warn' | 'error' | 'success'
type Toast = { id: number, type: ToastType, text: string }

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'info'|'warn'|'error'|null>(null)
  const [emails, setEmails] = useState<string[]>([])
  const [inputError, setInputError] = useState<string | null>(null)
  const [disableGenerate, setDisableGenerate] = useState(false)
  const [asMarkdown, setAsMarkdown] = useState<boolean>(false)
  // Editing state for emails
  const [editing, setEditing] = useState<Record<number, boolean>>({})
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  const [toasts, setToasts] = useState<Toast[]>([])
  const addToast = (type: Toast['type'], text: string, timeout = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, text }])
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, timeout)
  }

  // LocalStorage keys
  const LS_KEYS = useMemo(() => ({ url: 'cr_url', emails: 'cr_emails', md: 'cr_as_md' }), [])

  // Load persisted state on mount
  useEffect(() => {
    try {
      const u = localStorage.getItem(LS_KEYS.url)
      const e = localStorage.getItem(LS_KEYS.emails)
      const md = localStorage.getItem(LS_KEYS.md)
      if (u) setUrl(u)
      if (e) setEmails(JSON.parse(e))
      if (md) setAsMarkdown(md === '1')
    } catch {}
  }, [LS_KEYS])

  // Persist changes
  useEffect(() => {
    try { localStorage.setItem(LS_KEYS.url, url) } catch {}
  }, [url, LS_KEYS])
  useEffect(() => {
    try { localStorage.setItem(LS_KEYS.emails, JSON.stringify(emails)) } catch {}
  }, [emails, LS_KEYS])
  useEffect(() => {
    try { localStorage.setItem(LS_KEYS.md, asMarkdown ? '1' : '0') } catch {}
  }, [asMarkdown, LS_KEYS])

  function validateUrl(value: string): string | null {
    const trimmed = value.trim()
    if (!trimmed) return 'Please enter a URL.'
    try {
      const u = new URL(trimmed)
      if (!/^https?:$/.test(u.protocol)) return 'URL must start with http or https.'
      return null
    } catch {
      return 'Please enter a valid URL.'
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setMessageType(null)
    setInputError(null)
    setEmails([])

    const err = validateUrl(url)
    if (err) {
      setInputError(err)
      addToast('error', err)
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || `Request failed with status ${res.status}`)
      }
      const data: { emails: string[] } = await res.json()
      setEmails(data.emails || [])
      // Reset edit state on new results
      setEditing({})
      setDrafts({})
      if (!data.emails || data.emails.length === 0) {
        setMessage('No emails generated. Try a different job URL.')
        setMessageType('warn')
        addToast('warn', 'No emails generated.')
      } else {
        setMessage(`Generated ${data.emails.length} email(s).`)
        setMessageType('info')
        addToast('success', `Generated ${data.emails.length} email(s).`)
        setDisableGenerate(true)
      }
    } catch (err: any) {
      console.error(err)
      const msg = err?.message || 'Something went wrong.'
      setMessage(msg)
      setMessageType('error')
      addToast('error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
          <img src="/logo.svg" alt="ColdReach AI" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">ColdReach AI</h1>
            <p className="text-xs text-slate-400 -mt-0.5">Generate tailored cold emails from job postings</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <form noValidate onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <label htmlFor="url" className="text-sm text-slate-300">Job URL</label>
          <div className="flex gap-2 items-center">
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setDisableGenerate(false); setInputError(null) }}
              placeholder="https://example.com/careers/some-job"
              className={classNames(
                'flex-1 rounded-lg border bg-white/5 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 disabled:opacity-70',
                inputError ? 'border-rose-500/60 focus:ring-rose-500' : 'border-white/10 focus:ring-brand'
              )}
              aria-invalid={!!inputError}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || disableGenerate}
              className={classNames(
                'rounded-lg px-4 py-2 font-semibold text-white shadow',
                'bg-gradient-to-tr from-brand to-brand-light',
                (loading || disableGenerate) && 'opacity-70 cursor-not-allowed'
              )}
            >
              <span className="inline-flex items-center gap-2">
                {loading && (
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {loading ? 'Generating…' : (disableGenerate ? 'Generated' : 'Generate')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUrl('')
                setEmails([])
                setMessage(null)
                setMessageType(null)
                setInputError(null)
                setDisableGenerate(false)
                addToast('info', 'Cleared')
                try {
                  localStorage.removeItem(LS_KEYS.url)
                  localStorage.removeItem(LS_KEYS.emails)
                } catch {}
              }}
              className="rounded-lg px-3 py-2 text-sm border border-white/10 bg-white/10 hover:bg-white/15"
              disabled={loading}
            >
              Reset
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" className="h-4 w-4" checked={asMarkdown} onChange={(e) => setAsMarkdown(e.target.checked)} />
              Copy as Markdown
            </label>
          </div>
          {inputError && (
            <div className="text-sm text-rose-400">{inputError}</div>
          )}
          {message && (
            <div
              className={classNames(
                'rounded-md px-3 py-2 text-sm',
                messageType === 'info' && 'bg-cyan-500/10 border border-cyan-500/40',
                messageType === 'warn' && 'bg-amber-500/10 border border-amber-500/40',
                messageType === 'error' && 'bg-rose-500/10 border border-rose-500/40',
              )}
            >
              {message}
            </div>
          )}
        </form>

        <section className="mt-6">
          {emails.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                onClick={async () => {
                  try {
                    const content = asMarkdown
                      ? emails.map(e => '```markdown\n' + e + '\n```').join('\n\n---\n\n')
                      : emails.join('\n\n---\n\n')
                    await navigator.clipboard.writeText(content)
                    setMessage('All emails copied to clipboard.')
                    setMessageType('info')
                    addToast('success', 'All emails copied')
                  } catch (err) {
                    setMessage('Failed to copy. Please try again.')
                    setMessageType('error')
                    addToast('error', 'Copy failed')
                  }
                }}
              >
                Copy All
              </button>
            </div>
          )}
          {emails.map((email, idx) => (
            <article key={idx} className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-300">Email #{idx + 1}</h3>
                <div className="flex items-center gap-2">
                  {!editing[idx] ? (
                    <>
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
                        onClick={() => {
                          setEditing(prev => ({ ...prev, [idx]: true }))
                          setDrafts(prev => ({ ...prev, [idx]: email }))
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
                        onClick={async () => {
                          try {
                            const content = asMarkdown ? `\n\n\`\`\`markdown\n${email}\n\`\`\`` : email
                            await navigator.clipboard.writeText(content)
                            setMessage('Email copied to clipboard.')
                            setMessageType('info')
                            addToast('success', 'Copied email')
                          } catch (err) {
                            setMessage('Failed to copy. Please try again.')
                            setMessageType('error')
                            addToast('error', 'Copy failed')
                          }
                        }}
                      >
                        Copy
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs hover:bg-emerald-500/15"
                        onClick={() => {
                          const updated = [...emails]
                          updated[idx] = drafts[idx] ?? ''
                          setEmails(updated)
                          setEditing(prev => ({ ...prev, [idx]: false }))
                          addToast('success', 'Saved changes')
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
                        onClick={() => {
                          setEditing(prev => ({ ...prev, [idx]: false }))
                          setDrafts(prev => ({ ...prev, [idx]: email }))
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!editing[idx] ? (
                <pre className="whitespace-pre-wrap text-slate-100">{email}</pre>
              ) : (
                <textarea
                  className="h-56 w-full resize-y rounded-lg border border-white/10 bg-white/5 p-3 text-slate-100 outline-none focus:ring-2 focus:ring-brand"
                  value={drafts[idx] ?? ''}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [idx]: e.target.value }))}
                />
              )}
            </article>
          ))}
        </section>
      </main>

      <footer className="mt-10 border-t border-white/10 py-6 text-center text-sm text-slate-500">
        Powered by LangChain + Groq
      </footer>
    </div>
  )
}

// Toasts container
function Toasts({ toasts }: { toasts: Toast[] }) {
  const color = (t: ToastType) =>
    t === 'success' ? 'bg-emerald-500/10 border-emerald-500/40' :
    t === 'info' ? 'bg-cyan-500/10 border-cyan-500/40' :
    t === 'warn' ? 'bg-amber-500/10 border-amber-500/40' :
    'bg-rose-500/10 border-rose-500/40'
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[22rem] flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto rounded-md border px-3 py-2 text-sm text-slate-100 ${color(t.type)}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
