const customerService = require('./CustomerService');

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
    const { phone, name, location, email, houseNo, streetAddress, landmark, fullAddress, lat, lng } = req.body;
    try {
      const customer = await customerService.updateCustomerProfile(phone, name, location, email, {
        houseNo,
        streetAddress,
        landmark,
        fullAddress,
        lat,
        lng
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
          lng: customer.lng || null
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
}

module.exports = new CustomerController();
