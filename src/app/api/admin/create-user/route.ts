import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-check'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })

  try {
    const { first_name, last_name, email, password, stanowisko, role, phone } = await request.json()

    const baseLogin = `${first_name.toLowerCase().replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e').replace(/ł/g,'l').replace(/ń/g,'n').replace(/ó/g,'o').replace(/ś/g,'s').replace(/ź/g,'z').replace(/ż/g,'z')}.${last_name.toLowerCase().replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e').replace(/ł/g,'l').replace(/ń/g,'n').replace(/ó/g,'o').replace(/ś/g,'s').replace(/ź/g,'z').replace(/ż/g,'z')}`

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role }
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name,
        last_name,
        stanowisko,
        role,
        phone: phone || null,
        login: baseLogin,
        must_change_password: true,
        status: 'aktywny'
      })
      .eq('id', authData.user.id)

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    return NextResponse.json({ success: true, login: baseLogin })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}