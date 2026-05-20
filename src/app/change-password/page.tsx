'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setError('')

    if (newPass.length < 6) {
      setError('Nowe hasło musi mieć minimum 6 znaków')
      return
    }
    if (newPass !== confirm) {
      setError('Hasła nie są identyczne')
      return
    }

    setLoading(true)

    // Najpierw sprawdź czy obecne hasło jest poprawne
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setError('Błąd autoryzacji'); setLoading(false); return }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current
    })

    if (signInError) {
      setError('Obecne hasło jest nieprawidłowe')
      setLoading(false)
      return
    }

    // Zmień hasło
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPass
    })

    if (updateError) {
      setError('Błąd zmiany hasła: ' + updateError.message)
    } else {
      setMsg('✅ Hasło zostało zmienione!')
      setCurrent('')
      setNewPass('')
      setConfirm('')
      setTimeout(() => router.push('/panel'), 2000)
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={()=>router.push('/panel')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>
          ← Wróć
        </button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>🔑 Zmiana hasła</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Zaktualizuj swoje hasło dostępu</div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'480px', margin:'0 auto' }}>

        {msg && (
          <div style={{ background:'#d5f5e3', border:'1px solid #2d9e6b', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color:'#1a5e3a', fontSize:'14px', fontWeight:600 }}>
            {msg}
          </div>
        )}

        {error && (
          <div style={{ background:'#fff0ee', border:'1px solid #e8604c', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color:'#e8604c', fontSize:'14px', fontWeight:600 }}>
            ❌ {error}
          </div>
        )}

        <div style={{ background:'white', borderRadius:'22px', padding:'28px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:'6px' }}>
                Obecne hasło *
              </label>
              <input
                type='password'
                value={current}
                onChange={e => setCurrent(e.target.value)}
                required
                placeholder='Wpisz obecne hasło'
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none', boxSizing:'border-box' as const }}
              />
            </div>

            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:'6px' }}>
                Nowe hasło *
              </label>
              <input
                type='password'
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                required
                placeholder='Minimum 6 znaków'
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none', boxSizing:'border-box' as const }}
              />
            </div>

            <div style={{ marginBottom:'24px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:'6px' }}>
                Powtórz nowe hasło *
              </label>
              <input
                type='password'
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder='Powtórz nowe hasło'
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none', boxSizing:'border-box' as const }}
              />
            </div>

            <button type='submit' disabled={loading} style={{ background: loading?'#6b8a95':'#0a6e8a', color:'white', border:'none', padding:'14px 32px', borderRadius:'100px', cursor: loading?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, width:'100%' }}>
              {loading ? '⏳ Zmienianie...' : '🔑 Zmień hasło'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}