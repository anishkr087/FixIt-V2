const supabase = require('../src/config/supabase');

async function testUpdate() {
  const partnerId = '65a8cb4b-5033-41da-8e7f-d833ef9b58f0';
  console.log(`Attempting to update partner ${partnerId}...`);

  const { data, error } = await supabase
    .from('partners')
    .update({ is_online: true })
    .eq('id', partnerId)
    .select('*');

  if (error) {
    console.error('Update failed with error:', error.message);
  } else {
    console.log('Update returned data:', data);
  }
}

testUpdate();
