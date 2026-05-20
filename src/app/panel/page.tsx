'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile, MONTHS } from '@/lib/types'

const PL_DAYS = ['Pn','Wt','Śr','Cz','Pt','So','Nd']
const MONTH_START_DAYS = [0, 2, 5]

function getDow(mi: number, day: number) {
  return (MONTH_START_DAYS[mi] + day - 1) % 7
}
function isWeekend(mi: number, day: number) {
  const d = getDow(mi, day); return d === 5 || d === 6
}

export default function PanelPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [monthIdx, setMonthIdx] = useState(0)
  const [availability, setAvailability] = useState<Record<number, any>>({})
  const [shifts, setShifts] = useState<Record<number, any>>({})
  const [attendance, setAttendance] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      await loadData(user.id, 0)
      setLoading(false)
    }
    load()
  }, [])

  async function loadData(userId: string, mi: number) {
    const m = MONTHS[mi]
    const from = `${m.year}-${String(m.month).padStart(2,'0')}-01`
    const to = `${m.year}-${String(m.month).padStart(2,'0')}-${String(m.days).padStart(2,'0')}`

    // Dostępność
    const { data: avail } = await supabase
      .from('availability').select('*')
      .eq('user_id', userId).gte('date', from).lte('date', to)
    const availMap: Record<number, any> = {}
    avail?.forEach(a => {
      const day = parseInt(a.date.split('-')[2])
      availMap[day] = a
    })
    setAvailability(availMap)

    // Zmiany w grafiku
    const { data: sh } = await supabase
      .from('shifts').select('*')
      .eq('user_id', userId).gte('date', from).lte('date', to)
    const shMap: Record<number, any> = {}
    sh?.forEach(s => {
      const day = parseInt(s.date.split('-')[2])
      shMap[day] = s
    })
    setShifts(shMap)

    // Obecność
    const { data: att } = await supabase
      .from('attendance').select('*')
      .eq('user_id', userId).gte('date', from).lte('date', to)
    const attMap: Record<number, any> = {}
    att?.forEach(a => {
      const day = parseInt(a.date.split('-')[2])
      attMap[day] = a
    })
    setAttendance(attMap)
  }

  async function switchMonth(mi: number) {
    setMonthIdx(mi)
    if (!profile) return
    setLoading(true)
    await loadData(profile.id, mi)
    setLoading(false)
  }

  const m = MONTHS[monthIdx]
  const shiftDays = Object.keys(shifts).length
  const availDays = Object.keys(availability).length
  const presentDays = Object.values(attendance).filter(a => a.status === 'obecny').length

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
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>👤 Mój panel</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>{profile?.first_name} {profile?.last_name} · {profile?.stanowisko}</div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'860px', margin:'0 auto' }}>

        {/* MONTH TABS */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          {MONTHS.map((mo,i) => (
            <button key={i} onClick={()=>switchMonth(i)} style={{ padding:'10px 20px', borderRadius:'100px', border:'1.5px solid rgba(255,255,255,0.3)', background: monthIdx===i?'white':'rgba(255,255,255,0.15)', color: monthIdx===i?'#064d61':'white', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
              {mo.label}
            </button>
          ))}
        </div>

        {/* STATYSTYKI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'16px' }}>
          {[
            { label:'Dni w grafiku', value: shiftDays, bg:'#0a6e8a', icon:'🗓' },
            { label:'Dni dostępności', value: availDays, bg:'#2d9e6b', icon:'📅' },
            { label:'Dni przepracowanych', value: presentDays, bg:'#f5a623', icon:'✅' },
          ].map((s,i) => (
            <div key={i} style={{ background:s.bg, borderRadius:'16px', padding:'16px', textAlign:'center', color:'white' }}>
              <div style={{ fontSize:'24px', marginBottom:'4px' }}>{s.icon}</div>
              <div style={{ fontWeight:800, fontSize:'28px', fontFamily:'Arial' }}>{s.value}</div>
              <div style={{ fontSize:'12px', opacity:0.85, marginTop:'2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* KALENDARZ */}
        <div style={{ background:'white', borderRadius:'22px', padding:'24px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin:'0 0 16px', color:'#064d61', fontSize:'17px' }}>{m.label}</h3>

          {/* LEGENDA */}
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'16px', fontSize:'12px' }}>
            <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <span style={{ width:14, height:14, borderRadius:3, background:'#0a6e8a', display:'inline-block' }}/> W grafiku
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <span style={{ width:14, height:14, borderRadius:3, background:'#d5f5e3', border:'1px solid #2d9e6b', display:'inline-block' }}/> Dostępny
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <span style={{ width:14, height:14, borderRadius:3, background:'#f5a623', display:'inline-block' }}/> Weekend dostępny
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <span style={{ width:14, height:14, borderRadius:3, background:'#d5f5e3', border:'2px solid #2d9e6b', display:'inline-block' }}/> ✅ Obecny
            </span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px', marginBottom:'8px' }}>
            {PL_DAYS.map((d,i) => (
              <div key={i} style={{ textAlign:'center', fontSize:'11px', fontWeight:700, color: i>=5?'#f5a623':'#6b8a95', padding:'6px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'6px' }}>
            {Array.from({ length: MONTH_START_DAYS[monthIdx] }, (_,i) => <div key={`e${i}`}/>)}
            {Array.from({ length: m.days }, (_,i) => i+1).map(day => {
              const we = isWeekend(monthIdx, day)
              const hasShift = !!shifts[day]
              const hasAvail = !!availability[day]
              const att = attendance[day]
              const isPresent = att?.status === 'obecny'
              const sh = shifts[day]

              let bg = we ? '#fff8ec' : '#fafcfd'
              let border = `2px solid ${we ? '#fdd68a' : '#ddeaf0'}`
              let textColor = we ? '#b87a00' : '#6b8a95'

              if (hasShift) { bg = '#0a6e8a'; border = 'none'; textColor = 'white' }
              else if (hasAvail && we) { bg = '#fdd68a'; border = 'none'; textColor = '#7a5c00' }
              else if (hasAvail) { bg = '#eef4fb'; border = '2px solid #1a9bb8'; textColor = '#0a6e8a' }
              if (isPresent) { bg = '#2d9e6b'; border = 'none'; textColor = 'white' }

              return (
                <div key={day} style={{
                  aspectRatio:'1', borderRadius:'10px', border,
                  background: bg, padding:'4px 2px',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
                  position:'relative'
                }}>
                  <span style={{ fontWeight:700, fontSize:'13px', color:textColor, lineHeight:1 }}>{day}</span>
                  <span style={{ fontSize:'7px', color: textColor==='white'?'rgba(255,255,255,0.8)':textColor }}>
                    {PL_DAYS[getDow(monthIdx,day)]}
                  </span>
                  {hasShift && sh && (
                    <span style={{ fontSize:'6px', color:'rgba(255,255,255,0.9)', fontWeight:600, lineHeight:1 }}>
                      {sh.start_time?.slice(0,5)}
                    </span>
                  )}
                  {isPresent && (
                    <span style={{ position:'absolute', top:2, right:2, fontSize:'8px' }}>✓</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* NAJBLIŻSZE ZMIANY */}
        {Object.keys(shifts).length > 0 && (
          <div style={{ background:'white', borderRadius:'22px', padding:'24px', marginTop:'16px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin:'0 0 16px', color:'#064d61', fontSize:'17px' }}>🗓 Moje zmiany – {m.label}</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {Object.entries(shifts).sort((a,b) => Number(a[0])-Number(b[0])).map(([day, sh]) => {
                const att = attendance[Number(day)]
                const dow = getDow(monthIdx, Number(day))
                const we = dow >= 5
                return (
                  <div key={day} style={{ background:'#fafcfd', borderRadius:'12px', padding:'14px 16px', border:`2px solid ${we?'#fdd68a':'#ddeaf0'}`, display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'10px', background: we?'#f5a623':'#0a6e8a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', flexShrink:0 }}>
                      <span style={{ fontWeight:800, fontSize:'16px', lineHeight:1 }}>{day}</span>
                      <span style={{ fontSize:'9px', opacity:0.85 }}>{PL_DAYS[dow]}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:'14px', color:'#064d61' }}>{sh.stanowisko}</div>
                      <div style={{ fontSize:'13px', color:'#0a6e8a' }}>🕐 {sh.start_time?.slice(0,5)} – {sh.end_time?.slice(0,5)}</div>
                    </div>
                    {att && (
                      <div style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
                        background: att.status==='obecny'?'#d5f5e3':att.status==='nieobecny'?'#fff0ee':'#fdd68a',
                        color: att.status==='obecny'?'#1a5e3a':att.status==='nieobecny'?'#c0392b':'#7a5c00'
                      }}>
                        {att.status}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SZYBKIE AKCJE */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'16px' }}>
          <button onClick={()=>router.push('/availability')} style={{ background:'white', border:'2px solid #ddeaf0', borderRadius:'16px', padding:'20px', cursor:'pointer', textAlign:'left' as const }}>
            <div style={{ fontSize:'24px', marginBottom:'8px' }}>📅</div>
            <div style={{ fontWeight:700, fontSize:'14px', color:'#064d61' }}>Moja dostępność</div>
            <div style={{ fontSize:'12px', color:'#6b8a95', marginTop:'4px' }}>Zaktualizuj kiedy możesz pracować</div>
          </button>
          <button onClick={()=>router.push('/feedback')} style={{ background:'white', border:'2px solid #ddeaf0', borderRadius:'16px', padding:'20px', cursor:'pointer', textAlign:'left' as const }}>
            <div style={{ fontSize:'24px', marginBottom:'8px' }}>💬</div>
            <div style={{ fontWeight:700, fontSize:'14px', color:'#064d61' }}>Uwagi i żale</div>
            <div style={{ fontSize:'12px', color:'#6b8a95', marginTop:'4px' }}>Napisz do managera</div>
          </button>
          <button onClick={()=>router.push('/change-password')} style={{ background:'white', border:'2px solid #ddeaf0', borderRadius:'16px', padding:'20px', cursor:'pointer', textAlign:'left' as const, gridColumn:'1 / -1' }}>
            <div style={{ fontSize:'24px', marginBottom:'8px' }}>🔑</div>
            <div style={{ fontWeight:700, fontSize:'14px', color:'#064d61' }}>Zmień hasło</div>
            <div style={{ fontSize:'12px', color:'#6b8a95', marginTop:'4px' }}>Zaktualizuj swoje hasło dostępu</div>
          </button>
        </div>
      </div>
    </div>
  )
}