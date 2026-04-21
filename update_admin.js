const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAdminPassword() {
  const email = 'admin@mtu.ng';
  const newHash = '/Bi';

  const { data, error } = await supabase
    .from('admins')
    .update({ password_hash: newHash })
    .eq('email', email)
    .select('email, password_hash');

  if (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }

  console.log('Update successful:', data);
}

updateAdminPassword();
