import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!supabaseServiceRoleKey) {
  // It's safer to require the service role key for server-side mutations.
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

export const createServerSupabase = () => {
  return createClient(supabaseUrl!, supabaseServiceRoleKey)
}

export default createServerSupabase
