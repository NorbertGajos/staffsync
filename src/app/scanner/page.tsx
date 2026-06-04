'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type ScanResult = {
  name: string
  stanowisko: string
  action: 'checkin' | 'checkout'
  time: string
}

type ScannedWorker = {
  userId: string
  name: string
  stanowisko: string
}

type SubstitutionReason = 'zastepstwo' | 'prosba_koordynatora' | 'nadgodziny' | 'inne'

export default function ScannerPage() {
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scanning, setScanning] = useState(false)

  // System zastępstw
  const [showSubModal, setShowSubModal] = useState(false)
  const [scannedWorker, setScannedWorker] = useState<ScannedWorker | null>(null)
  const [subReason, setSubReason] = useState<SubstitutionReason | null>(null)
  const [workers, setWorkers] = useState<any[]>([])
  const [absentWorkerId, setAbsentWorkerId] = useState('')
  const [savingSub, setSavingSub] = useState(false)

  const scannerRef = useRef<any>(null)
  const processingRef = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    loadWorkers()
    return () => {
      try { if (scannerRef.current) scannerRef.current.clear() } catch {}
    }
  }, [])

  async function loadWorkers() {
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, stanowisko').eq('status', 'aktywny').order('last_name')
    setWorkers(data || [])
  }

  async function startScanner() {
    setError('')
    setScanning(true)
    await new Promise(r => setTimeout(r, 300))
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 300, height: 300 }, aspectRatio: 1.333 },
        async (decodedText) => {
          if (processingRef.current) return
          processingRef.current = true
          setProcessing(true)
          try {
            const data = JSON.parse(decodedText)
            if (!data.userId) {
              setError('Nieprawidłowy QR kod')
              processingRef.current = false
              setProcessing(false)
              return
            }
            await handleScan(data)
          } catch {
            setError('Nieprawidłowy QR kod')
          }
          setTimeout(() => {
            processingRef.current = false
            setProcessing(false)
          }, 10000)
        },
        undefined
      )
    } catch (e: any) {
      setError('Błąd kamery: ' + (e?.message || 'Sprawdź uprawnienia'))
      setScanning(false)
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {}
    setScanning(false)
  }

  async function handleScan(data: { userId: string, name: string, stanowisko: string }) {
    const today = new Date()
    const date = today.toISOString().split('T')[0]
    const time = today.toTimeString().slice(0, 5)

    // Sprawdź czy pracownik ma zmianę dzisiaj
    const { data: shift } = await supabase
      .from('shifts').select('*')
      .eq('user_id', data.userId).eq('date', date).single()

    const { data: existing } = await supabase
      .from('attendance').select('*')
      .eq('user_id', data.userId).eq('date', date).single()

    if (!shift) {
      // Brak zmiany – pokaż modal zastępstwa
      setScannedWorker(data)
      setShowSubModal(true)
      setSubReason(null)
      setAbsentWorkerId('')
      setTimeout(() => {
        processingRef.current = false
        setProcessing(false)
      }, 1000)
      return
    }

    // Ma zmianę – normalne skanowanie
    if (!existing) {
      await supabase.from('attendance').insert({
        user_id: data.userId, date, actual_start: time, status: 'obecny', shift_id: shift?.id || null,
      })
      setLastScan({ name: data.name, stanowisko: data.stanowisko, action: 'checkin', time })
    } else if (!existing.actual_end) {
      await supabase.from('attendance').update({ actual_end: time }).eq('id', existing.id)
      setLastScan({ name: data.name, stanowisko: data.stanowisko, action: 'checkout', time })
    } else {
      await supabase.from('attendance').update({ actual_start: time, actual_end: null, status: 'obecny' }).eq('id', existing.id)
      setLastScan({ name: data.name, stanowisko: data.stanowisko, action: 'checkin', time })
    }

    setTimeout(() => setLastScan(null), 10000)
  }

  async function handleSubstitution() {
    if (!scannedWorker || !subReason) return
    setSavingSub(true)

    const today = new Date()
    const date = today.toISOString().split('T')[0]
    const time = today.toTimeString().slice(0, 5)

    if (subReason === 'zastepstwo' && absentWorkerId) {
      // Pobierz zmianę nieobecnego
      const { data: absentShift } = await supabase
        .from('shifts').select('*')
        .eq('user_id', absentWorkerId).eq('date', date).single()

      if (absentShift) {
        // Oznacz nieobecnego jako nieobecny
        await supabase.from('attendance').upsert({
          user_id: absentWorkerId,
          date,
          shift_id: absentShift.id,
          status: 'nieobecny',
          planned_start: absentShift.start_time,
          planned_end: absentShift.end_time,
        }, { onConflict: 'user_id,date' })

        // Dodaj zmianę zastępcy (skopiuj zmianę nieobecnego)
        const { data: newShift } = await supabase.from('shifts').insert({
          user_id: scannedWorker.userId,
          date,
          start_time: absentShift.start_time,
          end_time: absentShift.end_time,
          stanowisko: absentShift.stanowisko,
          status: 'planned',
          schedule_id: absentShift.schedule_id,
        }).select().single()

        // Zapisz obecność zastępcy
        await supabase.from('attendance').insert({
          user_id: scannedWorker.userId,
          date,
          shift_id: newShift?.id || null,
          actual_start: time,
          status: 'zastepstwo',
        })

        // Zapisz zastępstwo
        await supabase.from('substitutions').insert({
          date,
          substitute_user_id: scannedWorker.userId,
          original_user_id: absentWorkerId,
          shift_id: absentShift.id,
          reason: 'zastepstwo',
          status: 'approved',
        })
      }
    } else {
      // Inne powody – po prostu zapisz obecność
      await supabase.from('attendance').insert({
        user_id: scannedWorker.userId,
        date,
        actual_start: time,
        status: subReason === 'zastepstwo' ? 'zastepstwo' : 'obecny',
      })

      await supabase.from('substitutions').insert({
        date,
        substitute_user_id: scannedWorker.userId,
        original_user_id: absentWorkerId || null,
        reason: subReason,
        status: 'approved',
      })
    }

    setSavingSub(false)
    setShowSubModal(false)
    setLastScan({ name: scannedWorker.name, stanowisko: scannedWorker.stanowisko, action: 'checkin', time })
    setTimeout(() => setLastScan(null), 10000)
  }

  if (!mounted) return null

  const REASONS = [
    { key: 'zastepstwo', icon: '🔄', label: 'Zastępstwo', desc: 'Przychodzę za innego pracownika' },
    { key: 'prosba_koordynatora', icon: '📋', label: 'Prośba koordynatora', desc: 'Koordynator poprosił o przyjście' },
    { key: 'nadgodziny', icon: '⏰', label: 'Nadgodziny', desc: 'Dodatkowe godziny pracy' },
    { key: 'inne', icon: '💬', label: 'Inne', desc: 'Inny powód nieplanowanej zmiany' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#064d61', fontFamily:'Arial', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>

      <h1 style={{ color:'white', fontSize:'28px', fontWeight:800, marginBottom:'8px', textAlign:'center' }}>
        🏖 Summer Playground
      </h1>
      <p style={{ color:'#7dd3e8', fontSize:'16px', marginBottom:'32px', textAlign:'center' }}>
        Skaner obecności
      </p>

      {/* MODAL ZASTĘPSTWA */}
      {showSubModal && scannedWorker && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:'white', borderRadius:'24px', padding:'28px', maxWidth:'420px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'48px', marginBottom:'8px' }}>⚠️</div>
              <h2 style={{ margin:'0 0 4px', color:'#064d61', fontSize:'20px', fontWeight:800 }}>
                Nie ma Cię w grafiku!
              </h2>
              <p style={{ margin:0, color:'#6b8a95', fontSize:'14px' }}>
                {scannedWorker.name} · {scannedWorker.stanowisko}
              </p>
            </div>

            <p style={{ fontSize:'14px', fontWeight:700, color:'#064d61', marginBottom:'12px' }}>
              Dlaczego przychodzisz dzisiaj?
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
              {REASONS.map(r => (
                <button key={r.key} onClick={() => setSubReason(r.key as SubstitutionReason)}
                  style={{
                    padding:'12px 16px', borderRadius:'12px', border:`2px solid ${subReason === r.key ? '#0a6e8a' : '#ddeaf0'}`,
                    background: subReason === r.key ? '#eef4fb' : 'white',
                    cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:'12px'
                  }}>
                  <span style={{ fontSize:'24px' }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'14px', color:'#064d61' }}>{r.label}</div>
                    <div style={{ fontSize:'12px', color:'#6b8a95' }}>{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {subReason === 'zastepstwo' && (
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'#064d61', marginBottom:'8px' }}>
                  Za kogo przychodzisz?
                </label>
                <select
                  value={absentWorkerId}
                  onChange={e => setAbsentWorkerId(e.target.value)}
                  style={{ width:'100%', padding:'10px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none' }}
                >
                  <option value=''>— wybierz pracownika —</option>
                  {workers.filter(w => w.id !== scannedWorker.userId).map(w => (
                    <option key={w.id} value={w.id}>{w.first_name} {w.last_name} · {w.stanowisko || '—'}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display:'flex', gap:'8px' }}>
              <button
                onClick={handleSubstitution}
                disabled={!subReason || (subReason === 'zastepstwo' && !absentWorkerId) || savingSub}
                style={{
                  flex:1, padding:'14px', background: (!subReason || (subReason === 'zastepstwo' && !absentWorkerId)) ? '#ccc' : '#0a6e8a',
                  color:'white', border:'none', borderRadius:'100px', cursor: (!subReason || (subReason === 'zastepstwo' && !absentWorkerId)) ? 'not-allowed' : 'pointer',
                  fontSize:'14px', fontWeight:600
                }}
              >
                {savingSub ? 'Zapisuję...' : '✅ Potwierdź wejście'}
              </button>
              <button
                onClick={() => { setShowSubModal(false); processingRef.current = false; setProcessing(false) }}
                style={{ padding:'14px 18px', background:'#fff0ee', color:'#e8604c', border:'none', borderRadius:'100px', cursor:'pointer', fontSize:'14px', fontWeight:600 }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {lastScan && (
        <div style={{
          background: lastScan.action === 'checkin' ? '#d5f5e3' : '#fff8ec',
          border: `3px solid ${lastScan.action === 'checkin' ? '#2d9e6b' : '#f5a623'}`,
          borderRadius:'20px', padding:'24px 32px', marginBottom:'24px',
          textAlign:'center', maxWidth:'360px', width:'100%'
        }}>
          <div style={{ fontSize:'48px', marginBottom:'8px' }}>
            {lastScan.action === 'checkin' ? '✅' : '👋'}
          </div>
          <h2 style={{ margin:'0 0 4px', color:'#064d61', fontSize:'22px', fontWeight:800 }}>
            {lastScan.name}
          </h2>
          <p style={{ margin:'0 0 8px', color:'#6b8a95', fontSize:'14px' }}>
            {lastScan.stanowisko}
          </p>
          <div style={{
            background: lastScan.action === 'checkin' ? '#2d9e6b' : '#f5a623',
            color:'white', padding:'8px 20px', borderRadius:'100px',
            fontSize:'16px', fontWeight:700, display:'inline-block'
          }}>
            {lastScan.action === 'checkin' ? `🕐 Przyjście: ${lastScan.time}` : `🕐 Wyjście: ${lastScan.time}`}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background:'#fff0ee', border:'2px solid #e8604c', borderRadius:'14px', padding:'14px 20px', marginBottom:'16px', color:'#e8604c', fontSize:'14px', fontWeight:600, maxWidth:'400px', width:'100%', textAlign:'center' }}>
          ❌ {error}
        </div>
      )}

      <div style={{ background:'white', borderRadius:'24px', padding:'24px', maxWidth:'400px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        {!scanning ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'64px', marginBottom:'16px' }}>📷</div>
            <h3 style={{ margin:'0 0 8px', color:'#064d61', fontSize:'18px' }}>Gotowy do skanowania</h3>
            <p style={{ margin:'0 0 20px', color:'#6b8a95', fontSize:'13px' }}>
              Kliknij aby uruchomić kamerę i skanować QR kody pracowników
            </p>
            <button onClick={startScanner}
              style={{ background:'#0a6e8a', color:'white', border:'none', padding:'14px 32px', borderRadius:'100px', cursor:'pointer', fontSize:'15px', fontWeight:600, width:'100%' }}>
              📷 Uruchom skaner
            </button>
          </div>
        ) : (
          <div>
            <div id="qr-reader" style={{ width:'100%', borderRadius:'12px', overflow:'hidden' }} />
            <button onClick={stopScanner}
              style={{ background:'#fff0ee', color:'#e8604c', border:'none', padding:'12px 24px', borderRadius:'100px', cursor:'pointer', fontSize:'14px', fontWeight:600, width:'100%', marginTop:'12px' }}>
              ✕ Zatrzymaj skaner
            </button>
          </div>
        )}
      </div>

      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'12px', marginTop:'20px', textAlign:'center' }}>
        Pierwsze skanowanie = przyjście · Drugie skanowanie = wyjście
      </p>
    </div>
  )
}