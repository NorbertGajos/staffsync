'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Profile[]>([])
  const [stanowiska, setStanowiska] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    stanowisko: '',
    role: 'pracownik' as 'pracownik' | 'koordynator' | 'administrator',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: w } = await supabase.from('profiles').select('*').order('last_name')
    // Sortuj: aktywni na górze, nieaktywni/zwolnieni na dole
    const sorted = (w || []).sort((a, b) => {
      const order = { aktywny: 0, nieaktywny: 1, zwolniony: 2 }
      const aO = order[a.status as keyof typeof order] ?? 1
      const bO = order[b.status as keyof typeof order] ?? 1
      if (aO !== bO) return aO - bO
      return a.last_name.localeCompare(b.last_name)
    })
    setWorkers(sorted)
    const { data: s } = await supabase.from('stanowiska').select('nazwa').eq('aktywne', true).order('kolejnosc')
    setStanowiska(s?.map(x => x.nazwa) || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const result = await res.json()
    if (result.error) {
      setMsg('Błąd: ' + result.error)
    } else {
      setMsg('✅ Pracownik dodany!')
      setForm({ first_name: '', last_name: '', email: '', password: '', phone: '', stanowisko: '', role: 'pracownik' })
      setShowAdd(false)
      loadAll()
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '2px solid #ddeaf0', borderRadius: '10px',
    fontSize: '14px', color: '#1a2c35', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px'
  }
  const labelStyle = {
    display: 'block' as const, fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px',
    color: '#6b8a95', textTransform: 'uppercase' as const, marginBottom: '4px'
  }

  // Podziel pracowników na aktywnych i resztę
  const aktywni = workers.filter(w => w.status === 'aktywny')
  const nieaktywni = workers.filter(w => w.status !== 'aktywny')

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>
      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>
          ← Wróć
        </button>
        <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>👥 Pracownicy</div>
      </div>

      <div style={{ padding:'24px', maxWidth:'900px', margin:'0 auto' }}>
        {msg && (
          <div style={{ background: msg.includes('Błąd')?'#fff0ee':'#d5f5e3', border:'1px solid', borderColor: msg.includes('Błąd')?'#e8604c':'#2d9e6b', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color: msg.includes('Błąd')?'#e8604c':'#1a5e3a', fontSize:'14px' }}>
            {msg}
          </div>
        )}

        <div style={{ background:'white', borderRadius:'22px', padding:'24px', marginBottom:'20px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showAdd?'20px':'0' }}>
            <h2 style={{ margin:0, color:'#064d61', fontSize:'18px' }}>Dodaj pracownika</h2>
            <button onClick={()=>setShowAdd(!showAdd)} style={{ background:'#0a6e8a', color:'white', border:'none', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
              {showAdd ? '✕ Anuluj' : '+ Dodaj'}
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAdd}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <div>
                  <label style={labelStyle}>Imię *</label>
                  <input style={inputStyle} value={form.first_name} onChange={e=>setForm(f=>({...f, first_name:e.target.value}))} required placeholder="Anna" />
                </div>
                <div>
                  <label style={labelStyle}>Nazwisko *</label>
                  <input style={inputStyle} value={form.last_name} onChange={e=>setForm(f=>({...f, last_name:e.target.value}))} required placeholder="Kowalska" />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} type="email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} required placeholder="anna@email.pl" />
                </div>
                <div>
                  <label style={labelStyle}>Numer telefonu</label>
                  <input style={inputStyle} type="tel" value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} placeholder="+48 000 000 000" />
                </div>
                <div>
                  <label style={labelStyle}>Hasło tymczasowe *</label>
                  <input style={inputStyle} type="password" value={form.password} onChange={e=>setForm(f=>({...f, password:e.target.value}))} required placeholder="Min. 6 znaków" />
                </div>
                <div>
                  <label style={labelStyle}>Stanowisko</label>
                  <select style={inputStyle} value={form.stanowisko} onChange={e=>setForm(f=>({...f, stanowisko:e.target.value}))}>
                    <option value="">— wybierz —</option>
                    {stanowiska.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Rola *</label>
                  <select style={inputStyle} value={form.role} onChange={e=>setForm(f=>({...f, role:e.target.value as any}))}>
                    <option value="pracownik">Pracownik</option>
                    <option value="koordynator">Koordynator</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving} style={{ background: saving?'#6b8a95':'#0a6e8a', color:'white', border:'none', padding:'12px 28px', borderRadius:'100px', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>
                {saving ? 'Dodawanie...' : 'Dodaj pracownika →'}
              </button>
            </form>
          )}
        </div>

        <div style={{ background:'white', borderRadius:'22px', padding:'24px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin:'0 0 20px', color:'#064d61', fontSize:'18px' }}>
            Lista pracowników ({workers.length})
          </h2>
          {loading ? (
            <p style={{ color:'#6b8a95' }}>Ładowanie...</p>
          ) : workers.length === 0 ? (
            <p style={{ color:'#6b8a95' }}>Brak pracowników. Dodaj pierwszego!</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* AKTYWNI */}
              {aktywni.map(w => (
                <div key={w.id} style={{ background:'#fafcfd', borderRadius:'14px', padding:'14px 18px', border:'2px solid #ddeaf0', display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:'linear-gradient(135deg,#0a6e8a,#1a9bb8)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'15px', flexShrink:0 }}>
                    {w.first_name[0]}{w.last_name[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'15px', color:'#064d61' }}>{w.first_name} {w.last_name}</div>
                    <div style={{ fontSize:'12px', color:'#6b8a95' }}>{w.stanowisko || 'Brak stanowiska'} · {w.role}</div>
                    {w.phone && <div style={{ fontSize:'12px', color:'#0a6e8a', marginTop:'2px' }}>📱 {w.phone}</div>}
                  </div>
                  <div style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:600, background:'#d5f5e3', color:'#1a5e3a' }}>
                    {w.status}
                  </div>
                  <button onClick={()=>router.push(`/admin/workers/${w.id}`)} style={{ background:'#0a6e8a', color:'white', border:'none', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                    Edytuj
                  </button>
                </div>
              ))}

              {/* SEPARATOR */}
              {nieaktywni.length > 0 && (
                <div style={{ padding:'8px 0', textAlign:'center' as const, fontSize:'12px', color:'#6b8a95', fontWeight:600, borderTop:'2px dashed #ddeaf0', marginTop:'4px' }}>
                  ── Nieaktywni / Zwolnieni ({nieaktywni.length}) ──
                </div>
              )}

              {/* NIEAKTYWNI */}
              {nieaktywni.map(w => (
                <div key={w.id} style={{ background:'#f5f5f5', borderRadius:'14px', padding:'14px 18px', border:'2px solid #e0e0e0', display:'flex', alignItems:'center', gap:'14px', opacity:0.7 }}>
                  <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:'linear-gradient(135deg,#999,#bbb)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'15px', flexShrink:0 }}>
                    {w.first_name[0]}{w.last_name[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'15px', color:'#666' }}>{w.first_name} {w.last_name}</div>
                    <div style={{ fontSize:'12px', color:'#999' }}>{w.stanowisko || 'Brak stanowiska'} · {w.role}</div>
                    {w.phone && <div style={{ fontSize:'12px', color:'#999', marginTop:'2px' }}>📱 {w.phone}</div>}
                  </div>
                  <div style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:600, background:'#fff0ee', color:'#e8604c' }}>
                    {w.status}
                  </div>
                  <button onClick={()=>router.push(`/admin/workers/${w.id}`)} style={{ background:'#6b8a95', color:'white', border:'none', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                    Edytuj
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}