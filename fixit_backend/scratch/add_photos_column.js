require('dotenv').config();
const supabase = require('../src/config/supabase');

async function run() {
  const sql = `ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS photos TEXT`;
  console.log('Running SQL query to add photos column to job_requests...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    const r2 = await supabase.rpc('exec_sql', { sql_query: sql });
    if (r2.error) {
      console.error('Migration failed:', r2.error.message);
    } else {
      console.log('Migration OK');
    }
  } else {
    console.log('Migration OK');
  }
}

run().catch(console.error);
