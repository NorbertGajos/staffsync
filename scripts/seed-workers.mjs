import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yjdnhbxitupceyckwfjw.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZG5oYnhpdHVwY2V5Y2t3Zmp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAzNDQ1MiwiZXhwIjoyMDk0NjEwNDUyfQ.myRZo-om6lkbm4j5Zvj1IyI836oOYm6wLCKennC-JmE'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const workers = [
  { first_name: 'Adam', last_name: 'Nowak', stanowisko: 'Ratownik', phone: '501111001' },
  { first_name: 'Ewa', last_name: 'Kowalczyk', stanowisko: 'Ratownik', phone: '501111002' },
  { first_name: 'Piotr', last_name: 'Wiśniewski', stanowisko: 'Ratownik', phone: '501111003' },
  { first_name: 'Zofia', last_name: 'Wójcik', stanowisko: 'Ratownik', phone: '501111004' },
  { first_name: 'Tomasz', last_name: 'Kowalski', stanowisko: 'Instruktor Wakeboard', phone: '501111005' },
  { first_name: 'Marta', last_name: 'Kamińska', stanowisko: 'Instruktor Wakeboard', phone: '501111006' },
  { first_name: 'Łukasz', last_name: 'Lewandowski', stanowisko: 'Instruktor Wakeboard', phone: '501111007' },
  { first_name: 'Anna', last_name: 'Zielińska', stanowisko: 'Instruktor Flyboard/SUP/Aquazorbing', phone: '501111008' },
  { first_name: 'Michał', last_name: 'Szymański', stanowisko: 'Instruktor Flyboard/SUP/Aquazorbing', phone: '501111009' },
  { first_name: 'Katarzyna', last_name: 'Woźniak', stanowisko: 'Instruktor Flyboard/SUP/Aquazorbing', phone: '501111010' },
  { first_name: 'Jakub', last_name: 'Dąbrowski', stanowisko: 'Obsługa Toru Przeszkód', phone: '501111011' },
  { first_name: 'Natalia', last_name: 'Kozłowska', stanowisko: 'Obsługa Toru Przeszkód', phone: '501111012' },
  { first_name: 'Rafał', last_name: 'Jankowski', stanowisko: 'Obsługa Toru Przeszkód', phone: '501111013' },
  { first_name: 'Monika', last_name: 'Mazur', stanowisko: 'Kucharz/Grill Master', phone: '501111014' },
  { first_name: 'Dawid', last_name: 'Krawczyk', stanowisko: 'Kucharz/Grill Master', phone: '501111015' },
  { first_name: 'Agnieszka', last_name: 'Piotrowska', stanowisko: 'Kucharz/Grill Master', phone: '501111016' },
  { first_name: 'Kamil', last_name: 'Grabowski', stanowisko: 'Barman/Barmanka', phone: '501111017' },
  { first_name: 'Aleksandra', last_name: 'Nowakowska', stanowisko: 'Barman/Barmanka', phone: '501111018' },
  { first_name: 'Bartłomiej', last_name: 'Pawłowski', stanowisko: 'Barman/Barmanka', phone: '501111019' },
  { first_name: 'Weronika', last_name: 'Michalska', stanowisko: 'Kelner/Kelnerka', phone: '501111020' },
  { first_name: 'Przemysław', last_name: 'Adamczyk', stanowisko: 'Kelner/Kelnerka', phone: '501111021' },
  { first_name: 'Justyna', last_name: 'Dudek', stanowisko: 'Kelner/Kelnerka', phone: '501111022' },
  { first_name: 'Grzegorz', last_name: 'Zając', stanowisko: 'Kasjer/Kasjerka', phone: '501111023' },
  { first_name: 'Paulina', last_name: 'Wieczorek', stanowisko: 'Kasjer/Kasjerka', phone: '501111024' },
  { first_name: 'Sebastian', last_name: 'Jabłoński', stanowisko: 'Kasjer/Kasjerka', phone: '501111025' },
  { first_name: 'Magdalena', last_name: 'Król', stanowisko: 'Animator', phone: '501111026' },
  { first_name: 'Artur', last_name: 'Majewski', stanowisko: 'Animator', phone: '501111027' },
  { first_name: 'Dominika', last_name: 'Olszewski', stanowisko: 'Animator', phone: '501111028' },
  { first_name: 'Krzysztof', last_name: 'Jaworski', stanowisko: 'Ochroniarz', phone: '501111029' },
  { first_name: 'Sylwia', last_name: 'Wojciechowska', stanowisko: 'Ochroniarz', phone: '501111030' },
  { first_name: 'Marcin', last_name: 'Kwiatkowski', stanowisko: 'Ochroniarz', phone: '501111031' },
  { first_name: 'Joanna', last_name: 'Kaczmarek', stanowisko: 'Pracownik Plaży', phone: '501111032' },
  { first_name: 'Marek', last_name: 'Zawadzki', stanowisko: 'Pracownik Plaży', phone: '501111033' },
  { first_name: 'Izabela', last_name: 'Baran', stanowisko: 'Pracownik Plaży', phone: '501111034' },
  { first_name: 'Paweł', last_name: 'Rychlewski', stanowisko: 'Pracownik Plaży', phone: '501111035' },
  { first_name: 'Edyta', last_name: 'Olejnik', stanowisko: 'Sprzątacz/Sprzątaczka', phone: '501111036' },
  { first_name: 'Robert', last_name: 'Sikora', stanowisko: 'Sprzątacz/Sprzątaczka', phone: '501111037' },
  { first_name: 'Marzena', last_name: 'Malinowska', stanowisko: 'Sprzątacz/Sprzątaczka', phone: '501111038' },
  { first_name: 'Dariusz', last_name: 'Witek', stanowisko: 'Technik/Konserwator', phone: '501111039' },
  { first_name: 'Renata', last_name: 'Głowacka', stanowisko: 'Technik/Konserwator', phone: '501111040' },
  { first_name: 'Zbigniew', last_name: 'Czarnecki', stanowisko: 'Technik/Konserwator', phone: '501111041' },
  { first_name: 'Dorota', last_name: 'Tomaszewska', stanowisko: 'Koordynator/Kierownik', phone: '501111042' },
  { first_name: 'Waldemar', last_name: 'Sobczak', stanowisko: 'Koordynator/Kierownik', phone: '501111043' },
  { first_name: 'Elżbieta', last_name: 'Nowak', stanowisko: 'Koordynator/Kierownik', phone: '501111044' },
  { first_name: 'Tadeusz', last_name: 'Kowalski', stanowisko: 'Ratownik', phone: '501111045' },
]

