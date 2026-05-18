'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile, STANOWISKA } from '@/lib/types'

export default function EditWorkerPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    stanowisko: '',
    role: 'pracownik' as 'pracownik' | 'koordynator' | 'administrator',
    status: 'aktywny' as 'aktywny' | 'nieaktywny' | 'zwolniony',
    phone: '',
  })
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const id = Array.isArray(params.id) ? params.id[0] : params.id
      if (!id) { setLoading(false); return }
      const { data } = await supabase
        .from('profiles').select('*').eq('id', id).single()
      if (data) {
        setProfile(data)
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          stanowisko: data.stanowisko || '',
          role: data.role,
          status: data.status,
          phone: data.phone || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        stanowisko: form.stanowisko,
        role: form.role,
        status: form.status,
        phone: form.phone,
      })
      .eq('id', id)
    if (error) {
      setMsg('❌ Błąd: ' + error.message)
    } else {
      setMsg('✅ Zapisano pomyślnie!')
    }
    setSaving(false)
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setMsg('❌ Hasło musi mieć minimum 6 znaków!')
      return
    }
    setResetting(true)
    setMsg('')
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, new_password: newPassword })
    })
    const result = await res.json()
    if (result.error) {
      setMsg('❌ Błąd: ' + result.error)
    } else {
      setMsg('✅ Hasło zostało zmienione!')
      setNewPassword('')
      setShowReset(false)
    }
    setResetting(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #ddeaf0',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#1a2c35',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '12px',
    background: 'white',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    color: '#6b8a95',
    textTransform: 'uppercase' as const,
    marginBottom: '4px'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a6e8a 0%, #7dd3e8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontFamily: 'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a6e8a 0%, #1a9bb8 38%, #7dd3e8 68%, #f5ede0 100%)', fontFamily: 'Arial' }}>
      <div style={{ background: '#064d61', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => router.push('/admin/workers')} style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px' }}>
          ← Wróć
        </button>
        <div style={{ color: 'white', fontWeight: 800, fontSize: '18px' }}>
          ✏️ Edycja: {profile?.first_name} {profile?.last_name}
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        {msg && (
          <div style={{ background: msg.includes('Błąd') ? '#fff0ee' : '#d5f5e3', border: '1px solid', borderColor: msg.includes('Błąd') ? '#e8604c' : '#2d9e6b', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', color: msg.includes('Błąd') ? '#e8604c' : '#1a5e3a', fontSize: '14px' }}>
            {msg}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '22px', padding: '28px', boxShadow: '0 6px 30px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 24px', color: '#064d61', fontSize: '18px' }}>Dane pracownika</h2>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div>
                <label style={labelStyle}>Imię *</label>
                <input style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Nazwisko *</label>
                <input style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+48 000 000 000" />
              </div>
              <div>
                <label style={labelStyle}>Stanowisko</label>
                <select style={inputStyle} value={form.stanowisko} onChange={e => setForm(f => ({ ...f, stanowisko: e.target.value }))}>
                  <option value="">— wybierz —</option>
                  {STANOWISKA.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Rola</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
                  <option value="pracownik">Pracownik</option>
                  <option value="koordynator">Koordynator</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="aktywny">Aktywny</option>
                  <option value="nieaktywny">Nieaktywny</option>
                  <option value="zwolniony">Zwolniony</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" disabled={saving} style={{ background: saving ? '#6b8a95' : '#0a6e8a', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '100px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                {saving ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
              </button>
              <button type="button" onClick={() => router.push('/admin/workers')} style={{ background: 'transparent', color: '#0a6e8a', border: '2px solid #1a9bb8', padding: '12px 28px', borderRadius: '100px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                Anuluj
              </button>
            </div>
          </form>
        </div>

        {profile?.login && (
          <div style={{ background: 'white', borderRadius: '22px', padding: '24px', marginBottom: '16px', boxShadow: '0 6px 30px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', color: '#064d61', fontSize: '16px' }}>🔑 Dane logowania</h3>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#1a2c35' }}>
              Login: <strong style={{ color: '#0a6e8a' }}>{profile.login}</strong>
            </p>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '22px', padding: '24px', boxShadow: '0 6px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showReset ? '20px' : '0' }}>
            <h3 style={{ margin: 0, color: '#064d61', fontSize: '16px' }}>🔒 Reset hasła</h3>
            <button onClick={() => setShowReset(!showReset)} style={{ background: showReset ? '#fff0ee' : '#f5a623', color: showReset ? '#e8604c' : 'white', border: 'none', padding: '8px 18px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              {showReset ? '✕ Anuluj' : '🔑 Zmień hasło'}
            </button>
          </div>
          {showReset && (
            <form onSubmit={handleResetPassword}>
              <label style={labelStyle}>Nowe hasło (min. 6 znaków)</label>
              <input style={inputStyle} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Wpisz nowe hasło..." required minLength={6} />
              <button type="submit" disabled={resetting} style={{ background: resetting ? '#6b8a95' : '#e8604c', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '100px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                {resetting ? 'Zmienianie...' : '🔒 Ustaw nowe hasło'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}