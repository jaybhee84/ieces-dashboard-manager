import { createClient } from '@supabase/supabase-js'

// Defaults copied from existing IECES apps that share the same Supabase project.
// These will be overridden by setting `VITE_SUPABASE_URL` and
// `VITE_SUPABASE_ANON_KEY` in your environment when running locally or in CI.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://joilvslvsioayrjshuxg.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aozkBamT5C58KY03X9kUgA_iehy73ZU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
