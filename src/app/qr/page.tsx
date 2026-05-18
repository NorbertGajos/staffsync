'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'

export default function QRPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (profile && canvasRef.current && mounted) {
      async function generateQR() {
        const QRCode = (await import('qrcode')).default
        const qrData = JSON.stringify({
          userId: profile!.id,
          name: `${profile!.first_name} ${profile!.last_name}`,
          stanowisko: profile!.stanowisko,
        })
        QRCode.toCanvas(canvasRef.current!, qrData, {
          width: 280,
          margin: 2,
          color: { dark: '#064d61', light: '#ffffff' }
        })
      }
      generateQR()
    }
  }, [profile, mounted])

  if (!mounted || loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>
          ← Wróć
        </button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>📱 Mój QR kod</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Pokaż przy wejściu i wyjściu z pracy</div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'400px', margin:'0 auto' }}>

        <div style={{ background:'white', borderRadius:'24px', padding:'32px', boxShadow:'0 10px 40px rgba(0,0,0,0.15)', textAlign:'center', marginBottom:'16px' }}>
          <div style={{ marginBottom:'16px' }}>
            <div style={{ width:'60px', height:'60px', borderRadius:'16px', background:'linear-gradient(135deg,#0a6e8a,#1a9bb8)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'22px', margin:'0 auto 12px' }}>
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <h2 style={{ margin:'0 0 4px', color:'#064d61', fontSize:'20px', fontWeight:800 }}>
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p style={{ margin:0, color:'#6b8a95', fontSize:'14px' }}>{profile?.stanowisko || 'Brak stanowiska'}</p>
          </div>

          <div style={{ display:'inline-block', padding:'16px', background:'white', borderRadius:'16px', border:'3px solid #ddeaf0', marginBottom:'16px' }}>
            <canvas ref={canvasRef} style={{ display:'block', borderRadius:'8px' }} />
          </div>

          <div style={{ background:'#eef4fb', borderRadius:'12px', padding:'12px 16px' }}>
            <p style={{ margin:0, fontSize:'12px', color:'#0a6e8a', fontWeight:600 }}>
              🔒 Ten kod jest unikalny dla Ciebie
            </p>
            <p style={{ margin:'4px 0 0', fontSize:'11px', color:'#6b8a95' }}>
              Pokaż go przy wejściu i wyjściu z pracy
            </p>
          </div>
        </div>

        <div style={{ background:'white', borderRadius:'20px', padding:'20px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin:'0 0 14px', color:'#064d61', fontSize:'15px' }}>Jak to działa?</h3>
          {[
            { icon:'1️⃣', text:'Pokaż ten kod przy wejściu do pracy' },
            { icon:'2️⃣', text:'Skaner zapisze godzinę Twojego przyjścia' },
            { icon:'3️⃣', text:'Przy wyjściu pokaż kod ponownie' },
            { icon:'4️⃣', text:'System zapisze ile godzin przepracowałeś' },
          ].map((s,i) => (
            <div key={i} style={{ display:'flex', gap:'12px', alignItems:'flex-start', marginBottom:'10px' }}>
              <span style={{ fontSize:'18px', flexShrink:0 }}>{s.icon}</span>
              <span style={{ fontSize:'13px', color:'#1a2c35', lineHeight:1.5 }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}