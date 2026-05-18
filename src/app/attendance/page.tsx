'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile, MONTHS } from '@/lib/types'

const PL_DAYS = ['Pn','Wt','Śr','Cz','Pt','So','Nd']
const MONTH_START_DAYS = [0, 2, 5]
const STATUS_LABELS: Record<string, { label: string, color: string, bg: string }> = {
  obecny:         { label: '✅ Obecny',            color: '#1a5e3a', bg: '#d5f5e3' },
  spoznienie:     { label: '🟡 Spóźnienie',        color: '#7a5c00', bg: '#fdd68a' },
  wczesne_wyjscie:{ label: '🟠 Wczesne wyjście',   color: '#7a3a00', bg: '#fde8c8' },
  nieobecny:      { label: '❌ Nieobecny',          color: '#c0392b', bg: '#fff0ee' },
  zastepstwo:     { label: '🔵 Zastępstwo',         color: '#064d61', bg: '#d6e4f7' },
  urlop:          { label: '⚪ Urlop',              color: '#444',    bg: '#f0f0f0' },
  chorobowe:      { label: '🟣 Chorobowe',          color: '#5b2d8e', bg: '#ede7f6' },
}

function getDow(mi: number, day: number) {
  return (MONTH_START_DAYS[mi] + day - 1) % 7
}

