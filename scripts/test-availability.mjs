import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yjdnhbxitupceyckwfjw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZG5oYnhpdHVwY2V5Y2t3Zmp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAzNDQ1MiwiZXhwIjoyMDk0NjEwNDUyfQ.myRZo-om6lkbm4j5Zvj1IyI836oOYm6wLCKennC-JmE'
)

const { data, error } = await supabase
  .from('availability')
  .select('*')
  .gte('date', '2026-06-01')
  .lte('date', '2026-06-30')

console.log('count:', data?.length)
console.log('error:', error)
console.log('sample:', data?.[0])