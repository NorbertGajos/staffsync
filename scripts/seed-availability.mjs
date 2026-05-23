import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yjdnhbxitupceyckwfjw.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZG5oYnhpdHVwY2V5Y2t3Zmp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAzNDQ1MiwiZXhwIjoyMDk0NjEwNDUyfQ.myRZo-om6lkbm4j5Zvj1IyI836oOYm6wLCKennC-JmE'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const YEAR = 2026
const MONTH = 6
const DAYS_IN_MONTH = 30

function getDayOfWeek(day) {
  return new Date(YEAR, MONTH - 1, day).getDay() // 0=Nd, 6=So
}

function isWeekend(day) {
  const dow = getDayOfWeek(day)
  return dow === 0 || dow === 6
}

function isWeekday(day) {
  return !isWeekend(day)
}

function allDays() {
  return Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1)
}

function weekdaysOnly() {
  return allDays().filter(d => isWeekday(d))
}

function weekendsOnly() {
  return allDays().filter(d => isWeekend(d))
}

function everyOtherDay(startOdd = true) {
  return allDays().filter(d => startOdd ? d % 2 === 1 : d % 2 === 0)
}

function randomDays(count) {
  const all = allDays()
  const shuffled = all.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).sort((a, b) => a - b)
}

function first3Weeks() {
  return allDays().filter(d => d <= 21)
}

function last2Weeks() {
  return allDays().filter(d => d >= 15)
}

async function seedAvailability() {
  // Pobierz wszystkich pracowników
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, stanowisko')
    .eq('status', 'aktywny')
    .eq('role', 'pracownik')

  if (!profiles?.length) { console.log('Brak pracowników!'); return }

  console.log(`Dodawanie dostępności dla ${profiles.length} pracowników...`)

  // Przypisz wzorzec dostępności do każdego pracownika
  const patterns = [
    { name: 'wszystkie dni', days: () => allDays(), allDay: true },
    { name: 'tylko dni robocze', days: () => weekdaysOnly(), allDay: true },
    { name: 'tylko weekendy', days: () => weekendsOnly(), allDay: true },
    { name: 'co drugi dzień (nieparzyste)', days: () => everyOtherDay(true), allDay: true },
    { name: 'co drugi dzień (parzyste)', days: () => everyOtherDay(false), allDay: true },
    { name: 'pierwsze 3 tygodnie', days: () => first3Weeks(), allDay: true },
    { name: 'ostatnie 2 tygodnie', days: () => last2Weeks(), allDay: true },
    { name: '20 losowych dni', days: () => randomDays(20), allDay: true },
    { name: '15 losowych dni', days: () => randomDays(15), allDay: true },
    { name: 'dni robocze z godzinami 10-14', days: () => weekdaysOnly(), allDay: false, from: '10:00', to: '14:00' },
    { name: 'wszystkie dni godziny 8-16', days: () => allDays(), allDay: false, from: '08:00', to: '16:00' },
    { name: 'weekendy godziny 8-20', days: () => weekendsOnly(), allDay: false, from: '08:00', to: '20:00' },
  ]

  const availabilityRows = []

  profiles.forEach((profile, index) => {
    const pattern = patterns[index % patterns.length]
    const days = pattern.days()
    
    console.log(`  ${profile.first_name} ${profile.last_name}: ${pattern.name} (${days.length} dni)`)

    days.forEach(day => {
      const date = `${YEAR}-${String(MONTH).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      availabilityRows.push({
        user_id: profile.id,
        date,
        all_day: pattern.allDay,
        from_time: pattern.allDay ? null : pattern.from,
        to_time: pattern.allDay ? null : pattern.to,
      })
    })
  })

  // Zapisz wsadowo
  const BATCH = 100
  for (let i = 0; i < availabilityRows.length; i += BATCH) {
    const batch = availabilityRows.slice(i, i + BATCH)
    const { error } = await supabase.from('availability').insert(batch)
    if (error) console.log(`❌ Błąd: ${error.message}`)
    else console.log(`  Zapisano ${Math.min(i + BATCH, availabilityRows.length)}/${availabilityRows.length} wpisów`)
  }

  console.log(`✅ Gotowe! Dodano ${availabilityRows.length} wpisów dostępności.`)
}

seedAvailability()