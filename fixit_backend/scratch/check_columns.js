const supabase = require('../src/config/supabase');

async function check() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .limit(1);
  if (error) {
    console.error('Error fetching customers:', error);
  } else {
    console.log('Successfully fetched row:', data);
    if (data.length > 0) {
      console.log('Columns in customers:', Object.keys(data[0]));
    } else {
      console.log('No rows in customers.');
    }
  }
}
check();
