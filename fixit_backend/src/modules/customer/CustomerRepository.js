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
        location: customerData.location || null
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
    return customerObj;
  }
}

module.exports = new CustomerRepository();
