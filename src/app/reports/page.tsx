'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile, MONTHS } from '@/lib/types'

export default function ReportsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workers, setWorkers] = useState<Profile[]>([])
  const [monthIdx, setMonthIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<any[]>([])
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
      await loadReport(0, w || [])
      setLoading(false)
    }
    load()
  }, [])

  async function loadReport(mi: number, w: Profile[]) {
    const m = MONTHS[mi]
    const from = `${m.year}-${String(m.month).padStart(2,'0')}-01`
    const to = `${m.year}-${String(m.month).padStart(2,'0')}-${String(m.days).padStart(2,'0')}`

    const { data: attendance } = await supabase
      .from('attendance').select('*').gte('date', from).lte('date', to)

    const { data: shifts } = await supabase
      .from('shifts').select('*').gte('date', from).lte('date', to)

    const { data: availability } = await supabase
      .from('availability').select('*').gte('date', from).lte('date', to)

    const reportData = w.map(worker => {
      const workerAtt = attendance?.filter(a => a.user_id === worker.id) || []
      const workerShifts = shifts?.filter(s => s.user_id === worker.id) || []
      const workerAvail = availability?.filter(a => a.user_id === worker.id) || []

      const obecne = workerAtt.filter(a => a.status === 'obecny').length
      const spoznienia = workerAtt.filter(a => a.status === 'spoznienie').length
      const nieobecne = workerAtt.filter(a => a.status === 'nieobecny').length
      const urlopy = workerAtt.filter(a => a.status === 'urlop').length
      const chorobowe = workerAtt.filter(a => a.status === 'chorobowe').length

      // Oblicz godziny z grafiku
      const hoursScheduled = workerShifts.reduce((sum, s) => {
        if (!s.start_time || !s.end_time) return sum
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        return sum + (eh * 60 + em - sh * 60 - sm) / 60
      }, 0)

      // Oblicz rzeczywiste godziny z attendance
      const hoursWorked = workerAtt.reduce((sum, a) => {
        if (!a.actual_start || !a.actual_end) return sum
        const [sh, sm] = a.actual_start.split(':').map(Number)
        const [eh, em] = a.actual_end.split(':').map(Number)
        return sum + (eh * 60 + em - sh * 60 - sm) / 60
      }, 0)

      return {
        worker,
        obecne,
        spoznienia,
        nieobecne,
        urlopy,
        chorobowe,
        dniWGrafiku: workerShifts.length,
        dniDostepnosci: workerAvail.length,
        hoursScheduled: Math.round(hoursScheduled * 10) / 10,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
      }
    })

    setReport(reportData)
  }

  async function switchMonth(mi: number) {
    setMonthIdx(mi)
    setLoading(true)
    await loadReport(mi, workers)
    setLoading(false)
  }

  const m = MONTHS[monthIdx]
  const totalHoursScheduled = report.reduce((s, r) => s + r.hoursScheduled, 0)
  const totalHoursWorked = report.reduce((s, r) => s + r.hoursWorked, 0)
  const totalObecne = report.reduce((s, r) => s + r.obecne, 0)

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
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>📊 Raporty – {m.label}</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Podsumowanie miesięczne</div>
        </div>
        <div style={{ marginLeft:'auto' }}>
          <button
            onClick={() => window.print()}
            style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}
          >
            🖨️ Drukuj / PDF
          </button>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'1000px', margin:'0 auto' }}>

        {/* MONTH TABS */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          {MONTHS.map((mo,i) => (
            <button key={i} onClick={()=>switchMonth(i)} style={{ padding:'10px 20px', borderRadius:'100px', border:'1.5px solid rgba(255,255,255,0.3)', background: monthIdx===i?'white':'rgba(255,255,255,0.15)', color: monthIdx===i?'#064d61':'white', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
              {mo.label}
            </button>
          ))}
        </div>

        {/* STATYSTYKI OGÓLNE */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'16px' }}>
          {[
            { label:'Pracownicy w raporcie', value: report.length, icon:'👥', bg:'#0a6e8a' },
            { label:'Łączne godziny w grafiku', value: `${totalHoursScheduled}h`, icon:'🗓', bg:'#2d9e6b' },
            { label:'Łączne przepracowane', value: `${totalHoursWorked}h`, icon:'✅', bg:'#f5a623' },
          ].map((s,i) => (
            <div key={i} style={{ background:s.bg, borderRadius:'16px', padding:'16px', color:'white', textAlign:'center' }}>
              <div style={{ fontSize:'24px', marginBottom:'4px' }}>{s.icon}</div>
              <div style={{ fontWeight:800, fontSize:'24px' }}>{s.value}</div>
              <div style={{ fontSize:'12px', opacity:0.85, marginTop:'2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABELA RAPORTU */}
        <div style={{ background:'white', borderRadius:'22px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)', overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'700px' }}>
            <thead>
              <tr style={{ background:'#064d61' }}>
                <th style={{ padding:'12px 16px', color:'white', textAlign:'left', fontSize:'12px', fontWeight:600 }}>Pracownik</th>
                <th style={{ padding:'12px 8px', color:'white', textAlign:'center', fontSize:'12px', fontWeight:600 }}>Dni w grafiku</th>
                <th style={{ padding:'12px 8px', color:'white', textAlign:'center', fontSize:'12px', fontWeight:600 }}>Godziny graf.</th>
                <th style={{ padding:'12px 8px', color:'white', textAlign:'center', fontSize:'12px', fontWeight:600 }}>Godziny rzecz.</th>
                <th style={{ padding:'12px 8px', color:'white', textAlign:'center', fontSize:'12px', fontWeight:600 }}>✅ Obecny</th>
                <th style={{ padding:'12px 8px', color:'white', textAlign:'center', fontSize:'12px', fontWeight:600 }}>🟡 Spóź.</th>
                <th style={{ padding:'12px 8px', color:'white', textAlign:'center', fontSize:'12px', fontWeight:600 }}>❌ Nieob.</th>
                <th style={{ padding:'12px 8px', color:'white', textAlign:'center', fontSize:'12px', fontWeight:600 }}>⚪ Urlop</th>
                <th style={{ padding:'12px 8px', color:'white', textAlign:'center', fontSize:'12px', fontWeight:600 }}>🟣 Chorob.</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r, i) => (
                <tr key={r.worker.id} style={{ background: i%2===0?'white':'#fafcfd', borderBottom:'1px solid #f0f4f8' }}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ fontWeight:600, fontSize:'14px', color:'#064d61' }}>{r.worker.first_name} {r.worker.last_name}</div>
                    <div style={{ fontSize:'11px', color:'#6b8a95' }}>{r.worker.stanowisko || '—'}</div>
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center', fontSize:'14px', color:'#1a2c35', fontWeight:600 }}>{r.dniWGrafiku}</td>
                  <td style={{ padding:'12px 8px', textAlign:'center', fontSize:'14px', color:'#0a6e8a', fontWeight:600 }}>{r.hoursScheduled}h</td>
                  <td style={{ padding:'12px 8px', textAlign:'center', fontSize:'14px', fontWeight:700, color: r.hoursWorked >= r.hoursScheduled ? '#2d9e6b' : '#e8604c' }}>
                    {r.hoursWorked}h
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center' }}>
                    <span style={{ background:'#d5f5e3', color:'#1a5e3a', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{r.obecne}</span>
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center' }}>
                    {r.spoznienia > 0 && <span style={{ background:'#fdd68a', color:'#7a5c00', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{r.spoznienia}</span>}
                    {r.spoznienia === 0 && <span style={{ color:'#ccc' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center' }}>
                    {r.nieobecne > 0 && <span style={{ background:'#fff0ee', color:'#e8604c', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{r.nieobecne}</span>}
                    {r.nieobecne === 0 && <span style={{ color:'#ccc' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center' }}>
                    {r.urlopy > 0 && <span style={{ background:'#f0f0f0', color:'#444', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{r.urlopy}</span>}
                    {r.urlopy === 0 && <span style={{ color:'#ccc' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center' }}>
                    {r.chorobowe > 0 && <span style={{ background:'#ede7f6', color:'#5b2d8e', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{r.chorobowe}</span>}
                    {r.chorobowe === 0 && <span style={{ color:'#ccc' }}>—</span>}
                  </td>
                </tr>
              ))}
              {/* PODSUMOWANIE */}
              <tr style={{ background:'#eef4fb', borderTop:'2px solid #ddeaf0' }}>
                <td style={{ padding:'12px 16px', fontWeight:700, color:'#064d61', fontSize:'13px' }}>SUMA</td>
                <td style={{ padding:'12px 8px', textAlign:'center', fontWeight:700, color:'#064d61' }}>
                  {report.reduce((s,r) => s+r.dniWGrafiku, 0)}
                </td>
                <td style={{ padding:'12px 8px', textAlign:'center', fontWeight:700, color:'#0a6e8a' }}>
                  {totalHoursScheduled}h
                </td>
                <td style={{ padding:'12px 8px', textAlign:'center', fontWeight:700, color:'#2d9e6b' }}>
                  {totalHoursWorked}h
                </td>
                <td style={{ padding:'12px 8px', textAlign:'center', fontWeight:700, color:'#1a5e3a' }}>{totalObecne}</td>
                <td style={{ padding:'12px 8px', textAlign:'center', fontWeight:700 }}>{report.reduce((s,r) => s+r.spoznienia, 0)}</td>
                <td style={{ padding:'12px 8px', textAlign:'center', fontWeight:700, color:'#e8604c' }}>{report.reduce((s,r) => s+r.nieobecne, 0)}</td>
                <td style={{ padding:'12px 8px', textAlign:'center', fontWeight:700 }}>{report.reduce((s,r) => s+r.urlopy, 0)}</td>
                <td style={{ padding:'12px 8px', textAlign:'center', fontWeight:700 }}>{report.reduce((s,r) => s+r.chorobowe, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DOSTĘPNOŚĆ vs GRAFIK */}
        <div style={{ background:'white', borderRadius:'22px', padding:'24px', marginTop:'16px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin:'0 0 16px', color:'#064d61', fontSize:'16px' }}>📅 Dostępność vs Grafik</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {report.map(r => {
              const pct = r.dniDostepnosci > 0 ? Math.round(r.dniWGrafiku / r.dniDostepnosci * 100) : 0
              return (
                <div key={r.worker.id} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'160px', fontSize:'13px', color:'#064d61', fontWeight:600, flexShrink:0 }}>
                    {r.worker.first_name} {r.worker.last_name}
                  </div>
                  <div style={{ flex:1, background:'#f0f4f8', borderRadius:'100px', height:'20px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background: pct>80?'#2d9e6b':pct>50?'#f5a623':'#0a6e8a', borderRadius:'100px', transition:'width 0.3s' }}/>
                  </div>
                  <div style={{ width:'80px', fontSize:'12px', color:'#6b8a95', textAlign:'right' as const }}>
                    {r.dniWGrafiku}/{r.dniDostepnosci} dni ({pct}%)
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