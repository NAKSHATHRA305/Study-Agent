import { useState, useRef, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

const SYSTEM_BASE = `You are a smart study assistant. Be thorough and direct. No filler.

Format ALL responses using clean markdown:
- Use ## for section headers
- Use **bold** for key terms only
- Use bullet lists (- item) for lists of concepts
- Use numbered lists (1. item) for steps or ordered info
- Use \`code\` for commands, filenames, technical strings
- Use > for important callouts or definitions
- Leave a blank line between sections
- For flashcards: use Q: / A: format, one per line pair
- For quizzes: number each question, list options as a) b) c) d)
- Keep answers tight — no padding, no "Great question!", no filler openers

You specialize in CS: distributed systems, Spark, Pig, MapReduce, web mining, PageRank, HITS, Linux, Big Data.`

// ── Markdown renderer ──────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <div key={i} style={{
          fontSize: '0.92rem', fontWeight: '700', color: '#e8d5b7',
          marginTop: '18px', marginBottom: '6px', letterSpacing: '0.02em',
          borderBottom: '1px solid #222', paddingBottom: '4px'
        }}>
          {inlineFormat(line.slice(3))}
        </div>
      )
      i++; continue
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <div key={i} style={{
          fontSize: '0.87rem', fontWeight: '600', color: '#d4c4a0',
          marginTop: '12px', marginBottom: '4px'
        }}>
          {inlineFormat(line.slice(4))}
        </div>
      )
      i++; continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <div key={i} style={{
          borderLeft: '2px solid #e8d5b7', paddingLeft: '12px',
          color: '#a89880', fontStyle: 'italic',
          margin: '8px 0', fontSize: '0.86rem'
        }}>
          {inlineFormat(line.slice(2))}
        </div>
      )
      i++; continue
    }

    // Bullet list — collect consecutive items
    if (line.match(/^[-*] /)) {
      const items = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} style={{
          margin: '6px 0 6px 4px', paddingLeft: '18px',
          display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          {items.map((item, j) => (
            <li key={j} style={{ color: '#c8bfb0', fontSize: '0.87rem', lineHeight: '1.6' }}>
              {inlineFormat(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} style={{
          margin: '6px 0 6px 4px', paddingLeft: '20px',
          display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          {items.map((item, j) => (
            <li key={j} style={{ color: '#c8bfb0', fontSize: '0.87rem', lineHeight: '1.6' }}>
              {inlineFormat(item)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Code block
    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={`code-${i}`} style={{
          background: '#0a0a0a', border: '1px solid #1e1e1e',
          borderRadius: '6px', padding: '10px 14px',
          fontSize: '0.8rem', color: '#a8c0a0',
          overflowX: 'auto', margin: '8px 0',
          fontFamily: 'monospace', lineHeight: '1.5'
        }}>
          {codeLines.join('\n')}
        </pre>
      )
      i++; continue
    }

    // Q: / A: flashcard pairs
    if (line.startsWith('Q:')) {
      elements.push(
        <div key={`q-${i}`} style={{
          background: '#111', border: '1px solid #1e2a1e',
          borderRadius: '8px', padding: '10px 14px', margin: '6px 0'
        }}>
          <div style={{ color: '#8aad8a', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>QUESTION</div>
          <div style={{ color: '#c8bfb0', fontSize: '0.87rem' }}>{inlineFormat(line.slice(2).trim())}</div>
        </div>
      )
      i++; continue
    }
    if (line.startsWith('A:')) {
      elements.push(
        <div key={`a-${i}`} style={{
          background: '#0d0d1a', border: '1px solid #1e1e2a',
          borderRadius: '8px', padding: '10px 14px', margin: '0 0 10px 0'
        }}>
          <div style={{ color: '#8888cc', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>ANSWER</div>
          <div style={{ color: '#c8bfb0', fontSize: '0.87rem' }}>{inlineFormat(line.slice(2).trim())}</div>
        </div>
      )
      i++; continue
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<div key={i} style={{ borderTop: '1px solid #1e1e1e', margin: '12px 0' }} />)
      i++; continue
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '6px' }} />)
      i++; continue
    }

    // Normal paragraph
    elements.push(
      <div key={i} style={{ color: '#c8bfb0', fontSize: '0.87rem', lineHeight: '1.7' }}>
        {inlineFormat(line)}
      </div>
    )
    i++
  }

  return elements
}

function inlineFormat(text) {
  const parts = []
  const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\*[^*]+\*)/g
  let last = 0, match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const m = match[0]
    if (m.startsWith('**'))
      parts.push(<strong key={match.index} style={{ color: '#e8d5b7', fontWeight: '600' }}>{m.slice(2, -2)}</strong>)
    else if (m.startsWith('`'))
      parts.push(<code key={match.index} style={{ background: '#1a1a1a', color: '#a8c0a0', padding: '1px 5px', borderRadius: '3px', fontSize: '0.82em', fontFamily: 'monospace' }}>{m.slice(1, -1)}</code>)
    else if (m.startsWith('*'))
      parts.push(<em key={match.index} style={{ color: '#b8b0a0' }}>{m.slice(1, -1)}</em>)
    last = match.index + m.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Upload your notes (PDF, TXT, MD) and ask me anything — summaries, flashcards, quizzes, topic gaps, concept explanations.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [activeFiles, setActiveFiles] = useState(new Set())  // which files are "in context"
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState('')
  const bottomRef = useRef(null)
  const historyRef = useRef([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function extractPDF(arrayBuffer) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map(item => item.str).join(' ') + '\n'
    }
    return text
  }

  async function handleFileUpload(e) {
    const fileList = Array.from(e.target.files)
    if (!fileList.length) return
    setExtracting(true)
    const loaded = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      setExtractProgress(`Reading ${file.name} (${i + 1}/${fileList.length})...`)
      try {
        let content = ''
        if (file.name.endsWith('.pdf')) {
          const buf = await file.arrayBuffer()
          content = await extractPDF(buf)
        } else {
          content = await file.text()
        }
        loaded.push({ name: file.name, content: content.slice(0, 12000) })
      } catch {
        loaded.push({ name: file.name, content: '[Could not read this file]' })
      }
    }

    setFiles(prev => {
      const updated = [...prev, ...loaded]
      setActiveFiles(new Set(updated.map(f => f.name)))  // auto-activate all
      return updated
    })
    setExtracting(false)
    setExtractProgress('')

    const names = loaded.map(f => f.name).join(', ')
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `## ${loaded.length} file${loaded.length > 1 ? 's' : ''} loaded\n${loaded.map(f => `- ${f.name}`).join('\n')}\n\nAll are active. Toggle files below to include/exclude from context.`
    }])
    e.target.value = ''
  }

  function toggleFile(name) {
    setActiveFiles(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function send() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')

    const userMsg = { role: 'user', content: userText }
    setMessages(prev => [...prev, userMsg])
    historyRef.current = [...historyRef.current, { role: 'user', content: userText }]
    setLoading(true)

    const selectedFiles = files.filter(f => activeFiles.has(f.name))

    let systemPrompt = SYSTEM_BASE
    if (selectedFiles.length > 0) {
      systemPrompt += `\n\n---\nUser's uploaded study material (${selectedFiles.length} module${selectedFiles.length > 1 ? 's' : ''}):\n\n`
      systemPrompt += selectedFiles.map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n---\n\n')
    } else {
      systemPrompt += `\n\nNo files active. If asked about notes, remind user to upload or activate files.`
    }

    const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          max_tokens: 1500,
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyRef.current.map(m => ({ role: m.role, content: m.content }))
          ]
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(JSON.stringify(err.error) || `API error ${res.status}`)
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'No response.'
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }]
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${err.message}` }])
    }

    setLoading(false)
  }

  const activeCount = activeFiles.size

  return (
    <div style={{
      width: '100%', maxWidth: '780px', height: '100vh',
      display: 'flex', flexDirection: 'column', background: '#0f0f0f',
      fontFamily: 'Georgia, serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
      }}>
        <div style={{ fontSize: '1.05rem', color: '#e8d5b7', letterSpacing: '0.05em' }}>Study Agent</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {files.length > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#555' }}>
              {activeCount}/{files.length} active
            </span>
          )}
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={extracting}
            style={{
              background: 'transparent', border: '1px solid #2a2a2a',
              color: extracting ? '#444' : '#888', padding: '6px 14px',
              borderRadius: '8px', cursor: extracting ? 'not-allowed' : 'pointer',
              fontSize: '0.76rem', letterSpacing: '0.04em'
            }}
          >
            {extracting ? extractProgress : '+ Upload Notes'}
          </button>
          <input ref={fileInputRef} type="file" multiple accept=".txt,.pdf,.md,.csv"
            style={{ display: 'none' }} onChange={handleFileUpload} />
        </div>
      </div>

      {/* File toggles */}
      {files.length > 0 && (
        <div style={{
          padding: '8px 24px', borderBottom: '1px solid #1a1a1a',
          display: 'flex', flexWrap: 'wrap', gap: '6px', flexShrink: 0,
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.65rem', color: '#444', marginRight: '4px', letterSpacing: '0.06em' }}>CONTEXT:</span>
          {files.map((f, i) => {
            const on = activeFiles.has(f.name)
            return (
              <button key={i} onClick={() => toggleFile(f.name)} style={{
                background: on ? '#1a1a0d' : '#111',
                border: `1px solid ${on ? '#3a3010' : '#1e1e1e'}`,
                borderRadius: '20px', padding: '3px 10px',
                fontSize: '0.7rem', color: on ? '#c8b870' : '#444',
                cursor: 'pointer', maxWidth: '180px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }} title={f.name}>
                {on ? '● ' : '○ '}{f.name}
              </button>
            )
          })}
          {files.length > 1 && (
            <button onClick={() => setActiveFiles(new Set(files.map(f => f.name)))} style={{
              background: 'transparent', border: '1px solid #1e1e1e',
              borderRadius: '20px', padding: '3px 10px', fontSize: '0.68rem',
              color: '#444', cursor: 'pointer'
            }}>all on</button>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: msg.role === 'user' ? '72%' : '88%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
              background: msg.role === 'user' ? '#1e1a14' : '#111',
              border: `1px solid ${msg.role === 'user' ? '#332a1c' : '#1c1c1c'}`,
              lineHeight: '1.7'
            }}>
              {msg.role === 'user'
                ? <div style={{ color: '#c8bfb0', fontSize: '0.88rem' }}>{msg.content}</div>
                : renderMarkdown(msg.content)
              }
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 18px', background: '#111', border: '1px solid #1c1c1c',
              borderRadius: '14px 14px 14px 3px', display: 'flex', gap: '5px', alignItems: 'center'
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '5px', height: '5px', borderRadius: '50%', background: '#555',
                  animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #1a1a1a', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: '8px', background: '#111',
          border: '1px solid #1e1e1e', borderRadius: '12px', padding: '7px 7px 7px 14px'
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={activeCount > 0 ? `Ask about ${activeCount} active module${activeCount > 1 ? 's' : ''}...` : 'Ask anything...'}
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#d4c9b8', fontSize: '0.88rem', fontFamily: 'Georgia, serif',
              resize: 'none', lineHeight: '1.5', paddingTop: '3px'
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading ? '#e8d5b7' : '#181818',
              color: input.trim() && !loading ? '#0f0f0f' : '#333',
              border: 'none', borderRadius: '8px', padding: '7px 16px',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontSize: '0.82rem', fontWeight: '700', alignSelf: 'flex-end',
              transition: 'all 0.15s'
            }}
          >
            Send
          </button>
        </div>
        <div style={{ fontSize: '0.62rem', color: '#252525', marginTop: '6px', textAlign: 'center', letterSpacing: '0.08em' }}>
          ENTER TO SEND · SHIFT+ENTER FOR NEW LINE
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
      `}</style>
    </div>
  )
}
