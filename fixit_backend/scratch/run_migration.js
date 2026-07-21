require('dotenv').config();
const supabase = require('../src/config/supabase');

async function runMigration() {
  console.log('Running customers table migration...');

  // Supabase doesn't expose DDL via REST - use the management/admin API via pg function
  // Try using a stored procedure to run ALTER TABLE
  const migrations = [
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS house_no VARCHAR`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_address VARCHAR`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS landmark VARCHAR`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS full_address VARCHAR`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_lat NUMERIC DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_lng NUMERIC DEFAULT 0`,
  ];

  for (const sql of migrations) {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      // Try alternate parameter name
      const r2 = await supabase.rpc('exec_sql', { sql_query: sql });
      console.log(`  [${sql.substring(0, 50)}...]`, r2.error ? `FAIL: ${r2.error.message}` : 'OK');
    } else {
      console.log(`  [${sql.substring(0, 50)}...] OK`);
    }
  }

  // Verify columns now exist
  const { data: rows, error: checkErr } = await supabase.from('customers').select('*').limit(1);
  if (rows && rows.length > 0) {
    console.log('\nColumns now:', Object.keys(rows[0]));
  } else {
    // Insert a dummy to check
    const { data: ins, error: insErr } = await supabase
      .from('customers')
      .insert({ phone: '_migration_test_', house_no: 'test' })
      .select('*')
      .single();
    if (insErr) {
      console.log('Column still missing:', insErr.message);
    } else {
      console.log('Columns confirmed:', Object.keys(ins));
      await supabase.from('customers').delete().eq('phone', '_migration_test_');
    }
  }
}

runMigration().catch(console.error);
