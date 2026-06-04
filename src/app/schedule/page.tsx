'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile, MONTHS } from '@/lib/types'

const HOURS = ['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00']

function getDow(mi: number, day: number) {
  const m = MONTHS[mi]
  return new Date(m.year, m.month - 1, day).getDay()
}
function isWeekend(mi: number, day: number) {
  const d = getDow(mi, day)
  return d === 0 || d === 6
}

type BusinessHour = { day_of_week: number, open_time: string, close_time: string, is_open: boolean }

export default function SchedulePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workers, setWorkers] = useState<Profile[]>([])
  const [availability, setAvailability] = useState<Record<string, Record<number, any>>>({})
  const [shifts, setShifts] = useState<Record<string, Record<number, any>>>({})
  const [monthIdx, setMonthIdx] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState<{ workerId: string, day: number } | null>(null)
  const [popupFrom, setPopupFrom] = useState('10:00')
  const [popupTo, setPopupTo] = useState('18:00')
  const [popupStan, setPopupStan] = useState('')
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<any>(null)
  const [stanowiska, setStanowiska] = useState<string[]>([])
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setIsAdmin(prof?.role === 'administrator' || prof?.role === 'koordynator')
      if (prof?.role === 'pracownik') { router.push('/panel'); return }
      const { data: bh } = await supabase.from('business_hours').select('*')
      setBusinessHours(bh || [])
      await loadData(0)
      setLoading(false)
    }
    load()
  }, [])

  async function loadData(mi: number) {
    const m = MONTHS[mi]
    const from = `${m.year}-${String(m.month).padStart(2,'0')}-01`
    const to = `${m.year}-${String(m.month).padStart(2,'0')}-${String(m.days).padStart(2,'0')}`
    const { data: w } = await supabase.from('profiles').select('*').eq('status', 'aktywny').order('stanowisko').order('last_name')
    setWorkers(w || [])
    const { data: avail } = await supabase.from('availability').select('*').gte('date', from).lte('date', to)
    const availMap: Record<string, Record<number, any>> = {}
    avail?.forEach(a => {
      if (!availMap[a.user_id]) availMap[a.user_id] = {}
      availMap[a.user_id][parseInt(a.date.split('-')[2])] = a
    })
    setAvailability(availMap)
    const { data: sh } = await supabase.from('shifts').select('*').gte('date', from).lte('date', to)
    const shMap: Record<string, Record<number, any>> = {}
    sh?.forEach(s => {
      if (!shMap[s.user_id]) shMap[s.user_id] = {}
      shMap[s.user_id][parseInt(s.date.split('-')[2])] = s
    })
    setShifts(shMap)
    const { data: stan } = await supabase.from('stanowiska').select('nazwa').eq('aktywne', true).order('kolejnosc')
    setStanowiska(stan?.map(s => s.nazwa) || [])
  }

  async function switchMonth(mi: number) {
    setMonthIdx(mi); setSelectedDay(null); setLoading(true)
    await loadData(mi); setLoading(false)
  }

  function openPopup(workerId: string, day: number) {
    if (!isAdmin) return
    const existing = shifts[workerId]?.[day]
    const avail = availability[workerId]?.[day]
    const we = isWeekend(monthIdx, day)
    const dow = getDow(monthIdx, day)
    const bh = businessHours.find(h => h.day_of_week === dow)
    const defaultFrom = avail?.all_day === false && avail?.from_time
      ? avail.from_time.slice(0,5)
      : (bh?.open_time?.slice(0,5) || (we ? '08:00' : '10:00'))
    const defaultTo = avail?.all_day === false && avail?.to_time
      ? avail.to_time.slice(0,5)
      : (bh?.close_time?.slice(0,5) || '18:00')
    setPopupFrom(existing?.start_time?.slice(0,5) || defaultFrom)
    setPopupTo(existing?.end_time?.slice(0,5) || defaultTo)
    const w = workers.find(w => w.id === workerId)
    setPopupStan(existing?.stanowisko || w?.stanowisko || '')
    setPopup({ workerId, day })
  }

  async function saveShift() {
    if (!popup) return
    setSaving(true)
    const m = MONTHS[monthIdx]
    const date = `${m.year}-${String(m.month).padStart(2,'0')}-${String(popup.day).padStart(2,'0')}`
    const existing = shifts[popup.workerId]?.[popup.day]
    if (existing) {
      await supabase.from('shifts').update({ start_time: popupFrom, end_time: popupTo, stanowisko: popupStan }).eq('id', existing.id)
    } else {
      await supabase.from('shifts').insert({ user_id: popup.workerId, date, start_time: popupFrom, end_time: popupTo, stanowisko: popupStan, status: 'planned' })
    }
    await loadData(monthIdx); setSaving(false); setPopup(null)
  }

  async function generateSchedule(overwrite: boolean) {
    setGenerating(true)
    setGenResult(null)
    const m = MONTHS[monthIdx]
    const res = await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: m.month, year: m.year, overwrite })
    })
    const result = await res.json()
    setGenResult(result)
    if (result.success) await loadData(monthIdx)
    setGenerating(false)
  }

  async function removeShift() {
    if (!popup) return
    const existing = shifts[popup.workerId]?.[popup.day]
    if (existing) { await supabase.from('shifts').delete().eq('id', existing.id); await loadData(monthIdx) }
    setPopup(null)
  }

  const grouped: Record<string, Profile[]> = {}
  workers.forEach(w => {
    const key = w.stanowisko || 'Brak stanowiska'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(w)
  })

  const m = MONTHS[monthIdx]
  const PL_DAYS_HEADER = ['Pn','Wt','Śr','Cz','Pt','So','Nd']

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>Ładowanie...</div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      {popup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'white', borderRadius:'20px', padding:'28px', width:'320px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin:'0 0 6px', color:'#064d61', fontSize:'17px' }}>✏️ Zmiana – dzień {popup.day}</h3>
            <p style={{ margin:'0 0 16px', fontSize:'13px', color:'#6b8a95' }}>
              {workers.find(w => w.id === popup.workerId)?.first_name} {workers.find(w => w.id === popup.workerId)?.last_name}
            </p>
            <div style={{ marginBottom:'12px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'4px' }}>Stanowisko</label>
              <select value={popupStan} onChange={e => setPopupStan(e.target.value)}
                style={{ width:'100%', padding:'10px', border:'2px solid #ddeaf0', borderRadius:'8px', fontSize:'14px', color:'#1a2c35', outline:'none' }}>
                <option value=''>— wybierz stanowisko —</option>
                {stanowiska.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'4px' }}>Od</label>
                <select value={popupFrom} onChange={e => setPopupFrom(e.target.value)} style={{ width:'100%', padding:'8px', border:'2px solid #ddeaf0', borderRadius:'8px', fontSize:'14px', color:'#1a2c35', outline:'none' }}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'4px' }}>Do</label>
                <select value={popupTo} onChange={e => setPopupTo(e.target.value)} style={{ width:'100%', padding:'8px', border:'2px solid #ddeaf0', borderRadius:'8px', fontSize:'14px', color:'#1a2c35', outline:'none' }}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={saveShift} disabled={saving} style={{ flex:1, padding:'12px', background:'#0a6e8a', color:'white', border:'none', borderRadius:'100px', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>
                {saving ? 'Zapisuję...' : '💾 Zapisz'}
              </button>
              {shifts[popup.workerId]?.[popup.day] && (
                <button onClick={removeShift} style={{ padding:'12px 16px', background:'#fff0ee', color:'#e8604c', border:'none', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>🗑</button>
              )}
              <button onClick={() => setPopup(null)} style={{ padding:'12px 16px', background:'#f0f4f8', color:'#6b8a95', border:'none', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>✕</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>← Wróć</button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>🗓 Grafik – {m.label}</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>{isAdmin ? 'Kliknij komórkę aby przypisać zmianę' : 'Podgląd grafiku'}</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {isAdmin && (
            <>
              <button onClick={() => generateSchedule(false)} disabled={generating}
                style={{ background: generating?'#6b8a95':'#2d9e6b', color:'white', border:'none', padding:'10px 20px', borderRadius:'100px', cursor: generating?'not-allowed':'pointer', fontSize:'13px', fontWeight:600 }}>
                {generating ? '⏳ Generuję...' : '🤖 Generuj grafik'}
              </button>
              <button onClick={() => { if(confirm('Usunąć obecny grafik i wygenerować od nowa?')) generateSchedule(true) }} disabled={generating}
                style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,0.4)', color:'white', padding:'10px 20px', borderRadius:'100px', cursor: generating?'not-allowed':'pointer', fontSize:'13px', fontWeight:600 }}>
                🔄 Od nowa
              </button>
            </>
          )}
          <button onClick={() => window.print()}
            style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
            🖨️ Drukuj / PDF
          </button>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'1200px', margin:'0 auto' }}>

        {genResult && (
          <div style={{ background: genResult.error?'#fff0ee':'#d5f5e3', border:`1px solid ${genResult.error?'#e8604c':'#2d9e6b'}`, borderRadius:'14px', padding:'16px 20px', marginBottom:'16px' }}>
            {genResult.error ? (
              <p style={{ margin:0, color:'#e8604c', fontWeight:600 }}>❌ Błąd: {genResult.error}</p>
            ) : (
              <>
                <p style={{ margin:'0 0 8px', color:'#1a5e3a', fontWeight:700 }}>✅ Grafik wygenerowany! {genResult.shiftsCreated} zmian przypisanych.</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                  {Object.entries(genResult.hoursPerWorker || {}).map(([name, hours]: any) => (
                    <span key={name} style={{ background:'white', border:'1px solid #2d9e6b', borderRadius:'20px', padding:'3px 10px', fontSize:'12px', color:'#064d61' }}>
                      {name}: <strong>{hours}h</strong>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ marginBottom:'16px' }}>
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

        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'16px', fontSize:'12px' }}>
          {[
            { bg:'#ffeaea', color:'#e8604c', label:'Brak dyspozycji', content:'✕' },
            { bg:'#e8f0f8', color:'#6b8a95', label:'Rezerwa (zgłosił, nie wybrany)', content:'R' },
            { bg:'#eef4fb', color:'#0a6e8a', label:'Zmiana – dzień roboczy', content:'✓' },
            { bg:'#fdd68a', color:'#7a5c00', label:'Zmiana – weekend', content:'✓' },
          ].map((l,i) => (
            <span key={i} style={{ display:'flex', alignItems:'center', gap:'5px', color:'white' }}>
              <span style={{ width:22, height:22, borderRadius:4, background:l.bg, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:700, color:l.color, flexShrink:0 }}>{l.content}</span>
              <span style={{ fontSize:'11px' }}>{l.label}</span>
            </span>
          ))}
        </div>

        <div style={{ background:'white', borderRadius:'22px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)', overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
            <thead>
              <tr>
                <th style={{ padding:'12px 16px', background:'#064d61', color:'white', textAlign:'left', fontSize:'13px', fontWeight:600, position:'sticky', left:0, zIndex:2, minWidth:'160px' }}>Pracownik</th>
                {Array.from({ length: m.days }, (_,i) => i+1).map(day => {
                  const dow = getDow(monthIdx, day)
                  const we = dow === 0 || dow === 6
                  const isSel = selectedDay === day
                  const dayLabel = PL_DAYS_HEADER[dow === 0 ? 6 : dow - 1]
                  return (
                    <th key={day} onClick={() => setSelectedDay(isSel ? null : day)}
                      style={{ padding:'6px 2px', background: isSel?'#1a9bb8':(we?'#b87a00':'#064d61'), color:'white', textAlign:'center', fontSize:'10px', fontWeight:600, cursor:'pointer', minWidth:'42px' }}>
                      <div style={{ fontWeight:700 }}>{day}</div>
                      <div style={{ fontSize:'8px', opacity:0.8 }}>{dayLabel}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([stanowisko, group]) => (
                <React.Fragment key={stanowisko}>
                  <tr>
                    <td colSpan={m.days + 1} style={{ padding:'8px 16px', background:'#eef4fb', color:'#064d61', fontWeight:700, fontSize:'11px', letterSpacing:'0.5px', textTransform:'uppercase' as const, borderTop:'2px solid #ddeaf0', borderBottom:'1px solid #ddeaf0' }}>
                      🏷 {stanowisko} · {group.length} {group.length === 1 ? 'osoba' : 'osoby/osób'}
                    </td>
                  </tr>
                  {group.map((w, wi) => (
                    <tr key={w.id} style={{ background: wi%2===0?'white':'#fafcfd' }}>
                      <td style={{ padding:'8px 16px', borderBottom:'1px solid #f0f4f8', position:'sticky', left:0, background: wi%2===0?'white':'#fafcfd', zIndex:1, minWidth:'160px' }}>
                        <div style={{ fontWeight:600, fontSize:'13px', color:'#064d61' }}>{w.first_name} {w.last_name}</div>
                        <div style={{ fontSize:'10px', color:'#6b8a95' }}>{Object.values(shifts[w.id] || {}).length} zmian</div>
                      </td>
                      {Array.from({ length: m.days }, (_,i) => i+1).map(day => {
                        const we = isWeekend(monthIdx, day)
                        const hasShift = !!shifts[w.id]?.[day]
                        const hasAvail = !!availability[w.id]?.[day]
                        const av = availability[w.id]?.[day]
                        const isSel = selectedDay === day

                        let bg = '#ffeaea'
                        let color = '#e8604c'
                        let content = '✕'
                        let fontSize = '11px'
                        let fontWeight = 700

                        if (hasAvail && !hasShift) {
                          bg = '#e8f0f8'
                          color = '#6b8a95'
                          if (av?.all_day === false && av?.from_time) {
                            content = `${av.from_time.slice(0,5)}-${av.to_time?.slice(0,5)}`
                            fontSize = '8px'
                          } else {
                            content = 'R'
                            fontSize = '11px'
                          }
                        }

                        if (hasShift) {
                          bg = we ? '#fdd68a' : '#eef4fb'
                          color = we ? '#7a5c00' : '#0a6e8a'
                          content = '✓'
                          fontSize = '14px'
                        }

                        if (isSel) {
                          bg = hasShift ? (we?'#f5a623':'#1a9bb8') : (hasAvail ? '#b0c4d8' : '#ffcccc')
                          color = 'white'
                        }

                        return (
                          <td key={day} onClick={() => isAdmin && openPopup(w.id, day)}
                            style={{ padding:'3px 2px', borderBottom:'1px solid #f0f4f8', textAlign:'center', cursor: isAdmin?'pointer':'default' }}>
                            <div style={{ borderRadius:'6px', padding:'3px 1px', background:bg, color, fontSize, fontWeight, minHeight:'34px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', lineHeight:1.2 }}>
                              {content}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {selectedDay && (
          <div style={{ background:'white', borderRadius:'22px', padding:'20px', marginTop:'16px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin:'0 0 14px', color:'#064d61', fontSize:'16px' }}>
              📋 {selectedDay} {m.label} – {PL_DAYS_HEADER[getDow(monthIdx, selectedDay) === 0 ? 6 : getDow(monthIdx, selectedDay) - 1]}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
              <div>
                <p style={{ margin:'0 0 8px', fontSize:'13px', fontWeight:700, color:'#2d9e6b' }}>✅ W grafiku ({workers.filter(w => shifts[w.id]?.[selectedDay]).length})</p>
                {workers.filter(w => shifts[w.id]?.[selectedDay]).map(w => (
                  <div key={w.id} style={{ fontSize:'13px', color:'#064d61', marginBottom:'4px', display:'flex', justifyContent:'space-between' }}>
                    <span>{w.first_name} {w.last_name}</span>
                    <span style={{ color:'#0a6e8a', fontWeight:600 }}>{shifts[w.id][selectedDay].start_time?.slice(0,5)}–{shifts[w.id][selectedDay].end_time?.slice(0,5)}</span>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ margin:'0 0 8px', fontSize:'13px', fontWeight:700, color:'#6b8a95' }}>📋 Rezerwa ({workers.filter(w => availability[w.id]?.[selectedDay] && !shifts[w.id]?.[selectedDay]).length})</p>
                {workers.filter(w => availability[w.id]?.[selectedDay] && !shifts[w.id]?.[selectedDay]).map(w => {
                  const avail = availability[w.id]?.[selectedDay]
                  const hours = avail?.all_day === false && avail?.from_time
                    ? `${avail.from_time.slice(0,5)}–${avail.to_time?.slice(0,5)}`
                    : 'cały dzień'
                  return (
                    <div key={w.id} style={{ fontSize:'13px', color:'#6b8a95', marginBottom:'4px', display:'flex', justifyContent:'space-between' }}>
                      <span>{w.first_name} {w.last_name} · {w.stanowisko || '—'}</span>
                      <span style={{ color:'#6b8a95', fontWeight:600 }}>{hours}</span>
                    </div>
                  )
                })}
              </div>
              <div>
                <p style={{ margin:'0 0 8px', fontSize:'13px', fontWeight:700, color:'#e8604c' }}>✕ Brak dyspozycji ({workers.filter(w => !availability[w.id]?.[selectedDay] && !shifts[w.id]?.[selectedDay]).length})</p>
                {workers.filter(w => !availability[w.id]?.[selectedDay] && !shifts[w.id]?.[selectedDay]).map(w => (
                  <div key={w.id} style={{ fontSize:'13px', color:'#e8604c', marginBottom:'4px' }}>
                    {w.first_name} {w.last_name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}