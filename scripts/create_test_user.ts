import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function createTestUser() {
  const email = `testuser_${Date.now()}@vocaflow.com`;
  const password = 'password123';

  console.log(`Creating test user with Admin API: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Bypass email confirmation
    });

    if (error) {
      console.log('❌ Admin createUser failed. Attempting signup instead...');
      console.log('Error details:', error);

      // Fallback to normal signup
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) {
        console.error('❌ Fallback SignUp also failed:', signupError);
      } else {
        console.log('✅ Fallback SignUp successful!', signupData.user?.id);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
      }
    } else {
      console.log('✅ Admin createUser successful!', data.user?.id);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createTestUser();
