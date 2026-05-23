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
const MAX_HOURS_PER_MONTH = 160

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay()
  return dow === 0 || dow === 6
}

export async function POST(request: Request) {
  try {
    const { month, year, overwrite = false } = await request.json()

    let { data: schedule } = await supabaseAdmin
      .from('schedules').select('id').eq('month', month).eq('year', year).single()

    if (!schedule) {
      const { data: newSched } = await supabaseAdmin
        .from('schedules').insert({ month, year, status: 'draft' }).select('id').single()
      schedule = newSched
    }

    if (!schedule) return NextResponse.json({ error: 'Nie można stworzyć grafiku' }, { status: 500 })

    if (overwrite) {
      await supabaseAdmin.from('shifts')
        .delete()
        .gte('date', `${year}-${String(month).padStart(2,'0')}-01`)
        .lte('date', `${year}-${String(month).padStart(2,'0')}-31`)
    }

    const { data: workers } = await supabaseAdmin
      .from('profiles').select('*').eq('status', 'aktywny')

    if (!workers?.length) return NextResponse.json({ error: 'Brak pracowników' }, { status: 400 })

    const from = `${year}-${String(month).padStart(2,'0')}-01`
    const to = `${year}-${String(month).padStart(2,'0')}-31`
    const { data: availability } = await supabaseAdmin
      .from('availability').select('*').gte('date', from).lte('date', to)

    const availMap: Record<string, Set<number>> = {}
    availability?.forEach((a: any) => {
      if (!availMap[a.user_id]) availMap[a.user_id] = new Set()
      availMap[a.user_id].add(parseInt(a.date.split('-')[2]))
    })

    const { data: limits } = await supabaseAdmin
      .from('schedule_limits').select('*').eq('schedule_id', schedule.id)

    const limitsMap: Record<number, Record<string, { min: number, max: number }>> = {}
    ;(limits as any[])?.forEach((l: any) => {
      if (!limitsMap[l.day_of_month]) limitsMap[l.day_of_month] = {}
      limitsMap[l.day_of_month][l.stanowisko] = { min: l.min_workers, max: l.max_workers }
    })

    const { data: existingShifts } = await supabaseAdmin
      .from('shifts').select('user_id, date')
      .gte('date', from).lte('date', to)

    const existingSet = new Set((existingShifts as any[])?.map((s: any) => `${s.user_id}_${s.date}`) || [])

    const hoursCount: Record<string, number> = {}
    const weekendCount: Record<string, number> = {}
    ;(workers as any[]).forEach((w: any) => { hoursCount[w.id] = 0; weekendCount[w.id] = 0 })

    const daysInMonth = new Date(year, month, 0).getDate()
    const shiftsToInsert: any[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const we = isWeekend(year, month, day)
      const startTime = we ? WEEKEND_START : WEEKDAY_START
      const endTime = we ? WEEKEND_END : WEEKDAY_END
      const hours = we ? WEEKEND_HOURS : WEEKDAY_HOURS

      let availableWorkers = (workers as any[]).filter((w: any) =>
        availMap[w.id]?.has(day) && !existingSet.has(`${w.id}_${date}`)
      )

      availableWorkers.sort((a: any, b: any) => {
        const hoursDiff = hoursCount[a.id] - hoursCount[b.id]
        if (hoursDiff !== 0) return hoursDiff
        if (we) return weekendCount[a.id] - weekendCount[b.id]
        return 0
      })

      const dayLimits = limitsMap[day] || {}
      const hasAnyLimit = Object.keys(dayLimits).length > 0

      if (!hasAnyLimit) {
        for (const w of availableWorkers) {
          if (hoursCount[w.id] >= MAX_HOURS_PER_MONTH) continue
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
      } else {
        const stanowiskaToFill = Object.keys(dayLimits)

        for (const stan of stanowiskaToFill) {
          const limit = dayLimits[stan]
          if (!limit || limit.max === 0) continue

          const stanWorkers = availableWorkers.filter((w: any) =>
            w.stanowisko === stan && !existingSet.has(`${w.id}_${date}`)
          )

          let assigned = 0
          for (const w of stanWorkers) {
            if (assigned >= limit.max) break
            if (hoursCount[w.id] >= MAX_HOURS_PER_MONTH) continue
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

    if (shiftsToInsert.length > 0) {
      const BATCH = 100
      for (let i = 0; i < shiftsToInsert.length; i += BATCH) {
        await supabaseAdmin.from('shifts').insert(shiftsToInsert.slice(i, i + BATCH))
      }
    }

    const summary: Record<string, number> = {}
    ;(workers as any[]).forEach((w: any) => {
      summary[`${w.first_name} ${w.last_name}`] = hoursCount[w.id]
    })

    return NextResponse.json({
      success: true,
      shiftsCreated: shiftsToInsert.length,
      hoursPerWorker: summary,
      debug: {
        workersCount: (workers as any[]).length,
        availabilityCount: availability?.length || 0,
        limitsCount: (limits as any[])?.length || 0,
        scheduleId: (schedule as any).id,
        availMapKeys: Object.keys(availMap).length,
        day1limits: limitsMap[1] || {},
        day1available: Object.entries(availMap).slice(0, 3).map(([k, v]) => ({ user: k, days: Array.from(v).slice(0, 5) })),
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}