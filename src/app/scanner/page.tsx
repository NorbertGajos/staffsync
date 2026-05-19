'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type ScanResult = {
  name: string
  stanowisko: string
  action: 'checkin' | 'checkout'
  time: string
}

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const scannerRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    return () => {
      stopScanner()
    }
  }, [])

  async function startScanner() {
    setError('')

    // Najpierw poproś o uprawnienia do kamery
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      stream.getTracks().forEach(t => t.stop())
    } catch (e) {
      setError('Brak dostępu do kamery. Zezwól na użycie kamery w ustawieniach.')
      return
    }

    setScanning(true)
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          useBarCodeDetectorIfSupported: true,
          rememberLastUsedCamera: true,
          videoConstraints: {
            facingMode: { ideal: 'environment' }
          }
        },
        false
      )
      scannerRef.current.render(
        async (decodedText: string) => {
          if (processing) return
          setProcessing(true)
          try {
            const data = JSON.parse(decodedText)
            if (!data.userId) {
              setError('Nieprawidłowy QR kod')
              setProcessing(false)
              return
            }
            await handleScan(data)
          } catch {
            setError('Nieprawidłowy QR kod')
          }
          setProcessing(false)
        },
        (_err: any) => {}
      )
    } catch (e) {
      setError('Błąd uruchamiania skanera. Spróbuj odświeżyć stronę.')
      setScanning(false)
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch (e) {
      scannerRef.current = null
    }
    setScanning(false)
  }

  async function handleScan(data: { userId: string, name: string, stanowisko: string }) {
    const today = new Date()
    const date = today.toISOString().split('T')[0]
    const time = today.toTimeString().slice(0, 5)

    const { data: existing } = await supabase
      .from('attendance').select('*')
      .eq('user_id', data.userId).eq('date', date).single()

    if (!existing) {
      await supabase.from('attendance').insert({
        user_id: data.userId, date, actual_start: time, status: 'obecny',
      })
      setLastScan({ name: data.name, stanowisko: data.stanowisko, action: 'checkin', time })
    } else if (!existing.actual_end) {
      await supabase.from('attendance').update({ actual_end: time }).eq('id', existing.id)
      setLastScan({ name: data.name, stanowisko: data.stanowisko, action: 'checkout', time })
    } else {
      await supabase.from('attendance').update({ actual_start: time, actual_end: null, status: 'obecny' }).eq('id', existing.id)
      setLastScan({ name: data.name, stanowisko: data.stanowisko, action: 'checkin', time })
    }

    setTimeout(() => setLastScan(null), 5000)
  }

  if (!mounted) return null

  return (
    <div style={{ minHeight:'100vh', background:'#064d61', fontFamily:'Arial', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>

      <h1 style={{ color:'white', fontSize:'28px', fontWeight:800, marginBottom:'8px', textAlign:'center' }}>
        🏖 Summer Playground
      </h1>
      <p style={{ color:'#7dd3e8', fontSize:'16px', marginBottom:'32px', textAlign:'center' }}>
        Skaner obecności
      </p>

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
            <p style={{ margin:'0 0 8px', color:'#6b8a95', fontSize:'13px' }}>
              Kliknij aby uruchomić kamerę tylną i skanować QR kody
            </p>
            <p style={{ margin:'0 0 20px', color:'#f5a623', fontSize:'12px', fontWeight:600 }}>
              ⚠️ Na iPhone: użyj Safari i zezwól na dostęp do kamery
            </p>
            <button
              onClick={startScanner}
              style={{ background:'#0a6e8a', color:'white', border:'none', padding:'14px 32px', borderRadius:'100px', cursor:'pointer', fontSize:'15px', fontWeight:600, width:'100%' }}
            >
              📷 Uruchom skaner
            </button>
          </div>
        ) : (
          <div>
            <div id="qr-reader" style={{ width:'100%' }} />
            <button
              onClick={stopScanner}
              style={{ background:'#fff0ee', color:'#e8604c', border:'none', padding:'12px 24px', borderRadius:'100px', cursor:'pointer', fontSize:'14px', fontWeight:600, width:'100%', marginTop:'12px' }}
            >
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