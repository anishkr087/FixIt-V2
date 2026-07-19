const supabase = require('../src/config/supabase');

async function fixPartners() {
  console.log('Fetching partners from Supabase...');
  const { data: partners, error } = await supabase
    .from('partners')
    .select('id, name, service_category');

  if (error) {
    console.error('Error fetching partners:', error.message);
    return;
  }

  console.log(`Found ${partners.length} partners.`);
  for (const partner of partners) {
    const origCategory = partner.service_category;
    if (origCategory) {
      const trimmed = origCategory.trim();
      if (origCategory !== trimmed) {
        console.log(`Fixing partner "${partner.name || 'No Name'}" (${partner.id}): "${origCategory}" -> "${trimmed}"`);
        const { error: updateError } = await supabase
          .from('partners')
          .update({ service_category: trimmed })
          .eq('id', partner.id);

        if (updateError) {
          console.error(`Failed to update partner ${partner.id}:`, updateError.message);
        } else {
          console.log(`Successfully updated partner ${partner.id}.`);
        }
      }
    }
  }
  console.log('Data cleanup completed!');
}

fixPartners();
