import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json({ error: 'Brak numeru telefonu' }, { status: 400 })
    }

    // Znajdź profil po numerze telefonu
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Nie znaleziono konta' }, { status: 404 })
    }

    // Pobierz email użytkownika
    const { data: userData, error: userError } = await supabaseAdmin
      .auth.admin.getUserById(profile.id)

    if (userError || !userData?.user?.email) {
      return NextResponse.json({ error: 'Brak emaila' }, { status: 404 })
    }

    return NextResponse.json({ email: userData.user.email })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Błąd serwera' }, { status: 500 })
  }
}