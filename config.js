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
  url: 'https://your-project.supabase.co',
  anon_key: 'your_anon_key_here'
};

// Initialize Supabase client
const { createClient } = supabase;
let supabaseClient = null;

async function initSupabase() {
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anon_key || 
      SUPABASE_CONFIG.url.includes('your-project')) {
    console.error('❌ Supabase credentials not configured. Update config.js with your credentials.');
    return null;
  }
  
  supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anon_key);
  console.log('✅ Supabase initialized successfully');
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