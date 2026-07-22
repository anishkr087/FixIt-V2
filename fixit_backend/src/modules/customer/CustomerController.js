const customerService = require('./CustomerService');
const supabase = require('../../config/supabase');

class CustomerController {
  async getOrCreate(req, res, next) {
    const { phone } = req.body;
    try {
      const customer = await customerService.getOrCreateCustomer(phone);
      res.status(200).json({ success: true, customer });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    const { phone, name, location, email, houseNo, streetAddress, landmark, fullAddress, lat, lng, altPhone, addressType } = req.body;
    try {
      const customer = await customerService.updateCustomerProfile(phone, name, location, email, {
        houseNo,
        streetAddress,
        landmark,
        fullAddress,
        lat,
        lng,
        altPhone,
        addressType
      });
      res.status(200).json({
        success: true,
        user: {
          phone: customer.phone,
          name: customer.name || '',
          email: customer.email || '',
          location: customer.location || '',
          houseNo: customer.houseNo || '',
          streetAddress: customer.streetAddress || '',
          landmark: customer.landmark || '',
          fullAddress: customer.fullAddress || '',
          lat: customer.lat || null,
          lng: customer.lng || null,
          altPhone: customer.altPhone || '',
          addressType: customer.addressType || 'Home'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getBookings(req, res, next) {
    const { phone } = req.params;
    try {
      const bookings = await customerService.getCustomerBookings(phone);
      res.status(200).json({ success: true, bookings });
    } catch (err) {
      next(err);
    }
  }

  async getPartners(req, res, next) {
    try {
      const { data: partners, error } = await supabase
        .from('partners')
        .select('name, service_category, rating, jobs_completed, experience, phone')
        .limit(10);
        
      if (error) throw error;
      
      const formatted = (partners || []).map(p => ({
        id: p.phone,
        name: p.name || 'Service Pro',
        role: p.service_category || 'Professional',
        rating: Number(p.rating) || 5.0,
        jobs: p.jobs_completed || 0,
        experience: p.experience || 0,
        initials: p.name ? p.name.split(' ').map(w => w[0]).join('').toUpperCase() : 'SP',
        color: '#FF5E14'
      }));
      
      res.status(200).json({ success: true, partners: formatted });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CustomerController();