async function createWorkers() {
  console.log(`Tworzenie ${workers.length} pracowników...`)
  
  for (const w of workers) {
    const email = `${w.first_name.toLowerCase().replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e').replace(/ł/g,'l').replace(/ń/g,'n').replace(/ó/g,'o').replace(/ś/g,'s').replace(/ź/g,'z').replace(/ż/g,'z')}@wp.pl`
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'test12',
      email_confirm: true,
      user_metadata: { first_name: w.first_name, last_name: w.last_name }
    })

    if (authError) {
      console.log(`❌ ${w.first_name} ${w.last_name}: ${authError.message}`)
      continue
    }

    const login = `${w.first_name.toLowerCase().replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e').replace(/ł/g,'l').replace(/ń/g,'n').replace(/ó/g,'o').replace(/ś/g,'s').replace(/ź/g,'z').replace(/ż/g,'z')}.${w.last_name.toLowerCase().replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e').replace(/ł/g,'l').replace(/ń/g,'n').replace(/ó/g,'o').replace(/ś/g,'s').replace(/ź/g,'z').replace(/ż/g,'z')}`

    await supabase.from('profiles').update({
      first_name: w.first_name,
      last_name: w.last_name,
      stanowisko: w.stanowisko,
      role: 'pracownik',
      phone: w.phone,
      login,
      status: 'aktywny',
      must_change_password: false,
    }).eq('id', authData.user.id)

    console.log(`✅ ${w.first_name} ${w.last_name} (${w.stanowisko}) – ${email}`)
  }

  console.log('Gotowe!')
}

createWorkers()