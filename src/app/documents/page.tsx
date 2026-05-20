'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Document = {
  id: string
  title: string
  description: string
  file_path: string
  stanowisko: string
  created_at: string
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Document | null>(null)
  const [content, setContent] = useState('')
  const [converting, setConverting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
      setDocs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function openDoc(doc: Document) {
    setSelected(doc)
    setConverting(true)
    setContent('')
    try {
      const { data } = await supabase.storage.from('documents').download(doc.file_path)
      if (!data) { setContent('Błąd pobierania pliku'); setConverting(false); return }
      const arrayBuffer = await data.arrayBuffer()
      const mammoth = await import('mammoth')
      const result = await mammoth.convertToHtml({ arrayBuffer })
      setContent(result.value)
    } catch (e) {
      setContent('Błąd konwersji pliku')
    }
    setConverting(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#7dd3e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontFamily:'Arial' }}>
      Ładowanie...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a6e8a 0%,#1a9bb8 38%,#7dd3e8 68%,#f5ede0 100%)', fontFamily:'Arial' }}>

      {/* POPUP CZYTANIA */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px', overflowY:'auto' }}>
          <div style={{ background:'white', borderRadius:'20px', width:'100%', maxWidth:'700px', padding:'28px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
              <div>
                <h2 style={{ margin:'0 0 4px', color:'#064d61', fontSize:'20px' }}>{selected.title}</h2>
                {selected.stanowisko && <div style={{ fontSize:'13px', color:'#6b8a95' }}>📌 {selected.stanowisko}</div>}
              </div>
              <button onClick={() => { setSelected(null); setContent('') }} style={{ background:'#f0f4f8', border:'none', borderRadius:'100px', padding:'8px 16px', cursor:'pointer', fontSize:'13px', color:'#6b8a95' }}>✕ Zamknij</button>
            </div>
            {converting ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#6b8a95' }}>⏳ Ładowanie dokumentu...</div>
            ) : (
              <div
                style={{ lineHeight:1.7, color:'#1a2c35', fontSize:'15px' }}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}
          </div>
        </div>
      )}

      <div style={{ background:'#064d61', padding:'16px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={()=>router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', border:'1.5px solid rgba(255,255,255,0.3)', color:'white', padding:'8px 16px', borderRadius:'100px', cursor:'pointer', fontSize:'13px' }}>← Wróć</button>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>📚 Materiały szkoleniowe</div>
          <div style={{ color:'#7dd3e8', fontSize:'12px' }}>Kliknij dokument aby otworzyć</div>
        </div>
        {(profile?.role === 'administrator' || profile?.role === 'koordynator') && (
          <button onClick={()=>router.push('/admin/documents')} style={{ marginLeft:'auto', background:'#2d9e6b', color:'white', border:'none', padding:'10px 20px', borderRadius:'100px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
            + Dodaj
          </button>
        )}
      </div>

      <div style={{ padding:'20px', maxWidth:'800px', margin:'0 auto' }}>
        {docs.length === 0 ? (
          <div style={{ background:'white', borderRadius:'22px', padding:'40px', textAlign:'center', boxShadow:'0 6px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>📚</div>
            <h3 style={{ color:'#064d61', margin:'0 0 8px' }}>Brak materiałów</h3>
            <p style={{ color:'#6b8a95', margin:0, fontSize:'14px' }}>Administrator nie dodał jeszcze żadnych materiałów szkoleniowych</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {docs.map(doc => (
              <div key={doc.id} onClick={() => openDoc(doc)}
                style={{ background:'white', borderRadius:'16px', padding:'20px', cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,0.08)', border:'2px solid transparent', display:'flex', alignItems:'center', gap:'16px' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = '#0a6e8a')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <div style={{ fontSize:'40px' }}>📄</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'16px', color:'#064d61', marginBottom:'4px' }}>{doc.title}</div>
                  {doc.description && <div style={{ fontSize:'13px', color:'#6b8a95', marginBottom:'4px' }}>{doc.description}</div>}
                  {doc.stanowisko && <div style={{ fontSize:'12px', color:'#0a6e8a', fontWeight:600 }}>📌 {doc.stanowisko}</div>}
                </div>
                <div style={{ fontSize:'12px', color:'#6b8a95', textAlign:'right' as const, flexShrink:0 }}>
                  {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}