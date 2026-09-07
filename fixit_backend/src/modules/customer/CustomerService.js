const customerRepository = require('./CustomerRepository');
const supabase = require('../../config/supabase');
const jobStore = require('../../jobStore');

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

    const phoneVariants = jobStore.normalizePhoneVariants(phone);
    let supabaseBookings = [];

    try {
      // First attempt with relational join on assigned_partner
      let { data, error } = await supabase
        .from('job_requests')
        .select('*, partner:partners!assigned_partner(name, rating, experience, phone)')
        .in('customer_id', phoneVariants)
        .order('created_at', { ascending: false });

      // Fallback if relational embedding syntax throws an error
      if (error) {
        console.warn('[Supabase Warning] Relational select note:', error.message, '- attempting plain select...');
        const res2 = await supabase
          .from('job_requests')
          .select('*')
          .in('customer_id', phoneVariants)
          .order('created_at', { ascending: false });
        data = res2.data;
      }

      if (data && data.length > 0) {
        supabaseBookings = data.map(job => {
          const jobObj = { ...job };
          jobObj._id = job.id;
          jobObj.id = job.id;
          jobObj.customerId = job.customer_id;
          jobObj.problemDescription = job.problem_description;
          jobObj.estimatedPrice = Number(job.estimated_price || 0);
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
          const partnerData = job.partner || job.partners;
          if (partnerData) {
            jobObj.partner = {
              name: partnerData.name || 'Professional Partner',
              phone: partnerData.phone || 'Hidden',
              rating: Number(partnerData.rating) || 5.0,
              experience: Number(partnerData.experience) || 1
            };
          } else {
            jobObj.partner = null;
          }
          return jobObj;
        });
      }
    } catch (dbErr) {
      console.warn('[CustomerService] Supabase bookings query error (using memory fallback):', dbErr.message || dbErr);
    }

    // Merge with in-memory active and completed bookings from jobStore
    const memoryBookings = jobStore.getCustomerMemoryBookings(phone);
    const seenIds = new Set();
    const merged = [];

    // Prioritize memory bookings (latest live in-memory updates)
    for (const b of memoryBookings) {
      const bId = b.id || b._id;
      if (bId && !seenIds.has(bId)) {
        seenIds.add(bId);
        merged.push(b);
      }
    }

    // Append Supabase records
    for (const b of supabaseBookings) {
      const bId = b.id || b._id;
      if (bId && !seenIds.has(bId)) {
        seenIds.add(bId);
        merged.push(b);
      }
    }

    // Sort newest first
    merged.sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime());

    return merged;
  }
}

module.exports = new CustomerService();
