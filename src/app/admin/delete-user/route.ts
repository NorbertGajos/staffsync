import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'Brak ID użytkownika' }, { status: 400 })
    }

    // Usuń powiązane dane kolejno
    const { error: attErr } = await supabaseAdmin.from('attendance').delete().eq('user_id', user_id)
    if (attErr) console.log('attendance error:', attErr.message)

    const { error: shErr } = await supabaseAdmin.from('shifts').delete().eq('user_id', user_id)
    if (shErr) console.log('shifts error:', shErr.message)

    const { error: avErr } = await supabaseAdmin.from('availability').delete().eq('user_id', user_id)
    if (avErr) console.log('availability error:', avErr.message)

    const { error: fbErr } = await supabaseAdmin.from('feedback').delete().eq('user_id', user_id)
    if (fbErr) console.log('feedback error:', fbErr.message)

    // Usuń profil
    const { error: profErr } = await supabaseAdmin.from('profiles').delete().eq('id', user_id)
    if (profErr) {
      return NextResponse.json({ error: 'Błąd usuwania profilu: ' + profErr.message }, { status: 400 })
    }

    // Usuń konto auth
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (authErr) {
      return NextResponse.json({ error: 'Błąd usuwania konta: ' + authErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}