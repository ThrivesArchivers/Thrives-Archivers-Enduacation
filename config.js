/**
 * Supabase Configuration
 * Store your credentials securely - use environment variables in production
 */

// ============================================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://supabase.com and create a new project
// 2. Copy your Project URL and Anon Key from Settings > API
// 3. Replace the values below OR use environment variables
// ============================================================================

const SUPABASE_CONFIG = {
  url: process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE',
  anon_key: process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE'
};

// Initialize Supabase client
const { createClient } = supabase;
let supabaseClient = null;

async function initSupabase() {
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anon_key) {
    console.error('❌ Supabase credentials not configured. Check config.js');
    return null;
  }
  
  supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anon_key);
  console.log('✅ Supabase initialized');
  return supabaseClient;
}

function getSupabaseClient() {
  if (!supabaseClient) {
    console.error('Supabase not initialized. Call initSupabase() first.');
    return null;
  }
  return supabaseClient;
}

// Export for use in other files
window.SupabaseConfig = { initSupabase, getSupabaseClient };
