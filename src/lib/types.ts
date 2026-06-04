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