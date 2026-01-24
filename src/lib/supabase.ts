import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.error('❌ Supabase credentials are missing or invalid. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// Helper to check if supabase is configured
const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';
};

// Validate configuration before creating client
if (!isSupabaseConfigured()) {
  console.error('❌ Cannot initialize Supabase client with invalid configuration');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Test Supabase connection
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured. Check your environment variables.' };
    }

    // Simple query to test connection
    const { error } = await supabase.from('institutions').select('count', { count: 'exact', head: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown connection error' };
  }
};

export { isSupabaseConfigured };
