import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aobwlyoredautwcjxjhp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYndseW9yZWRhdXR3Y2p4amhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzQzMjgsImV4cCI6MjEwNzY1MDMyOH0.B4T_ksHQm4yTd2907M7kDAJU0siroIlqGmTX2-LnWzU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
