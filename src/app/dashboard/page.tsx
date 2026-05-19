'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied' | 'loading'>('unknown')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    loadProfile()

    // Sprawdź status powiadomień
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifStatus(Notification.permission as any)
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function enableNotifications() {
    if (!profile) return
    setNotifStatus('loading')
    try {
      const { requestNotificationPermission } = await import('@/lib/firebase')
      const token = await requestNotificationPermission(profile.id)
      if (token) {
        setNotifStatus('granted')
      } else {
        setNotifStatus('denied')
      }
    } catch (e) {
      setNotifStatus('denied')
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial, sans-serif' }}>

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 10px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <span style={{ fontSize:'28px' }}>🏖</span>
          <div>
            <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>StaffSync</div>
            <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Summer Playground 2026</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'white', fontWeight:600, fontSize:'14px' }}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{ color:'#f5a623', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{profile?.role}</div>
          </div>
          <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>
            Wyloguj
          </button>
        </div>
      </div>

      <div style={{ padding:'32px 24px', maxWidth:'900px', margin:'0 auto' }}>

        <div style={{ background:'white', borderRadius:'22px', padding:'28px', marginBottom:'20px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color:'#064d61', margin:'0 0 8px', fontSize:'22px' }}>Witaj, {profile?.first_name}! 👋</h2>
          <p style={{ color:'#6b8a95', margin:'0 0 16px', fontSize:'14px' }}>
            Rola: <strong style={{ color:'#0a6e8a' }}>{profile?.role}</strong>
            {profile?.stanowisko && ` · Stanowisko: `}
            {profile?.stanowisko && <strong style={{ color:'#0a6e8a' }}>{profile.stanowisko}</strong>}
          </p>

          {/* POWIADOMIENIA */}
          {notifStatus === 'unknown' && (
            <button onClick={enableNotifications} style={{ background:'#0a6e8a', color:'white', border:'none', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
              🔔 Włącz powiadomienia
            </button>
          )}
          {notifStatus === 'loading' && (
            <div style={{ fontSize:'13px', color:'#6b8a95' }}>⏳ Włączanie powiadomień...</div>
          )}
          {notifStatus === 'granted' && (
            <div style={{ fontSize:'13px', color:'#2d9e6b', fontWeight:600 }}>✅ Powiadomienia włączone</div>
          )}
          {notifStatus === 'denied' && (
            <div style={{ fontSize:'13px', color:'#e8604c' }}>❌ Powiadomienia zablokowane – zezwól w ustawieniach przeglądarki</div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px' }}>
          {[
            { icon:'📅', title:'Moja dostępność', desc:'Wpisz kiedy możesz pracować', href:'/availability', roles:['pracownik','koordynator','administrator'] },
            { icon:'🗓', title:'Grafik', desc:'Podgląd grafiku pracy', href:'/schedule', roles:['pracownik','koordynator','administrator'] },
            { icon:'✅', title:'Lista obecności', desc:'Potwierdzanie i korekty', href:'/attendance', roles:['koordynator','administrator'] },
            { icon:'👤', title:'Mój panel', desc:'Twój grafik i statystyki', href:'/panel', roles:['pracownik','koordynator','administrator'] },
            { icon:'👥', title:'Pracownicy', desc:'Zarządzanie zespołem', href:'/admin/workers', roles:['administrator'] },
            { icon:'🏷', title:'Stanowiska', desc:'Zarządzaj stanowiskami', href:'/admin/stanowiska', roles:['administrator'] },
            { icon:'⚙️', title:'Ustawienia grafiku', desc:'Limity i konfiguracja', href:'/admin/settings', roles:['administrator','koordynator'] },
            { icon:'📊', title:'Raporty', desc:'Podsumowania miesięczne', href:'/reports', roles:['administrator','koordynator'] },
            { icon:'💬', title:'Uwagi i żale', desc:'Skrzynka sugestii', href:'/feedback', roles:['pracownik','koordynator','administrator'] },
            { icon:'📱', title:'Mój QR kod', desc:'Pokaż przy wejściu do pracy', href:'/qr', roles:['pracownik','koordynator','administrator'] },
            { icon:'📷', title:'Skaner QR', desc:'Skanuj obecność pracowników', href:'/scanner', roles:['administrator','koordynator'] },
          ]
            .filter(item => item.roles.includes(profile?.role || ''))
            .map((item, i) => (
              <div key={i} onClick={() => router.push(item.href)}
                style={{ background:'white', borderRadius:'18px', padding:'24px 20px', cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,0.08)', transition:'all 0.2s', border:'2px solid transparent' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = '#0a6e8a')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>{item.icon}</div>
                <div style={{ fontWeight:700, fontSize:'15px', color:'#064d61', marginBottom:'6px' }}>{item.title}</div>
                <div style={{ fontSize:'12px', color:'#6b8a95' }}>{item.desc}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}