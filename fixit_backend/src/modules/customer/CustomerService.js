const customerRepository = require('./CustomerRepository');
const supabase = require('../../config/supabase');

class CustomerService {
  async getOrCreateCustomer(phone) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    let customer = await customerRepository.findByPhone(phone);
    if (!customer) {
      customer = await customerRepository.create({ phone });
    }
    return customer;
  }

  async updateCustomerProfile(phone, name, location, email, extraData = {}) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    const customer = await customerRepository.findByPhone(phone);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (email !== undefined) updateData.email = email;
    if (extraData.houseNo !== undefined) updateData.houseNo = extraData.houseNo;
    if (extraData.streetAddress !== undefined) updateData.streetAddress = extraData.streetAddress;
    if (extraData.landmark !== undefined) updateData.landmark = extraData.landmark;
    if (extraData.fullAddress !== undefined) updateData.fullAddress = extraData.fullAddress;
    if (extraData.lat !== undefined) updateData.lat = extraData.lat;
    if (extraData.lng !== undefined) updateData.lng = extraData.lng;
    if (extraData.altPhone !== undefined) updateData.altPhone = extraData.altPhone;
    if (extraData.addressType !== undefined) updateData.addressType = extraData.addressType;

    return await customerRepository.update(phone, updateData);
  }

  async getCustomerBookings(phone) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    const { data, error } = await supabase
      .from('job_requests')
      .select('*')
      .eq('customer_id', phone)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer bookings from Supabase:', error.message);
      throw error;
    }

    return (data || []).map(job => {
      const jobObj = { ...job };
      jobObj._id = job.id; // Map UUID id to Mongoose _id compatibility
      jobObj.customerId = job.customer_id;
      jobObj.problemDescription = job.problem_description;
      jobObj.estimatedPrice = job.estimated_price;
      jobObj.assignedPartner = job.assigned_partner;
      jobObj.paymentMethod = job.payment_method;
      jobObj.createdAt = job.created_at;
      jobObj.completedAt = job.completed_at;
      if (job.customer_location_lat !== undefined && job.customer_location_lng !== undefined) {
        jobObj.customerLocation = {
          type: 'Point',
          coordinates: [Number(job.customer_location_lng), Number(job.customer_location_lat)]
        };
      }
      return jobObj;
    });
  }
}

module.exports = new CustomerService();
