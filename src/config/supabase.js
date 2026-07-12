const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Create the Supabase client using the service role key for administrative access (upload/delete storage files)
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false
  }
});

module.exports = supabase;
