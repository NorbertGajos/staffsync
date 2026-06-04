export type Role = 'administrator' | 'koordynator' | 'pracownik'
export type Status = 'aktywny' | 'nieaktywny' | 'zwolniony'
export type AttendanceStatus = 
  | 'obecny' 
  | 'spoznienie' 
  | 'wczesne_wyjscie' 
  | 'nieobecny' 
  | 'zastepstwo' 
  | 'urlop' 
  | 'chorobowe'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  stanowisko: string | null
  role: Role
  status: Status
  login: string | null
  must_change_password: boolean
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export interface Schedule {
  id: string
  month: number
  year: number
  status: 'draft' | 'published' | 'archived'
  created_by: string | null
  created_at: string
}

export interface Shift {
  id: string
  schedule_id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  stanowisko: string
  status: 'planned' | 'confirmed' | 'cancelled'
  locked: boolean
  note: string | null
}

export interface Availability {
  id: string
  user_id: string
  schedule_id: string
  date: string
  available: boolean
  all_day: boolean
  from_time: string | null
  to_time: string | null
  note: string | null
}

export interface Attendance {
  id: string
  shift_id: string
  user_id: string
  date: string
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  real_hours: number | null
  status: AttendanceStatus
  note: string | null
}

export interface StanowiskoType {
  id: string
  nazwa: string
  kolejnosc: number
  aktywne: boolean
}

export const STANOWISKA = [
  'Ratownik',
  'Instruktor Wakeboard',
  'Instruktor Flyboard/SUP/Aquazorbing',
  'Obsługa Toru Przeszkód',
  'Barman/Barmanka',
  'Kucharz/Grill Master',
  'Kelner/Kelnerka',
  'Kasjer/Kasjerka',
  'Animator',
  'Ochroniarz',
  'Pracownik Plaży',
  'Sprzątacz/Sprzątaczka',
  'Technik/Konserwator',
  'Koordynator/Kierownik',
] as const

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function generateMonths(startYear: number, startMonth: number, count: number) {
  const months = []
  for (let i = 0; i < count; i++) {
    const date = new Date(startYear, startMonth - 1 + i, 1)
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const labels = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']
    months.push({
      label: `${labels[month - 1]} ${year}`,
      month,
      year,
      days: getDaysInMonth(month, year)
    })
  }
  return months
}

export const MONTHS = generateMonths(2026, 1, 24) // 2 lata od stycznia 2026