'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MONTHS } from '@/lib/types'

const MONTH_START_DAYS = [0, 2, 5]
const PL_DAYS = ['Pn','Wt','Śr','Cz','Pt','So','Nd']

function getDow(mi: number, day: number) {
  return (MONTH_START_DAYS[mi] + day - 1) % 7
}
function isWeekend(mi: number, day: number) {
  const d = getDow(mi, day); return d === 5 || d === 6
}

type Limits = Record<number, Record<string, { min: number, max: number }>>

export default function SettingsPage() {
  const [monthIdx, setMonthIdx] = useState(0)
  const [limits, setLimits] = useState<Limits>({})
  const [stanowiska, setStanowiska] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedStan, setSelectedStan] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: s } = await supabase.from('stanowiska').select('nazwa').eq('aktywne', true).order('kolejnosc')
    const names = (s as any[])?.map((x: any) => x.nazwa) || []
    setStanowiska(names)
    if (names.length > 0) setSelectedStan(names[0])

    for (const m of MONTHS) {
      const { data: existing } = await supabase.from('schedules').select('*').eq('month', m.month).eq('year', m.year).single()
      if (!existing) await supabase.from('schedules').insert({ month: m.month, year: m.year, status: 'draft' })
    }

    const { data } = await supabase.from('schedule_limits').select('*, schedules(month, year)')
    const map: Limits = {}
    data?.forEach(l => {
      const mi = MONTHS.findIndex(m => m.month === l.schedules?.month && m.year === l.schedules?.year)
      if (mi === -1) return
      if (!map[mi]) map[mi] = {}
      map[mi][`${l.day_of_month}_${l.stanowisko}`] = { min: l.min_workers, max: l.max_workers }
    })
    setLimits(map)
    setLoading(false)
  }

  function getLimit(mi: number, day: number, stan: string) {
    return limits[mi]?.[`${day}_${stan}`] || { min: 0, max: 0 }
  }

  function setLimit(mi: number, day: number, stan: string, field: 'min' | 'max', val: string) {
    const num = Math.max(0, parseInt(val) || 0)
    setLimits(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[mi]) next[mi] = {}
      const key = `${day}_${stan}`
      if (!next[mi][key]) next[mi][key] = { min: 0, max: 0 }
      next[mi][key][field] = num
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const m = MONTHS[monthIdx]
    const { data: schedule } = await supabase.from('schedules').select('id').eq('month', m.month).eq('year', m.year).single()
    if (!schedule) { setSaving(false); return }
    await supabase.from('schedule_limits').delete().eq('schedule_id', schedule.id).eq('stanowisko', selectedStan)
    const toInsert = []
    for (let day = 1; day <= m.days; day++) {
      const lim = getLimit(monthIdx, day, selectedStan)
      if (lim.min > 0 || lim.max > 0) {
        toInsert.push({ schedule_id: schedule.id, stanowisko: selectedStan, day_of_month: day, min_workers: lim.min, max_workers: lim.max })
      }
    }
    if (toInsert.length > 0) await supabase.from('schedule_limits').insert(toInsert)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function copyWeekdayToAll() {
    const m = MONTHS[monthIdx]
    const mondayLim = (() => {
      for (let d = 1; d <= m.days; d++) { if (getDow(monthIdx, d) === 0) return getLimit(monthIdx, d, selectedStan) }
      return { min: 0, max: 0 }
    })()
    setLimits(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[monthIdx]) next[monthIdx] = {}
      for (let d = 1; d <= m.days; d++) {
        if (!isWeekend(monthIdx, d)) next[monthIdx][`${d}_${selectedStan}`] = { ...mondayLim }
      }
      return next
    })
  }

  function copyWeekendToAll() {
    const m = MONTHS[monthIdx]
    const satLim = (() => {
      for (let d = 1; d <= m.days; d++) { if (getDow(monthIdx, d) === 5) return getLimit(monthIdx, d, selectedStan) }
      return { min: 0, max: 0 }
    })()
    setLimits(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[monthIdx]) next[monthIdx] = {}
      for (let d = 1; d <= m.days; d++) {
        if (isWeekend(monthIdx, d)) next[monthIdx][`${d}_${selectedStan}`] = { ...satLim }
      }
      return next
    })
  }

  const m = MONTHS[monthIdx]

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>
          ← Wróć
        </button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>⚙️ Limity stanowisk</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Ustaw min/max pracowników per stanowisko per dzień</div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'900px', margin:'0 auto' }}>

        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          {MONTHS.map((mo,i) => (
            <button key={i} onClick={()=>setMonthIdx(i)} style={{ padding:'10px 20px', borderRadius:'100px', border:'1.5px solid rgba(255,255,255,0.3)', background: monthIdx===i?'white':'rgba(255,255,255,0.15)', color: monthIdx===i?'#064d61':'white', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
              {mo.label}
            </button>
          ))}
        </div>

        <div style={{ background:'white', borderRadius:'22px', padding:'24px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>

          {saved && (
            <div style={{ background:'#d5f5e3', border:'1px solid #2d9e6b', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color:'#1a5e3a', fontSize:'14px', fontWeight:500 }}>
              ✅ Limity zapisane!
            </div>
          )}

          <div style={{ marginBottom:'20px' }}>
            <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:'8px' }}>
              Wybierz stanowisko
            </label>
            <select value={selectedStan} onChange={e=>setSelectedStan(e.target.value)}
              style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'12px', fontSize:'14px', color:'#1a2c35', outline:'none', background:'white' }}>
              {stanowiska.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ background:'#fff8ec', border:'1.5px solid #fdd68a', borderRadius:'12px', padding:'12px 16px', marginBottom:'20px', fontSize:'13px', color:'#7a5c00' }}>
            💡 <strong>Min</strong> = minimalna obsada · <strong>Max</strong> = limit (blokuje zapisy) · <strong>0</strong> = brak limitu
          </div>

          <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
            <button onClick={copyWeekdayToAll} style={{ background:'#eef4fb', color:'#0a6e8a', border:'none', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
              📋 Kopiuj Pn → wszystkie dni robocze
            </button>
            <button onClick={copyWeekendToAll} style={{ background:'#fff8ec', color:'#b87a00', border:'none', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
              📋 Kopiuj So → wszystkie weekendy
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px', marginBottom:'8px' }}>
            {PL_DAYS.map((d,i) => (
              <div key={i} style={{ textAlign:'center', fontSize:'11px', fontWeight:700, color: i>=5?'#f5a623':'#6b8a95', padding:'6px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'6px', marginBottom:'24px' }}>
            {Array.from({ length: MONTH_START_DAYS[monthIdx] }, (_,i) => <div key={`e${i}`}/>)}
            {Array.from({ length: m.days }, (_,i) => i+1).map(day => {
              const we = isWeekend(monthIdx, day)
              const lim = getLimit(monthIdx, day, selectedStan)
              const hasLimit = lim.min > 0 || lim.max > 0
              return (
                <div key={day} style={{ borderRadius:'12px', border:`2px solid ${we?'#fdd68a':'#ddeaf0'}`, background: we?'#fff8ec':(hasLimit?'#f0faf5':'#fafcfd'), padding:'8px 4px', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <div style={{ fontWeight:700, fontSize:'12px', color: we?'#b87a00':'#064d61', lineHeight:1 }}>{day}</div>
                  <div style={{ fontSize:'8px', color: we?'#b87a00':'#6b8a95', marginBottom:'2px' }}>{PL_DAYS[getDow(monthIdx,day)]}</div>
                  <div style={{ width:'100%' }}>
                    <div style={{ fontSize:'8px', color:'#2d9e6b', fontWeight:600, textAlign:'center', marginBottom:'1px' }}>MIN</div>
                    <input type="number" min="0" value={lim.min} onChange={e=>setLimit(monthIdx, day, selectedStan, 'min', e.target.value)}
                      style={{ width:'100%', padding:'3px', border:'1.5px solid #a5d6a7', borderRadius:'6px', fontSize:'11px', textAlign:'center', outline:'none', color:'#1a2c35' }} />
                  </div>
                  <div style={{ width:'100%' }}>
                    <div style={{ fontSize:'8px', color:'#0a6e8a', fontWeight:600, textAlign:'center', marginBottom:'1px' }}>MAX</div>
                    <input type="number" min="0" value={lim.max} onChange={e=>setLimit(monthIdx, day, selectedStan, 'max', e.target.value)}
                      style={{ width:'100%', padding:'3px', border:'1.5px solid #ddeaf0', borderRadius:'6px', fontSize:'11px', textAlign:'center', outline:'none', color:'#1a2c35' }} />
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={handleSave} disabled={saving} style={{ width:'100%', padding:'14px', background: saving?'#6b8a95':'#0a6e8a', color:'white', border:'none', borderRadius:'100px', fontSize:'15px', fontWeight:600, cursor: saving?'not-allowed':'pointer' }}>
            {saving ? 'Zapisywanie...' : `💾 Zapisz limity – ${selectedStan} – ${m.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}