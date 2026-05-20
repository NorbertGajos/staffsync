'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AdminDocumentsPage() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docs, setDocs] = useState<any[]>([])
  const [stanowiska, setStanowiska] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', stanowisko: '' })
  const [file, setFile] = useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!['administrator', 'koordynator'].includes(prof?.role)) { router.push('/dashboard'); return }
      await loadDocs()
      const { data: stan } = await supabase.from('stanowiska').select('nazwa').eq('aktywne', true).order('kolejnosc')
      setStanowiska(stan?.map(s => s.nazwa) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    setDocs(data || [])
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Wybierz plik'); return }
    if (!form.title.trim()) { setError('Wpisz tytuł'); return }
    setUploading(true)
    setMsg('')
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file)
      if (uploadError) { setError('Błąd uploadu: ' + uploadError.message); setUploading(false); return }

      const { error: dbError } = await supabase.from('documents').insert({
        title: form.title,
        description: form.description,
        file_path: fileName,
        stanowisko: form.stanowisko || null,
        created_by: user?.id
      })

      if (dbError) { setError('Błąd zapisu: ' + dbError.message); setUploading(false); return }

      setMsg('✅ Dokument dodany!')
      setForm({ title: '', description: '', stanowisko: '' })
      setFile(null)
      await loadDocs()
    } catch (e: any) {
      setError('Błąd: ' + e.message)
    }
    setUploading(false)
  }

  async function handleDelete(id: string, filePath: string) {
    if (!confirm('Usunąć ten dokument?')) return
    await supabase.storage.from('documents').remove([filePath])
    await supabase.from('documents').delete().eq('id', id)
    await loadDocs()
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>← Wróć</button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>📤 Materiały szkoleniowe</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Zarządzaj dokumentami szkoleniowymi</div>
        </div>
      </div>

      <div style={{ padding:'20px', maxWidth:'700px', margin:'0 auto' }}>

        {msg && <div style={{ background:'#d5f5e3', border:'1px solid #2d9e6b', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color:'#1a5e3a', fontSize:'14px', fontWeight:600 }}>{msg}</div>}
        {error && <div style={{ background:'#fff0ee', border:'1px solid #e8604c', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', color:'#e8604c', fontSize:'14px', fontWeight:600 }}>❌ {error}</div>}

        {/* FORMULARZ */}
        <div style={{ background:'white', borderRadius:'22px', padding:'28px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)', marginBottom:'20px' }}>
          <h2 style={{ margin:'0 0 20px', color:'#064d61', fontSize:'18px' }}>➕ Dodaj dokument</h2>
          <form onSubmit={handleUpload}>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'6px' }}>Tytuł *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required placeholder="np. Instrukcja BHP dla ratowników"
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'6px' }}>Opis</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Krótki opis dokumentu"
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'6px' }}>Stanowisko (opcjonalne)</label>
              <select value={form.stanowisko} onChange={e => setForm(f => ({...f, stanowisko: e.target.value}))}
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none' }}>
                <option value=''>— dla wszystkich —</option>
                {stanowiska.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:600, color:'#6b8a95', textTransform:'uppercase' as const, marginBottom:'6px' }}>Plik Word (.docx) *</label>
              <input type='file' accept='.docx' onChange={e => setFile(e.target.files?.[0] || null)}
                style={{ width:'100%', padding:'12px', border:'2px solid #ddeaf0', borderRadius:'10px', fontSize:'14px', color:'#1a2c35', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            <button type='submit' disabled={uploading} style={{ background: uploading?'#6b8a95':'#0a6e8a', color:'white', border:'none', padding:'14px 32px', borderRadius:'100px', cursor: uploading?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, width:'100%' }}>
              {uploading ? '⏳ Wysyłanie...' : '📤 Dodaj dokument'}
            </button>
          </form>
        </div>

        {/* LISTA */}
        {docs.length > 0 && (
          <div style={{ background:'white', borderRadius:'22px', padding:'24px', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin:'0 0 16px', color:'#064d61', fontSize:'16px' }}>📚 Dodane dokumenty ({docs.length})</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ background:'#fafcfd', borderRadius:'12px', padding:'14px 16px', border:'2px solid #ddeaf0', display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ fontSize:'28px' }}>📄</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'14px', color:'#064d61' }}>{doc.title}</div>
                    {doc.description && <div style={{ fontSize:'12px', color:'#6b8a95' }}>{doc.description}</div>}
                    {doc.stanowisko && <div style={{ fontSize:'12px', color:'#0a6e8a', fontWeight:600 }}>📌 {doc.stanowisko}</div>}
                  </div>
                  <button onClick={() => handleDelete(doc.id, doc.file_path)} style={{ background:'#fff0ee', color:'#e8604c', border:'none', padding:'8px 14px', borderRadius:'100px', cursor:'pointer', fontSize:'12px', fontWeight:600, flexShrink:0 }}>
                    🗑 Usuń
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}