import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const WEEKDAY_START = '10:00'
const WEEKDAY_END = '18:00'
const WEEKEND_START = '08:00'
const WEEKEND_END = '20:00'
const WEEKDAY_HOURS = 8
const WEEKEND_HOURS = 12

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay()
  return dow === 0 || dow === 6
}

export async function POST(request: Request) {
  try {
    const { month, year, overwrite = false } = await request.json()

    // 1. Pobierz lub stwórz schedule
    let { data: schedule } = await supabaseAdmin
      .from('schedules').select('id').eq('month', month).eq('year', year).single()

    if (!schedule) {
      const { data: newSched } = await supabaseAdmin
        .from('schedules').insert({ month, year, status: 'draft' }).select('id').single()
      schedule = newSched
    }

    if (!schedule) return NextResponse.json({ error: 'Nie można stworzyć grafiku' }, { status: 500 })

    // 2. Usuń stare automatyczne zmiany jeśli overwrite
    if (overwrite) {
      await supabaseAdmin.from('shifts')
        .delete()
        .gte('date', `${year}-${String(month).padStart(2,'0')}-01`)
        .lte('date', `${year}-${String(month).padStart(2,'0')}-31`)
    }

    // 3. Pobierz aktywnych pracowników
    const { data: workers } = await supabaseAdmin
      .from('profiles').select('*').eq('status', 'aktywny')

    if (!workers?.length) return NextResponse.json({ error: 'Brak pracowników' }, { status: 400 })

    // 4. Pobierz dostępności
    const from = `${year}-${String(month).padStart(2,'0')}-01`
    const to = `${year}-${String(month).padStart(2,'0')}-31`
    const { data: availability } = await supabaseAdmin
      .from('availability').select('*').gte('date', from).lte('date', to)

    // Mapa: userId -> Set of available days
    const availMap: Record<string, Set<number>> = {}
    availability?.forEach(a => {
      if (!availMap[a.user_id]) availMap[a.user_id] = new Set()
      availMap[a.user_id].add(parseInt(a.date.split('-')[2]))
    })

    // 5. Pobierz limity
    const { data: limits } = await supabaseAdmin
      .from('schedule_limits').select('*').eq('schedule_id', schedule.id)

    // Mapa: day -> stanowisko -> { min, max }
    const limitsMap: Record<number, Record<string, { min: number, max: number }>> = {}
    limits?.forEach(l => {
      if (!limitsMap[l.day_of_month]) limitsMap[l.day_of_month] = {}
      limitsMap[l.day_of_month][l.stanowisko] = { min: l.min_workers, max: l.max_workers }
    })

    // 6. Pobierz istniejące zmiany (żeby nie nadpisywać ręcznych)
    const { data: existingShifts } = await supabaseAdmin
      .from('shifts').select('user_id, date')
      .gte('date', from).lte('date', to)

    const existingSet = new Set(existingShifts?.map(s => `${s.user_id}_${s.date}`) || [])

    // 7. Licznik godzin per pracownik
    const hoursCount: Record<string, number> = {}
    const weekendCount: Record<string, number> = {}
    workers.forEach(w => { hoursCount[w.id] = 0; weekendCount[w.id] = 0 })

    // 8. Oblicz ile dni każdy pracownik jest dostępny
    const availDaysCount: Record<string, number> = {}
    workers.forEach(w => { availDaysCount[w.id] = availMap[w.id]?.size || 0 })

    const totalAvailDays = Object.values(availDaysCount).reduce((a, b) => a + b, 0)

    // Liczba dni w miesiącu
    const daysInMonth = new Date(year, month, 0).getDate()

    // 9. GŁÓWNY ALGORYTM
    const shiftsToInsert: any[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const we = isWeekend(year, month, day)
      const startTime = we ? WEEKEND_START : WEEKDAY_START
      const endTime = we ? WEEKEND_END : WEEKDAY_END
      const hours = we ? WEEKEND_HOURS : WEEKDAY_HOURS

      // Znajdź dostępnych pracowników na ten dzień
      let availableWorkers = workers.filter(w =>
        availMap[w.id]?.has(day) && !existingSet.has(`${w.id}_${date}`)
      )

      // Sortuj: mniej godzin = wyższy priorytet
      // Przy równej liczbie godzin: mniej weekendów = wyższy priorytet
      availableWorkers.sort((a, b) => {
        const hoursDiff = hoursCount[a.id] - hoursCount[b.id]
        if (hoursDiff !== 0) return hoursDiff
        if (we) return weekendCount[a.id] - weekendCount[b.id]
        return 0
      })

      // Sprawdź limity dla tego dnia
      const dayLimits = limitsMap[day] || {}

      // Oblicz ile osób maksymalnie możemy przypisać
      // Jeśli nie ma limitów dla żadnego stanowiska – przypisz wszystkich dostępnych
      const hasAnyLimit = Object.keys(dayLimits).length > 0

      if (!hasAnyLimit) {
        // Brak limitów – przypisz wszystkich dostępnych (fair)
        for (const w of availableWorkers) {
          // Fair check: nie daj komuś za dużo jeśli inni mają mniej
          const workerAvailDays = availDaysCount[w.id]
          if (workerAvailDays === 0) continue

          // Proporcja: jeśli pracownik ma X% dostępności, nie daj mu więcej niż X% godzin
          const fairShare = totalAvailDays > 0
            ? (workerAvailDays / totalAvailDays) * (daysInMonth * hours * 0.8)
            : Infinity

          if (hoursCount[w.id] < fairShare + hours) {
            shiftsToInsert.push({
              schedule_id: schedule.id,
              user_id: w.id,
              date,
              start_time: startTime,
              end_time: endTime,
              stanowisko: w.stanowisko || 'Pracownik',
              status: 'planned'
            })
            hoursCount[w.id] += hours
            if (we) weekendCount[w.id]++
            existingSet.add(`${w.id}_${date}`)
          }
        }
      } else {
        // Mamy limity – obsadź per stanowisko
        const stanowiskaToFill = Object.keys(dayLimits)

        for (const stan of stanowiskaToFill) {
          const limit = dayLimits[stan]
          if (!limit || limit.max === 0) continue

          // Pracownicy z tym stanowiskiem
          const stanWorkers = availableWorkers.filter(w =>
            (w.stanowisko === stan) && !existingSet.has(`${w.id}_${date}`)
          )

          let assigned = 0
          for (const w of stanWorkers) {
            if (assigned >= limit.max) break

            const workerAvailDays = availDaysCount[w.id]
            if (workerAvailDays === 0) continue

            const fairShare = totalAvailDays > 0
              ? (workerAvailDays / totalAvailDays) * (daysInMonth * hours * 0.8)
              : Infinity

            if (hoursCount[w.id] < fairShare + hours) {
              shiftsToInsert.push({
                schedule_id: schedule.id,
                user_id: w.id,
                date,
                start_time: startTime,
                end_time: endTime,
                stanowisko: stan,
                status: 'planned'
              })
              hoursCount[w.id] += hours
              if (we) weekendCount[w.id]++
              existingSet.add(`${w.id}_${date}`)
              assigned++
            }
          }
        }
      }
    }

    // 10. Zapisz zmiany
    if (shiftsToInsert.length > 0) {
      const BATCH = 100
      for (let i = 0; i < shiftsToInsert.length; i += BATCH) {
        await supabaseAdmin.from('shifts').insert(shiftsToInsert.slice(i, i + BATCH))
      }
    }

    // 11. Podsumowanie
    const summary: Record<string, number> = {}
    workers.forEach(w => {
      summary[`${w.first_name} ${w.last_name}`] = hoursCount[w.id]
    })

    return NextResponse.json({
      success: true,
      shiftsCreated: shiftsToInsert.length,
      hoursPerWorker: summary
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}