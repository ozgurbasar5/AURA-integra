// Legacy compat — redirects to new @supabase/ssr client
export { createClient } from '@/lib/supabase/client'

// Named export for backward compat with old imports
import { createClient } from '@/lib/supabase/client'
export const supabase = createClient()