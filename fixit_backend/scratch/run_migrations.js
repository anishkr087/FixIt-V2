require('dotenv').config();
const supabase = require('../src/config/supabase');

async function run() {
  const sqlCommands = [
    "ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS full_address VARCHAR;"
  ];

  for (const sql of sqlCommands) {
    console.log(`Running: ${sql}`);
    const r1 = await supabase.rpc('exec_sql', { query: sql });
    console.log('r1 error:', r1.error);
    const r2 = await supabase.rpc('exec_sql', { sql_query: sql });
    console.log('r2 error:', r2.error);
  }
}

run().catch(console.error);
