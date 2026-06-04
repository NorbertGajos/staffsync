import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const { login } = await request.json()
    if (!login) return NextResponse.json({ error: 'Brak loginu' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, login')
      .eq('login', login.toLowerCase())
      .single()

    if (error || !data) return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 })

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.id)
    if (!userData?.user?.email) return NextResponse.json({ error: 'Brak emaila' }, { status: 404 })

    return NextResponse.json({ email: userData.user.email })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}