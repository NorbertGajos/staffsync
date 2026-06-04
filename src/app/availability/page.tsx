'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile, MONTHS } from '@/lib/types'

const PL_DAYS_HEADER = ['Pn','Wt','Śr','Cz','Pt','So','Nd']
const HOURS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00']

function getDow(mi: number, day: number) {
  const m = MONTHS[mi]
  return new Date(m.year, m.month - 1, day).getDay()
}
function isWeekend(mi: number, day: number) {
  const d = getDow(mi, day)
  return d === 0 || d === 6
}
function getMonthStartOffset(mi: number) {
  const m = MONTHS[mi]
  const dow = new Date(m.year, m.month - 1, 1).getDay()
  return dow === 0 ? 6 : dow - 1
}

type DayData = { type: 'allday' } | { type: 'hours', from: string, to: string } | null

export default function AvailabilityPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [monthIdx, setMonthIdx] = useState(0)
  const [days, setDays] = useState<Record<number, DayData>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [popup, setPopup] = useState<number | null>(null)
  const [popupFrom, setPopupFrom] = useState('10:00')
  const [popupTo, setPopupTo] = useState('18:00')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      await loadAvailability(user.id, 0)
      setLoading(false)
    }
    load()
  }, [])

  async function loadAvailability(userId: string, mi: number) {
    const m = MONTHS[mi]
    const from = `${m.year}-${String(m.month).padStart(2,'0')}-01`
    const to = `${m.year}-${String(m.month).padStart(2,'0')}-${String(m.days).padStart(2,'0')}`
    const { data } = await supabase.from('availability').select('*')
      .eq('user_id', userId).gte('date', from).lte('date', to)
    const map: Record<number, DayData> = {}
    data?.forEach(a => {
      const day = parseInt(a.date.split('-')[2])
      if (a.all_day) {
        map[day] = { type: 'allday' }
      } else if (a.from_time && a.to_time) {
        map[day] = { type: 'hours', from: a.from_time.slice(0,5), to: a.to_time.slice(0,5) }
      }
    })
    setDays(map)
  }

  async function switchMonth(mi: number) {
    setMonthIdx(mi)
    if (!profile) return
    setLoading(true)
    await loadAvailability(profile.id, mi)
    setLoading(false)
  }

  function handleDayClick(day: number) {
    const current = days[day]
    if (!current) {
      setDays(prev => ({ ...prev, [day]: { type: 'allday' } }))
    } else if (current.type === 'allday') {
      setPopupFrom('10:00')
      setPopupTo('18:00')
      setPopup(day)
    } else {
      setPopupFrom(current.from)
      setPopupTo(current.to)
      setPopup(day)
    }
  }

  function handleRemoveDay(day: number, e: React.MouseEvent) {
    e.stopPropagation()
    setDays(prev => {
      const next = { ...prev }
      delete next[day]
      return next
    })
  }

  function handleSetAllDay(day: number) {
    setDays(prev => ({ ...prev, [day]: { type: 'allday' } }))
    setPopup(null)
  }

  function handleSetHours() {
    if (popup === null) return
    setDays(prev => ({ ...prev, [popup]: { type: 'hours', from: popupFrom, to: popupTo } }))
    setPopup(null)
  }

  function selectAllWorkdays() {
    const d: Record<number, DayData> = {}
    for (let i = 1; i <= MONTHS[monthIdx].days; i++) {
      if (!isWeekend(monthIdx, i)) d[i] = { type: 'allday' }
    }
    setDays(d)
  }

  function selectAll() {
    const d: Record<number, DayData> = {}
    for (let i = 1; i <= MONTHS[monthIdx].days; i++) d[i] = { type: 'allday' }
    setDays(d)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const m = MONTHS[monthIdx]
    const from = `${m.year}-${String(m.month).padStart(2,'0')}-01`
    const to = `${m.year}-${String(m.month).padStart(2,'0')}-${String(m.days).padStart(2,'0')}`
    await supabase.from('availability').delete()
      .eq('user_id', profile.id).gte('date', from).lte('date', to)
    const toInsert = Object.entries(days)
      .filter(([, v]) => v !== null)
      .map(([day, data]) => ({
        user_id: profile.id,
        date: `${m.year}-${String(m.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
        available: true,
        all_day: data?.type === 'allday',
        from_time: data?.type === 'hours' ? data.from : null,
        to_time: data?.type === 'hours' ? data.to : null,
      }))
    if (toInsert.length > 0) await supabase.from('availability').insert(toInsert)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const selectedCount = Object.values(days).filter(Boolean).length
  const m = MONTHS[monthIdx]

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      {popup !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'white', borderRadius:'20px', padding:'28px', width:'320px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin:'0 0 20px', color:'#064d61', fontSize:'17px' }}>
              📅 Dzień {popup} — {MONTHS[monthIdx].label}
            </h3>
            <button onClick={() => handleSetAllDay(popup)}
              style={{ width:'100%', padding:'12px', background:'#0a6e8a', color:'white', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', marginBottom:'12px' }}>
              ✅ Cały dzień (domyślne godziny)
            </button>
            <div style={{ border:'2px solid #ddeaf0', borderRadius:'12px', padding:'16px', marginBottom:'12px' }}>
              <p style={{ margin:'0 0 12px', fontSize:'13px', fontWeight:600, color:'#6b8a95' }}>WYBIERZ GODZINY:</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', marginBottom:'4px', textTransform:'uppercase' as const }}>Od</label>
                  <select value={popupFrom} onChange={e => setPopupFrom(e.target.value)}
                    style={{ width:'100%', padding:'8px', border:'2px solid #ddeaf0', borderRadius:'8px', fontSize:'14px', color:'#1a2c35', outline:'none' }}>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', marginBottom:'4px', textTransform:'uppercase' as const }}>Do</label>
                  <select value={popupTo} onChange={e => setPopupTo(e.target.value)}
                    style={{ width:'100%', padding:'8px', border:'2px solid #ddeaf0', borderRadius:'8px', fontSize:'14px', color:'#1a2c35', outline:'none' }}>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSetHours}
                style={{ width:'100%', padding:'10px', background:'#f5a623', color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer', marginTop:'12px' }}>
                ⏰ Ustaw godziny
              </button>
            </div>
            <button onClick={() => setPopup(null)}
              style={{ width:'100%', padding:'10px', background:'transparent', color:'#6b8a95', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'13px', cursor:'pointer' }}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>
          ← Wróć
        </button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>📅 Moja dostępność</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>{profile?.first_name} {profile?.last_name}</div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'860px', margin:'0 auto' }}>

        <div style={{ marginBottom:'20px' }}>
          <select
            value={monthIdx}
            onChange={e => switchMonth(Number(e.target.value))}
            style={{ padding:'12px 20px', borderRadius:'12px', border:'2px solid rgba(255,255,255,0.4)', background:'white', color:'#064d61', fontWeight:600, fontSize:'14px', cursor:'pointer', outline:'none', width:'100%', maxWidth:'300px' }}
          >
            {MONTHS.map((mo, i) => (
              <option key={i} value={i}>{mo.label}</option>
            ))}
          </select>
        </div>

        <div style={{ background:'white', borderRadius:'22px', padding:'26px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          {saved && (
            <div style={{ background:'#d5f5e3', border:'1px solid #2d9e6b', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color:'#1a5e3a', fontSize:'14px', fontWeight:500 }}>
              ✅ Dostępność zapisana!
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <h2 style={{ margin:'0 0 4px', color:'#064d61', fontSize:'18px' }}>{m.label}</h2>
              <p style={{ margin:0, fontSize:'13px', color:'#6b8a95' }}>
                Kliknij dzień aby zaznaczyć · drugi klik = wybierz godziny · <strong style={{ color:'#0a6e8a' }}>{selectedCount} dni</strong>
              </p>
            </div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              <button onClick={selectAllWorkdays} style={{ background:'#eef4fb', color:'#0a6e8a', border:'none', padding:'8px 14px', borderRadius:'100px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>✓ Dni robocze</button>
              <button onClick={selectAll} style={{ background:'#eef4fb', color:'#0a6e8a', border:'none', padding:'8px 14px', borderRadius:'100px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>✓ Wszystkie</button>
              <button onClick={()=>setDays({})} style={{ background:'#fff0ee', color:'#e8604c', border:'none', padding:'8px 14px', borderRadius:'100px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>✕ Wyczyść</button>
            </div>
          </div>

          <div style={{ display:'flex', gap:'16px', marginBottom:'16px', fontSize:'12px', flexWrap:'wrap' }}>
            <span style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ width:16, height:16, borderRadius:4, background:'#0a6e8a', display:'inline-block' }}/> Cały dzień
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ width:16, height:16, borderRadius:4, background:'#f5a623', display:'inline-block' }}/> Konkretne godziny
            </span>
            <span style={{ color:'#6b8a95' }}>1. klik = zaznacz · 2. klik = zmień godziny · ✕ = usuń</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px', marginBottom:'8px' }}>
            {PL_DAYS_HEADER.map((d,i) => (
              <div key={i} style={{ textAlign:'center', fontSize:'11px', fontWeight:700, color: i>=5?'#f5a623':'#6b8a95', padding:'6px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'6px', marginBottom:'24px' }}>
            {Array.from({ length: getMonthStartOffset(monthIdx) }, (_,i) => <div key={`e${i}`}/>)}
            {Array.from({ length: m.days }, (_,i) => i+1).map(day => {
              const we = isWeekend(monthIdx, day)
              const data = days[day]
              const isAllDay = data?.type === 'allday'
              const isHours = data?.type === 'hours'
              const sel = !!data
              const dow = getDow(monthIdx, day)
              const dowLabel = PL_DAYS_HEADER[dow === 0 ? 6 : dow - 1]

              let bg = we ? '#fff8ec' : '#fafcfd'
              if (isAllDay) bg = we ? '#f5a623' : '#0a6e8a'
              if (isHours) bg = '#f5a623'

              let textColor = we ? '#b87a00' : '#1a2c35'
              if (sel) textColor = 'white'

              return (
                <div key={day} style={{ position:'relative' }}>
                  <button onClick={()=>handleDayClick(day)} style={{
                    width:'100%', aspectRatio:'1', borderRadius:'10px',
                    border: sel ? 'none' : `2px solid ${we?'#fdd68a':'#ddeaf0'}`,
                    background: bg, cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
                    transform: sel?'scale(1.06)':'scale(1)',
                    boxShadow: sel?'0 4px 12px rgba(10,110,138,0.28)':'none', padding:0,
                  }}>
                    <span style={{ fontWeight:700, fontSize:'13px', color:textColor, lineHeight:1 }}>{day}</span>
                    <span style={{ fontSize:'7px', fontWeight:600, color: sel?'rgba(255,255,255,0.8)':(we?'#b87a00':'#6b8a95') }}>
                      {dowLabel}
                    </span>
                    {isHours && data.type === 'hours' && (
                      <span style={{ fontSize:'6px', color:'rgba(255,255,255,0.9)', fontWeight:700, lineHeight:1 }}>
                        {data.from}-{data.to}
                      </span>
                    )}
                  </button>
                  {sel && (
                    <button onClick={(e)=>handleRemoveDay(day,e)} style={{
                      position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%',
                      background:'#e8604c', border:'2px solid white', color:'white', fontSize:'9px',
                      fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, lineHeight:1
                    }}>✕</button>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={handleSave} disabled={saving} style={{ width:'100%', padding:'14px', background: saving?'#6b8a95':'#0a6e8a', color:'white', border:'none', borderRadius:'100px', fontSize:'15px', fontWeight:600, cursor: saving?'not-allowed':'pointer' }}>
            {saving ? 'Zapisywanie...' : `💾 Zapisz dostępność na ${m.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}