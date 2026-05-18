'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let emailToUse = email.trim()

    if (loginType === 'phone') {
      const res = await fetch('/api/auth/get-email-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() })
      })
      const result = await res.json()
      if (result.error || !result.email) {
        setError('Nie znaleziono konta z tym numerem telefonu')
        setLoading(false)
        return
      }
      emailToUse = result.email
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    })

    if (error) {
      setError('Nieprawidłowe dane logowania')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #ddeaf0',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#1a2c35',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px' as const,
    color: '#6b8a95',
    textTransform: 'uppercase' as const,
    marginBottom: '6px'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a6e8a 0%, #1a9bb8 40%, #7dd3e8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏖</div>
          <h1 style={{ fontFamily: 'Arial', fontWeight: 800, fontSize: '28px', color: '#064d61', margin: '0 0 8px' }}>
            StaffSync
          </h1>
          <p style={{ color: '#6b8a95', fontSize: '14px', margin: 0 }}>
            Summer Playground · Panel pracowniczy
          </p>
        </div>

        {/* PRZEŁĄCZNIK EMAIL / TELEFON */}
        <div style={{
          display: 'flex',
          background: '#f0f6f8',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setLoginType('email')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: loginType === 'email' ? '#0a6e8a' : 'transparent',
              color: loginType === 'email' ? 'white' : '#6b8a95',
              transition: 'all 0.2s'
            }}
          >
            📧 Email
          </button>
          <button
            type="button"
            onClick={() => setLoginType('phone')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: loginType === 'phone' ? '#0a6e8a' : 'transparent',
              color: loginType === 'phone' ? 'white' : '#6b8a95',
              transition: 'all 0.2s'
            }}
          >
            📱 Telefon
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            {loginType === 'email' ? (
              <>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="twoj@email.pl"
                  style={inputStyle}
                />
              </>
            ) : (
              <>
                <label style={labelStyle}>Numer telefonu</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  placeholder="+48 000 000 000"
                  style={inputStyle}
                />
              </>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Hasło</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: '#fff0ee',
              border: '1px solid #f5a623',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '16px',
              color: '#e8604c',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#6b8a95' : '#0a6e8a',
              color: 'white',
              border: 'none',
              borderRadius: '100px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Logowanie...' : 'Zaloguj się →'}
          </button>
        </form>
      </div>
    </div>
  )
}