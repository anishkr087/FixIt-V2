const supabase = require('../src/config/supabase');

async function checkPartners() {
  console.log('Checking all partners in Supabase database...');
  const { data: partners, error } = await supabase
    .from('partners')
    .select('id, name, phone, service_category, is_online, location_lat, location_lng, wallet_balance');

  if (error) {
    console.error('Error fetching partners:', error.message);
    return;
  }

  console.log(`Found ${partners.length} partner(s):`);
  partners.forEach((p, idx) => {
    console.log(`\nPartner #${idx + 1}:`);
    console.log(`  ID:               ${p.id}`);
    console.log(`  Name:             ${p.name || 'No Name'}`);
    console.log(`  Phone:            ${p.phone}`);
    console.log(`  Online:           ${p.is_online}`);
    console.log(`  Service Category: "${p.service_category}"`);
    console.log(`  Coords:           [${p.location_lng}, ${p.location_lat}]`);
    console.log(`  Wallet Balance:   ₹${p.wallet_balance}`);
  });
}

checkPartners();
