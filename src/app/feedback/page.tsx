'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'

export default function FeedbackPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ content: '', anonymous: false })
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setIsAdmin(prof?.role === 'administrator' || prof?.role === 'koordynator')
      await loadFeedbacks(user.id, prof?.role)
      setLoading(false)
    }
    load()
  }, [])

  async function loadFeedbacks(userId: string, role: string) {
    if (role === 'administrator' || role === 'koordynator') {
      // Admin widzi wszystkie
      const { data } = await supabase
        .from('feedback')
        .select('*, profiles(first_name, last_name)')
        .order('created_at', { ascending: false })
      setFeedbacks(data || [])
    } else {
      // Pracownik widzi tylko swoje
      const { data } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      setFeedbacks(data || [])
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return
    setSending(true)
    setMsg('')

    const { error } = await supabase.from('feedback').insert({
      user_id: profile?.id,
      content: form.content.trim(),
      anonymous: form.anonymous,
    })

    if (error) {
      setMsg('❌ Błąd: ' + error.message)
    } else {
      setMsg('✅ Wysłano!')
      setForm({ content: '', anonymous: false })
      await loadFeedbacks(profile!.id, profile!.role)
    }
    setSending(false)
  }

  async function deleteFeedback(id: string) {
    if (!confirm('Usunąć tę wiadomość?')) return
    await supabase.from('feedback').delete().eq('id', id)
    await loadFeedbacks(profile!.id, profile!.role)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #ddeaf0',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#1a2c35',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'Arial',
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      {/* HEADER */}
      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>
          ← Wróć
        </button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>💬 Uwagi i żale</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>
            {isAdmin ? 'Wszystkie wiadomości od pracowników' : 'Napisz do managera – możesz być anonimowy'}
          </div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'700px', margin:'0 auto' }}>

        {/* FORMULARZ – tylko dla pracowników lub też dla admina */}
        {!isAdmin && (
          <div style={{ background:'white', borderRadius:'22px', padding:'24px', marginBottom:'20px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin:'0 0 16px', color:'#064d61', fontSize:'17px' }}>✍️ Napisz wiadomość</h3>

            <div style={{ background:'#fff8ec', border:'1.5px solid #fdd68a', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', fontSize:'13px', color:'#7a5c00' }}>
              💡 Podanie danych jest dobrowolne – możesz wysłać anonimowo zaznaczając opcję poniżej.
            </div>

            <form onSubmit={handleSend}>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                required
                rows={5}
                placeholder="Napisz swoją uwagę, sugestię lub żal..."
                style={{ ...inputStyle, resize:'vertical' as const, marginBottom:'12px' }}
              />

              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                <input
                  type="checkbox"
                  id="anon"
                  checked={form.anonymous}
                  onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))}
                  style={{ width:'18px', height:'18px', cursor:'pointer' }}
                />
                <label htmlFor="anon" style={{ fontSize:'14px', color:'#1a2c35', cursor:'pointer' }}>
                  Wyślij anonimowo
                </label>
              </div>

              {msg && (
                <div style={{ background: msg.includes('Błąd')?'#fff0ee':'#d5f5e3', border:'1px solid', borderColor: msg.includes('Błąd')?'#e8604c':'#2d9e6b', borderRadius:'10px', padding:'10px 14px', marginBottom:'12px', color: msg.includes('Błąd')?'#e8604c':'#1a5e3a', fontSize:'13px' }}>
                  {msg}
                </div>
              )}

              <button type="submit" disabled={sending} style={{ background: sending?'#6b8a95':'#0a6e8a', color:'white', border:'none', padding:'12px 28px', borderRadius:'100px', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>
                {sending ? 'Wysyłanie...' : '📤 Wyślij wiadomość'}
              </button>
            </form>
          </div>
        )}

        {/* LISTA WIADOMOŚCI */}
        <div style={{ background:'white', borderRadius:'22px', padding:'24px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin:'0 0 16px', color:'#064d61', fontSize:'17px' }}>
            {isAdmin ? `📥 Wiadomości (${feedbacks.length})` : `📬 Moje wiadomości (${feedbacks.length})`}
          </h3>

          {feedbacks.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px', color:'#6b8a95', fontSize:'14px' }}>
              {isAdmin ? '📭 Brak wiadomości od pracowników' : '📭 Nie wysłałeś jeszcze żadnej wiadomości'}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {feedbacks.map(f => (
                <div key={f.id} style={{ background:'#fafcfd', borderRadius:'14px', padding:'16px', border:'2px solid #ddeaf0' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      {f.anonymous ? (
                        <span style={{ background:'#f0f4f8', color:'#6b8a95', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>
                          🎭 Anonimowo
                        </span>
                      ) : (
                        <span style={{ background:'#eef4fb', color:'#0a6e8a', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>
                          👤 {isAdmin && f.profiles ? `${f.profiles.first_name} ${f.profiles.last_name}` : `${profile?.first_name} ${profile?.last_name}`}
                        </span>
                      )}
                      <span style={{ fontSize:'11px', color:'#6b8a95' }}>
                        {new Date(f.created_at).toLocaleDateString('pl-PL', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => deleteFeedback(f.id)} style={{ background:'#fff0ee', color:'#e8604c', border:'none', padding:'4px 10px', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                        🗑 Usuń
                      </button>
                    )}
                  </div>
                  <p style={{ margin:0, fontSize:'14px', color:'#1a2c35', lineHeight:1.6 }}>{f.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADMIN – formularz odpowiedzi można dodać później */}
        {isAdmin && (
          <div style={{ background:'white', borderRadius:'22px', padding:'20px', marginTop:'16px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin:'0 0 8px', color:'#064d61', fontSize:'15px' }}>✍️ Napisz do pracowników</h3>
            <p style={{ margin:'0 0 16px', fontSize:'13px', color:'#6b8a95' }}>Możesz też wysłać wiadomość jako administrator.</p>
            <form onSubmit={handleSend}>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                required rows={3}
                placeholder="Napisz ogłoszenie lub odpowiedź..."
                style={{ ...inputStyle, resize:'vertical' as const, marginBottom:'12px' }}
              />
              {msg && (
                <div style={{ background: msg.includes('Błąd')?'#fff0ee':'#d5f5e3', border:'1px solid', borderColor: msg.includes('Błąd')?'#e8604c':'#2d9e6b', borderRadius:'10px', padding:'10px 14px', marginBottom:'12px', color: msg.includes('Błąd')?'#e8604c':'#1a5e3a', fontSize:'13px' }}>
                  {msg}
                </div>
              )}
              <button type="submit" disabled={sending} style={{ background: sending?'#6b8a95':'#0a6e8a', color:'white', border:'none', padding:'12px 28px', borderRadius:'100px', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>
                {sending ? 'Wysyłanie...' : '📤 Wyślij'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}