const supabase = require('../src/config/supabase');

async function testMatching() {
  console.log('Testing matchmaking function directly on Supabase via RPC...');

  const partnerId = '65a8cb4b-5033-41da-8e7f-d833ef9b58f0'; // Your partner ID
  const lat = 28.6139;
  const lng = 77.2090;
  const maxDistance = 10000; // 10km

  try {
    // 1. Temporarily set the partner online in DB with both categories
    console.log(`Setting partner ${partnerId} online with categories "Electrician,Plumber" at coords [${lng}, ${lat}]...`);
    const { error: updateError } = await supabase
      .from('partners')
      .update({
        is_online: true,
        service_category: 'Electrician,Plumber',
        location_lat: lat,
        location_lng: lng,
        wallet_balance: 100 // make sure balance is positive
      })
      .eq('id', partnerId);

    if (updateError) throw updateError;
    console.log('Partner database row updated successfully.');

    // 2. Test matchmaking for 'Electrician'
    console.log('\n--- Querying closest online partners for [Electrician] ---');
    const { data: electricians, error: errorElec } = await supabase
      .rpc('find_nearest_online_partners', {
        p_lat: lat,
        p_lng: lng,
        p_category: 'Electrician',
        p_max_distance_meters: maxDistance
      });

    if (errorElec) throw errorElec;
    console.log(`Found ${electricians ? electricians.length : 0} partner(s):`);
    (electricians || []).forEach(p => {
      console.log(`  - ID: ${p.id}, Name: ${p.name || 'No Name'}, Categories: "${p.service_category}", Distance: ${p.distance.toFixed(1)}m`);
    });

    // 3. Test matchmaking for 'Plumber'
    console.log('\n--- Querying closest online partners for [Plumber] ---');
    const { data: plumbers, error: errorPlum } = await supabase
      .rpc('find_nearest_online_partners', {
        p_lat: lat,
        p_lng: lng,
        p_category: 'Plumber',
        p_max_distance_meters: maxDistance
      });

    if (errorPlum) throw errorPlum;
    console.log(`Found ${plumbers ? plumbers.length : 0} partner(s):`);
    (plumbers || []).forEach(p => {
      console.log(`  - ID: ${p.id}, Name: ${p.name || 'No Name'}, Categories: "${p.service_category}", Distance: ${p.distance.toFixed(1)}m`);
    });

  } catch (err) {
    console.error('Matchmaking RPC call failed:', err.message);
  }
}

testMatching();
