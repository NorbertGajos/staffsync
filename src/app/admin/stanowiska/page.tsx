'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { StanowiskoType } from '@/lib/types'

export default function StanowiskaPage() {
  const [stanowiska, setStanowiska] = useState<StanowiskoType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [newNazwa, setNewNazwa] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (prof?.role !== 'administrator') { router.push('/dashboard'); return }
      await loadStanowiska()
      setLoading(false)
    }
    load()
  }, [])

  async function loadStanowiska() {
    const { data } = await supabase
      .from('stanowiska')
      .select('*')
      .order('kolejnosc')
    setStanowiska(data || [])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newNazwa.trim()) return
    setSaving(true)
    setMsg('')
    const maxOrder = stanowiska.length > 0 ? Math.max(...stanowiska.map(s => s.kolejnosc)) + 1 : 1
    const { error } = await supabase.from('stanowiska').insert({
      nazwa: newNazwa.trim(),
      kolejnosc: maxOrder,
      aktywne: true
    })
    if (error) {
      setMsg('❌ Błąd: ' + error.message)
    } else {
      setMsg('✅ Dodano stanowisko!')
      setNewNazwa('')
      setShowAdd(false)
      await loadStanowiska()
    }
    setSaving(false)
  }

  async function toggleActive(s: StanowiskoType) {
    await supabase.from('stanowiska').update({ aktywne: !s.aktywne }).eq('id', s.id)
    await loadStanowiska()
  }

  async function handleDelete(id: string) {
    if (!confirm('Usunąć to stanowisko? Pracownicy je mający nie stracą przypisania.')) return
    await supabase.from('stanowiska').delete().eq('id', id)
    await loadStanowiska()
  }

  async function moveUp(idx: number) {
    if (idx === 0) return
    const a = stanowiska[idx]
    const b = stanowiska[idx - 1]
    await supabase.from('stanowiska').update({ kolejnosc: b.kolejnosc }).eq('id', a.id)
    await supabase.from('stanowiska').update({ kolejnosc: a.kolejnosc }).eq('id', b.id)
    await loadStanowiska()
  }

  async function moveDown(idx: number) {
    if (idx === stanowiska.length - 1) return
    const a = stanowiska[idx]
    const b = stanowiska[idx + 1]
    await supabase.from('stanowiska').update({ kolejnosc: b.kolejnosc }).eq('id', a.id)
    await supabase.from('stanowiska').update({ kolejnosc: a.kolejnosc }).eq('id', b.id)
    await loadStanowiska()
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
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>🏷 Zarządzanie stanowiskami</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Dodawaj, usuwaj i zmieniaj kolejność stanowisk</div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'700px', margin:'0 auto' }}>

        {msg && (
          <div style={{ background: msg.includes('Błąd')?'#fff0ee':'#d5f5e3', border:'1px solid', borderColor: msg.includes('Błąd')?'#e8604c':'#2d9e6b', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color: msg.includes('Błąd')?'#e8604c':'#1a5e3a', fontSize:'14px' }}>
            {msg}
          </div>
        )}

        {/* DODAJ STANOWISKO */}
        <div style={{ background:'white', borderRadius:'22px', padding:'24px', marginBottom:'16px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showAdd?'16px':'0' }}>
            <h2 style={{ margin:0, color:'#064d61', fontSize:'18px' }}>Stanowiska ({stanowiska.length})</h2>
            <button onClick={()=>setShowAdd(!showAdd)} style={{ background:'#0a6e8a', color:'white', border:'none', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
              {showAdd ? '✕ Anuluj' : '+ Dodaj stanowisko'}
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAdd} style={{ display:'flex', gap:'10px' }}>
              <input
                value={newNazwa}
                onChange={e => setNewNazwa(e.target.value)}
                required
                placeholder="Nazwa stanowiska..."
                style={{ flex:1, padding:'10px 14px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none' }}
              />
              <button type="submit" disabled={saving} style={{ background: saving?'#6b8a95':'#2d9e6b', color:'white', border:'none', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
                {saving ? '...' : 'Dodaj'}
              </button>
            </form>
          )}
        </div>

        {/* LISTA STANOWISK */}
        <div style={{ background:'white', borderRadius:'22px', padding:'24px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {stanowiska.map((s, idx) => (
              <div key={s.id} style={{ background: s.aktywne?'#fafcfd':'#f5f5f5', borderRadius:'12px', padding:'12px 16px', border:`2px solid ${s.aktywne?'#ddeaf0':'#e0e0e0'}`, display:'flex', alignItems:'center', gap:'10px' }}>
                
                {/* KOLEJNOŚĆ */}
                <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                  <button onClick={()=>moveUp(idx)} disabled={idx===0} style={{ background:'none', border:'none', cursor: idx===0?'default':'pointer', fontSize:'12px', opacity: idx===0?0.3:1, padding:'2px' }}>▲</button>
                  <button onClick={()=>moveDown(idx)} disabled={idx===stanowiska.length-1} style={{ background:'none', border:'none', cursor: idx===stanowiska.length-1?'default':'pointer', fontSize:'12px', opacity: idx===stanowiska.length-1?0.3:1, padding:'2px' }}>▼</button>
                </div>

                {/* NAZWA */}
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:'14px', fontWeight:600, color: s.aktywne?'#064d61':'#999' }}>
                    {s.nazwa}
                  </span>
                  {!s.aktywne && (
                    <span style={{ marginLeft:'8px', fontSize:'11px', color:'#999', fontStyle:'italic' }}>nieaktywne</span>
                  )}
                </div>

                {/* AKCJE */}
                <div style={{ display:'flex', gap:'6px' }}>
                  <button
                    onClick={() => toggleActive(s)}
                    style={{ background: s.aktywne?'#fff0ee':'#d5f5e3', color: s.aktywne?'#e8604c':'#2d9e6b', border:'none', padding:'6px 12px', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}
                  >
                    {s.aktywne ? '🔴 Ukryj' : '🟢 Aktywuj'}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{ background:'#fff0ee', color:'#e8604c', border:'none', padding:'6px 12px', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}
                  >
                    🗑 Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INFO */}
        <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:'14px', padding:'14px 18px', marginTop:'16px' }}>
          <p style={{ margin:0, fontSize:'13px', color:'white', lineHeight:1.6 }}>
            💡 <strong>Ukryte</strong> stanowiska nie pojawiają się w formularzach ale historia jest zachowana. <strong>Usunięcie</strong> jest trwałe.
          </p>
        </div>
      </div>
    </div>
  )
}