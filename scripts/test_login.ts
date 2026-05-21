import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function testLogin() {
  const email = 'testuser_1779358551052@vocaflow.com';
  const password = 'password123';

  console.log(`Testing login for ${email}...`);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Login Failed:', error.message);
    } else {
      console.log('✅ Login Successful!');
      console.log('User ID:', data.user?.id);
      console.log('Session metadata:', data.session ? 'Session exists' : 'No session');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testLogin();
