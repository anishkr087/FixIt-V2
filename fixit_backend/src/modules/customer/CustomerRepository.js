const supabase = require('../../config/supabase');

class CustomerRepository {
  async findByPhone(phone) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Error finding customer by phone:', error.message);
      throw error;
    }
    return this._mapCustomer(data);
  }

  async create(customerData) {
    const fullLoc = customerData.fullAddress || customerData.location || null;
    const baseData = {
      phone: customerData.phone,
      name: customerData.name || null,
      email: customerData.email || null,
      location: fullLoc,
    };
    
    // Try full insert with extra columns first
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...baseData,
          house_no: customerData.houseNo || null,
          street_address: customerData.streetAddress || null,
          landmark: customerData.landmark || null,
          full_address: customerData.fullAddress || null,
          location_lat: customerData.lat || null,
          location_lng: customerData.lng || null,
          alternate_phone: customerData.altPhone || null,
          address_type: customerData.addressType || 'Home'
        })
        .select('*')
        .single();

      if (!error) return this._mapCustomer(data);
      if (!error.message?.includes('column') && !error.message?.includes('schema cache')) {
        throw error;
      }
    } catch (err) {
      console.warn('[CustomerRepository] Extended columns missing in DB table, using core fields fallback.');
    }

    // Fallback to core fields if extended columns don't exist in Supabase DB
    const { data, error } = await supabase
      .from('customers')
      .insert(baseData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating customer:', error.message);
      throw error;
    }
    return this._mapCustomer(data);
  }

  async update(phone, updateData) {
    const fullLoc = updateData.fullAddress || updateData.location;
    const baseData = {};
    if (updateData.name !== undefined) baseData.name = updateData.name;
    if (updateData.email !== undefined) baseData.email = updateData.email;
    if (fullLoc !== undefined) baseData.location = fullLoc;

    const extendedData = { ...baseData };
    if (updateData.houseNo !== undefined) extendedData.house_no = updateData.houseNo;
    if (updateData.streetAddress !== undefined) extendedData.street_address = updateData.streetAddress;
    if (updateData.landmark !== undefined) extendedData.landmark = updateData.landmark;
    if (updateData.fullAddress !== undefined) extendedData.full_address = updateData.fullAddress;
    if (updateData.lat !== undefined) extendedData.location_lat = updateData.lat;
    if (updateData.lng !== undefined) extendedData.location_lng = updateData.lng;
    if (updateData.altPhone !== undefined) extendedData.alternate_phone = updateData.altPhone;
    if (updateData.addressType !== undefined) extendedData.address_type = updateData.addressType;

    // First attempt with extended columns
    let res = await supabase
      .from('customers')
      .update(extendedData)
      .eq('phone', phone)
      .select('*')
      .single();

    if (res.error && (res.error.message?.includes('column') || res.error.message?.includes('schema cache'))) {
      console.warn('[CustomerRepository] Schema error encountered, falling back to core columns update.');
      res = await supabase
        .from('customers')
        .update(baseData)
        .eq('phone', phone)
        .select('*')
        .single();
    }

    if (res.error) {
      console.error('Error updating customer:', res.error.message);
      throw res.error;
    }
    return this._mapCustomer(res.data);
  }

  _mapCustomer(customer) {
    if (!customer) return null;
    const customerObj = { ...customer };
    customerObj._id = customer.phone; // For Mongoose _id compatibility
    customerObj.houseNo = customer.house_no || '';
    customerObj.streetAddress = customer.street_address || '';
    customerObj.landmark = customer.landmark || '';
    customerObj.fullAddress = customer.full_address || customer.location || '';
    customerObj.lat = customer.location_lat ? Number(customer.location_lat) : null;
    customerObj.lng = customer.location_lng ? Number(customer.location_lng) : null;
    customerObj.altPhone = customer.alternate_phone || '';
    customerObj.addressType = customer.address_type || 'Home';
    return customerObj;
  }
}

module.exports = new CustomerRepository();
