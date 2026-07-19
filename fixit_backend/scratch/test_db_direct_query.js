const supabase = require('../src/config/supabase');

async function checkPartnerById() {
  const partnerId = '65a8cb4b-5033-41da-8e7f-d833ef9b58f0';
  console.log(`Checking if partner ${partnerId} exists in Supabase...`);

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId);

  if (error) {
    console.error('Query failed with error:', error.message);
  } else {
    console.log('Query returned:', data);
  }
}

checkPartnerById();