export default function AttendancePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workers, setWorkers] = useState<Profile[]>([])
  const [monthIdx, setMonthIdx] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate())
  const [attendance, setAttendance] = useState<Record<string, any>>({})
  const [shifts, setShifts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role === 'pracownik') { router.push('/dashboard'); return }
      setProfile(prof)
      const { data: w } = await supabase.from('profiles').select('*').eq('status', 'aktywny').order('last_name')
      setWorkers(w || [])
      await loadDayData(monthIdx, selectedDay)
      setLoading(false)
    }
    load()
  }, [])

  async function loadDayData(mi: number, day: number) {
    const m = MONTHS[mi]
    const date = `${m.year}-${String(m.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`

    const { data: att } = await supabase
      .from('attendance').select('*').eq('date', date)
    const attMap: Record<string, any> = {}
    att?.forEach(a => { attMap[a.user_id] = a })
    setAttendance(attMap)

    const { data: sh } = await supabase
      .from('shifts').select('*').eq('date', date)
    const shMap: Record<string, any> = {}
    sh?.forEach(s => { shMap[s.user_id] = s })
    setShifts(shMap)
  }

  async function switchDay(day: number) {
    setSelectedDay(day)
    setLoading(true)
    await loadDayData(monthIdx, day)
    setLoading(false)
  }

  async function switchMonth(mi: number) {
    setMonthIdx(mi)
    setSelectedDay(1)
    setLoading(true)
    await loadDayData(mi, 1)
    setLoading(false)
  }

  async function updateAttendance(userId: string, field: string, value: string) {
    setSaving(userId)
    const m = MONTHS[monthIdx]
    const date = `${m.year}-${String(m.month).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
    const existing = attendance[userId]

    if (existing) {
      const { data } = await supabase
        .from('attendance')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single()
      if (data) setAttendance(prev => ({ ...prev, [userId]: data }))
    } else {
      const shift = shifts[userId]
      const { data } = await supabase
        .from('attendance')
        .insert({
          user_id: userId,
          date,
          shift_id: shift?.id || null,
          planned_start: shift?.start_time || null,
          planned_end: shift?.end_time || null,
          [field]: value,
        })
        .select().single()
      if (data) setAttendance(prev => ({ ...prev, [userId]: data }))
    }
    setSaving(null)
  }

  async function markAllPresent() {
    for (const w of workers) {
      if (!attendance[w.id]) {
        await updateAttendance(w.id, 'status', 'obecny')
      }
    }
    await loadDayData(monthIdx, selectedDay)
  }

  const m = MONTHS[monthIdx]
  const dateStr = `${m.year}-${String(m.month).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
  const presentCount = Object.values(attendance).filter(a => a.status === 'obecny').length
  const absentCount = Object.values(attendance).filter(a => a.status === 'nieobecny').length

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      {/* HEADER */}
      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>
          ← Wróć
        </button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>✅ Lista obecności</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>{dateStr} · {PL_DAYS[getDow(monthIdx, selectedDay)]}</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:'10px' }}>
          <div style={{ background:'#d5f5e3', color:'#1a5e3a', padding:'6px 14px', borderRadius:'20px', fontSize:'13px', fontWeight:600 }}>
            ✅ {presentCount} obecnych
          </div>
          <div style={{ background:'#fff0ee', color:'#c0392b', padding:'6px 14px', borderRadius:'20px', fontSize:'13px', fontWeight:600 }}>
            ❌ {absentCount} nieobecnych
          </div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'1000px', margin:'0 auto' }}>

        {/* MONTH TABS */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          {MONTHS.map((mo,i) => (
            <button key={i} onClick={()=>switchMonth(i)} style={{ padding:'8px 18px', borderRadius:'100px', border:'1.5px solid rgba(255,255,255,0.3)', background: monthIdx===i?'white':'rgba(255,255,255,0.15)', color: monthIdx===i?'#064d61':'white', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
              {mo.label}
            </button>
          ))}
        </div>

        {/* DAY SELECTOR */}
        <div style={{ background:'white', borderRadius:'18px', padding:'16px', marginBottom:'16px', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {Array.from({ length: m.days }, (_,i) => i+1).map(day => {
              const dow = getDow(monthIdx, day)
              const isWE = dow >= 5
              const isSel = day === selectedDay
              return (
                <button key={day} onClick={()=>switchDay(day)} style={{
                  width:'36px', height:'36px', borderRadius:'8px', border:'none',
                  background: isSel ? '#0a6e8a' : (isWE ? '#fff8ec' : '#f0f4f8'),
                  color: isSel ? 'white' : (isWE ? '#b87a00' : '#1a2c35'),
                  fontWeight: isSel ? 700 : 500, fontSize:'13px', cursor:'pointer',
                  boxShadow: isSel ? '0 2px 8px rgba(10,110,138,0.3)' : 'none'
                }}>
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
          <button onClick={markAllPresent} style={{ background:'#2d9e6b', color:'white', border:'none', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
            ✅ Oznacz wszystkich jako obecnych
          </button>
        </div>

        {/* LISTA PRACOWNIKÓW */}
        <div style={{ background:'white', borderRadius:'22px', padding:'24px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin:'0 0 20px', color:'#064d61', fontSize:'17px' }}>
            Pracownicy – {dateStr}
          </h3>

          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {workers.map(w => {
              const att = attendance[w.id]
              const shift = shifts[w.id]
              const isSaving = saving === w.id

              return (
                <div key={w.id} style={{ background:'#fafcfd', borderRadius:'14px', padding:'16px', border:'2px solid #ddeaf0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px', flexWrap:'wrap' }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'linear-gradient(135deg,#0a6e8a,#1a9bb8)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'14px', flexShrink:0 }}>
                      {w.first_name[0]}{w.last_name[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:'14px', color:'#064d61' }}>{w.first_name} {w.last_name}</div>
                      <div style={{ fontSize:'12px', color:'#6b8a95' }}>{w.stanowisko || 'Brak stanowiska'}</div>
                      {shift && <div style={{ fontSize:'11px', color:'#0a6e8a', marginTop:'2px' }}>📅 Grafik: {shift.start_time?.slice(0,5)}–{shift.end_time?.slice(0,5)}</div>}
                    </div>
                    {att && (
                      <div style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:600, background: STATUS_LABELS[att.status]?.bg || '#f0f0f0', color: STATUS_LABELS[att.status]?.color || '#444' }}>
                        {STATUS_LABELS[att.status]?.label || att.status}
                      </div>
                    )}
                  </div>

                  {/* STATUS BUTTONS */}
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px' }}>
                    {Object.entries(STATUS_LABELS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => updateAttendance(w.id, 'status', key)}
                        disabled={isSaving}
                        style={{
                          padding:'5px 10px', borderRadius:'20px', border:'2px solid',
                          borderColor: att?.status === key ? val.color : '#ddeaf0',
                          background: att?.status === key ? val.bg : 'white',
                          color: att?.status === key ? val.color : '#6b8a95',
                          fontSize:'11px', fontWeight:600, cursor:'pointer',
                          opacity: isSaving ? 0.5 : 1
                        }}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>

                  {/* GODZINY */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                    <div>
                      <label style={{ display:'block', fontSize:'10px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'3px' }}>Przyjście</label>
                      <input
                        type="time"
                        value={att?.actual_start?.slice(0,5) || ''}
                        onChange={e => updateAttendance(w.id, 'actual_start', e.target.value)}
                        style={{ width:'100%', padding:'6px 8px', border:'2px solid #ddeaf0', borderRadius:'8px', fontSize:'13px', color:'#1a2c35', outline:'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'10px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'3px' }}>Wyjście</label>
                      <input
                        type="time"
                        value={att?.actual_end?.slice(0,5) || ''}
                        onChange={e => updateAttendance(w.id, 'actual_end', e.target.value)}
                        style={{ width:'100%', padding:'6px 8px', border:'2px solid #ddeaf0', borderRadius:'8px', fontSize:'13px', color:'#1a2c35', outline:'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'10px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'3px' }}>Notatka</label>
                      <input
                        type="text"
                        value={att?.note || ''}
                        onChange={e => updateAttendance(w.id, 'note', e.target.value)}
                        placeholder="np. spóźnienie 15min"
                        style={{ width:'100%', padding:'6px 8px', border:'2px solid #ddeaf0', borderRadius:'8px', fontSize:'13px', color:'#1a2c35', outline:'none' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}