import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://monkecydvsouphbdlsnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vbmtlY3lkdnNvdXBoYmRsc254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk3ODk3MjUsImV4cCI6MjA0NTM2NTcyNX0.boV8gr7hTXaXfR4klbGlkDBg6vLDBo8aOY4Pj_qtGl0';

export const supabase = createClient(supabaseUrl, supabaseKey);
