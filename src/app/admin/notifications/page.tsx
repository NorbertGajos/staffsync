'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ title: '', body: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single() as any
      if ((prof as any)?.role !== 'administrator')
      setLoading(false)
    }
    check()
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setSending(true)
    setMsg('')

    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title, body: form.body })
    })
    const result = await res.json()

    if (result.error) {
      setMsg('❌ Błąd: ' + result.error)
    } else {
      setMsg(`✅ Wysłano do ${result.sent} z ${result.total} urządzeń!`)
      setForm({ title: '', body: '' })
    }
    setSending(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>
          ← Wróć
        </button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>🔔 Wyślij powiadomienie</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Powiadomi wszystkich pracowników którzy włączyli notyfikacje</div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'600px', margin:'0 auto' }}>

        {msg && (
          <div style={{ background: msg.includes('Błąd')?'#fff0ee':'#d5f5e3', border:'1px solid', borderColor: msg.includes('Błąd')?'#e8604c':'#2d9e6b', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color: msg.includes('Błąd')?'#e8604c':'#1a5e3a', fontSize:'14px' }}>
            {msg}
          </div>
        )}

        <div style={{ background:'white', borderRadius:'22px', padding:'28px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)', marginBottom:'16px' }}>
          <h2 style={{ margin:'0 0 20px', color:'#064d61', fontSize:'18px' }}>📣 Nowe powiadomienie</h2>

          <form onSubmit={handleSend}>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:'6px' }}>
                Tytuł *
              </label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                placeholder="np. Grafik na czerwiec jest gotowy!"
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none', boxSizing:'border-box' as const }}
              />
            </div>

            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:'6px' }}>
                Treść *
              </label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                required
                rows={4}
                placeholder="np. Sprawdź swój grafik w aplikacji StaffSync."
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none', boxSizing:'border-box' as const, resize:'vertical' as const, fontFamily:'Arial' }}
              />
            </div>

            <button type="submit" disabled={sending} style={{ background: sending?'#6b8a95':'#0a6e8a', color:'white', border:'none', padding:'14px 32px', borderRadius:'100px', cursor: sending?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, width:'100%' }}>
              {sending ? '⏳ Wysyłanie...' : '🔔 Wyślij powiadomienie do wszystkich'}
            </button>
          </form>
        </div>

        <div style={{ background:'white', borderRadius:'16px', padding:'16px 20px', boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin:'0 0 10px', color:'#064d61', fontSize:'14px' }}>💡 Przykłady powiadomień</h3>
          {[
            { title:'Grafik gotowy!', body:'Grafik na czerwiec jest już dostępny. Sprawdź swoje zmiany!' },
            { title:'Zmiana w grafiku', body:'Twój grafik na przyszły tydzień został zaktualizowany.' },
            { title:'Ważna informacja', body:'Jutro spotkanie zespołu o 9:00 przy głównym wejściu.' },
          ].map((ex, i) => (
            <div key={i}
              onClick={() => setForm({ title: ex.title, body: ex.body })}
              style={{ background:'#fafcfd', borderRadius:'10px', padding:'10px 14px', marginBottom:'8px', cursor:'pointer', border:'1.5px solid #ddeaf0' }}
            >
              <div style={{ fontWeight:600, fontSize:'13px', color:'#064d61' }}>{ex.title}</div>
              <div style={{ fontSize:'12px', color:'#6b8a95', marginTop:'2px' }}>{ex.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}