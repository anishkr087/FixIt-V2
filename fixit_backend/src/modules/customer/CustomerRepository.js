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
    const { data, error } = await supabase
      .from('customers')
      .insert({
        phone: customerData.phone,
        name: customerData.name || null,
        email: customerData.email || null,
        location: customerData.location || null,
        house_no: customerData.houseNo || null,
        street_address: customerData.streetAddress || null,
        landmark: customerData.landmark || null,
        full_address: customerData.fullAddress || null,
        location_lat: customerData.lat || null,
        location_lng: customerData.lng || null
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating customer:', error.message);
      throw error;
    }
    return this._mapCustomer(data);
  }

  async update(phone, updateData) {
    const dataToUpdate = {};
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.email !== undefined) dataToUpdate.email = updateData.email;
    if (updateData.location !== undefined) dataToUpdate.location = updateData.location;
    if (updateData.houseNo !== undefined) dataToUpdate.house_no = updateData.houseNo;
    if (updateData.streetAddress !== undefined) dataToUpdate.street_address = updateData.streetAddress;
    if (updateData.landmark !== undefined) dataToUpdate.landmark = updateData.landmark;
    if (updateData.fullAddress !== undefined) dataToUpdate.full_address = updateData.fullAddress;
    if (updateData.lat !== undefined) dataToUpdate.location_lat = updateData.lat;
    if (updateData.lng !== undefined) dataToUpdate.location_lng = updateData.lng;

    const { data, error } = await supabase
      .from('customers')
      .update(dataToUpdate)
      .eq('phone', phone)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating customer:', error.message);
      throw error;
    }
    return this._mapCustomer(data);
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
    return customerObj;
  }
}

module.exports = new CustomerRepository();
