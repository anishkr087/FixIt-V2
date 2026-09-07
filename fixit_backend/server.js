const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dbHelper = require('./db_helper');
const supabase = require('./src/config/supabase');
const jobStore = require('./src/jobStore');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Safe CORS origin configuration for live production
const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',') 
  : '*'; // In production, this should be explicitly set in the environment configuration

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Express CORS Configuration
app.use(cors({
  origin: allowedOrigins
}));
app.use(express.json());
let lastDbError = null;

// Routes
const authRoutes = require('./routes/auth');
const partnerRoutes = require('./routes/partner');
const customerRoutes = require('./src/modules/customer/CustomerRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/customer', customerRoutes);

app.get('/', (req, res) => res.send('FixIt Secure Backend Running.'));

app.get('/api/db-status', async (req, res) => {
  const readyState = !!supabase.supabaseUrl && !!supabase.supabaseKey ? 1 : 0;
  const status = readyState === 1 ? 'connected' : 'disconnected';
  
  let host = 'supabase';
  let name = '';
  let error = null;

  if (readyState === 1) {
    try {
      const { data, error: connError } = await supabase.from('customers').select('phone').limit(1);
      if (connError) {
        error = connError.message;
      }
    } catch (err) {
      error = err.message || err.toString();
    }
  }

  res.json({
    readyState,
    status: error ? 'disconnected' : status,
    host,
    name,
    uri: supabase.supabaseUrl,
    error
  });
});

// Registry of active online partners
// Registry of active online partners, active jobs, and customer sockets from jobStore
const { activePartners, activeJobs, customerSockets } = jobStore;

// Haversine formula to compute distance in km between two coordinates
function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Socket.IO Handshake Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.error(`[Socket Auth Error] Socket connection rejected from IP ${socket.handshake.address || 'unknown'}: No token provided.`);
    return next(new Error('Authentication error: Token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_longer_key_needed_32');
    
    // Enforce payload structure
    if (!decoded.id || !decoded.type) {
      return next(new Error('Authentication error: Invalid token payload'));
    }

    socket.userId = decoded.id;
    socket.userType = decoded.type; // 'partner' or 'customer'
    console.log(`[Socket Auth] Authorized ${socket.userType} session for: ${socket.userId}`);
    next();
  } catch (err) {
    console.error(`[Socket Auth Error] Token verification failed for socket ${socket.id}: ${err.message}`);
    return next(new Error('Authentication error: Invalid session'));
  }
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`A user connected securely: ${socket.id} (user: ${socket.userId})`);

  socket.on('go_online', async (data) => {
    const partnerId = socket.userId || data?.partnerId;
    const { lat, lng, membershipTier = 'basic', serviceCategory } = data || {};
    
    // Authorization Check: Socket owner must be partner
    if (socket.userType !== 'partner') {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'go_online' but is authenticated as user ${socket.userId} (${socket.userType}).`);
      return;
    }

    // Check suspension status before going online
    try {
      const partner = await dbHelper.findPartnerById(partnerId);
      if (partner && partner.walletBalance <= -500) {
        console.warn(`[Suspension Block] Suspended partner ${partnerId} (balance: ₹${partner.walletBalance}) blocked from going online.`);
        socket.emit('error_notification', 'Your account is suspended due to negative wallet balance (threshold: -₹500). Please pay dues to go online.');
        return;
      }
    } catch (err) {
      console.error('Error verifying suspension on go_online:', err);
    }

    console.log(`Partner ${partnerId} [${serviceCategory || 'No Category'}] online at: ${lat}, ${lng}`);
    
    activePartners[partnerId] = {
      socketId: socket.id,
      lat: lat || 25.0113,
      lng: lng || 84.0200,
      serviceCategory: serviceCategory || 'Electrician'
    };
    
    // Update partner status and location in database
    try {
      await dbHelper.updatePartnerById(partnerId, {
        isOnline: true,
        location: {
          coordinates: [lng || 84.0200, lat || 25.0113]
        }
      });

      // Maintain online_partners table in Supabase DB for 7.5km real-time broadcasts
      try {
        await supabase
          .from('online_partners')
          .upsert({
            partner_id: partnerId,
            service_category: serviceCategory || 'Electrician',
            location_lat: lat || 25.0113,
            location_lng: lng || 84.0200,
            updated_at: new Date()
          }, { onConflict: 'partner_id' });
      } catch (opErr) {
        console.warn('online_partners upsert note:', opErr.message || opErr);
      }

      console.log(`Partner ${partnerId} status updated to online in DB & online_partners table.`);
    } catch (err) {
      console.error(`Failed to update online status in DB for partner ${partnerId}:`, err);
    }
    
    socket.join('online_partners');
  });

  socket.on('go_offline', async (data) => {
    const partnerId = socket.userId || data?.partnerId;
    
    // Authorization Check
    if (socket.userType !== 'partner') {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'go_offline' but is authenticated as ${socket.userId}.`);
      return;
    }

    console.log(`Partner ${partnerId} offline`);
    delete activePartners[partnerId];

    // Update partner offline status in database
    try {
      await dbHelper.updatePartnerById(partnerId, {
        isOnline: false
      });
      try {
        await supabase.from('online_partners').delete().eq('partner_id', partnerId);
      } catch (opErr) {
        console.warn('online_partners delete note:', opErr.message || opErr);
      }
      console.log(`Partner ${partnerId} status updated to offline in DB & online_partners table.`);
    } catch (err) {
      console.error(`Failed to update offline status in DB for partner ${partnerId}:`, err);
    }
  });

  // Client requests a service professional
  socket.on('request_job', async (data) => {
    const customerId = socket.userId || data?.customerId;
    const { 
      customerName, 
      problemDescription, 
      category, 
      paymentMethod = 'COD', 
      estimatedPrice, 
      lat, 
      lng,
      fullAddress,
      houseNo,
      streetAddress,
      landmark,
      altPhone,
      addressType
    } = data;
    
    // Authorization Check: Socket owner must be customer
    if (socket.userType !== 'customer') {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'request_job' but is authenticated as ${socket.userId} (${socket.userType}).`);
      return;
    }

    console.log(`[Job Request] Customer ${customerName} (${customerId}) requested ${category} for ₹${estimatedPrice} [Payment: ${paymentMethod}] - Address: "${fullAddress || 'N/A'}" at Lat: ${lat}, Lng: ${lng}`);

    const newJob = {
      jobId: 'job_' + Math.random().toString(36).substr(2, 9),
      customerId,
      customerName,
      problemDescription,
      category,
      estimatedPrice,
      paymentMethod,
      status: 'pending',
      assignedPartner: null,
      lat,
      lng,
      fullAddress: fullAddress || '',
      houseNo: houseNo || '',
      streetAddress: streetAddress || '',
      landmark: landmark || '',
      altPhone: altPhone || '',
      addressType: addressType || 'Home',
      createdAt: new Date()
    };

    activeJobs[newJob.jobId] = newJob;
    customerSockets[customerId] = socket.id;

    // Save to Supabase with automatic customer record creation & fallback handling
    try {
      // 1. Ensure customer record exists in DB to avoid foreign key violation
      try {
        await supabase
          .from('customers')
          .upsert({
            phone: customerId,
            name: customerName || 'Valued Customer',
            location: fullAddress || null,
            full_address: fullAddress || null,
            house_no: houseNo || null,
            street_address: streetAddress || null,
            landmark: landmark || null,
            location_lat: lat || 0,
            location_lng: lng || 0,
            alternate_phone: altPhone || null,
            address_type: addressType || 'Home'
          }, { onConflict: 'phone' });
      } catch (custErr) {
        console.warn('[Supabase Warning] Customer auto-upsert note:', custErr.message || custErr);
      }

      // 2. Insert into job_requests
      let savedJob = null;
      let dbError = null;

      // Primary insert attempt with all address fields
      const res1 = await supabase
        .from('job_requests')
        .insert({
          customer_id: customerId,
          problem_description: problemDescription,
          estimated_price: estimatedPrice,
          payment_method: paymentMethod,
          status: 'pending',
          customer_location_lat: lat,
          customer_location_lng: lng,
          full_address: fullAddress || null,
          house_no: houseNo || null,
          street_address: streetAddress || null,
          landmark: landmark || null,
          alternate_phone: altPhone || null,
          address_type: addressType || null
        })
        .select('*')
        .single();

      savedJob = res1.data;
      dbError = res1.error;

      // Fallback insert attempt if new columns (alt_phone, address_type) throw schema error
      if (dbError) {
        console.warn('[Supabase Warning] Primary insert error:', dbError.message || dbError, '- attempting base schema insert...');
        const res2 = await supabase
          .from('job_requests')
          .insert({
            customer_id: customerId,
            problem_description: problemDescription,
            estimated_price: estimatedPrice,
            payment_method: paymentMethod,
            status: 'pending',
            customer_location_lat: lat,
            customer_location_lng: lng,
            full_address: fullAddress || null,
            house_no: houseNo || null,
            street_address: streetAddress || null,
            landmark: landmark || null
          })
          .select('*')
          .single();

        savedJob = res2.data;
        dbError = res2.error;
      }

      if (savedJob && savedJob.id) {
        const tempJobId = newJob.jobId;
        newJob.jobId = savedJob.id;
        activeJobs[savedJob.id] = newJob;
        delete activeJobs[tempJobId];
        console.log(`JobRequest persisted in Supabase with ID: ${savedJob.id}`);
      } else if (dbError) {
        console.error('[Supabase Error] JobRequest DB error (continuing with memory job):', dbError.message || dbError);
      }
    } catch (err) {
      console.error('Failed to persist JobRequest to database (continuing with memory job):', err.message || err);
    }

    const activeJobId = newJob.jobId;

    // Multi-Partner Broadcast Algorithm: Broadcast to ALL active online partners
    let matchedPartners = [];

    try {
      console.log(`[Multi-Broadcast] Looking for online partners for category '${category}' at lat: ${lat}, lng: ${lng}...`);

      const cleanPhone10 = (p) => (p ? p.toString().replace(/[^0-9]/g, '').slice(-10) : '');

      // Helper function to find active partner socket by normalizing phone
      const findActiveSock = (pId) => {
        if (!pId) return null;
        const clean = cleanPhone10(pId);
        for (const actId in activePartners) {
          if (cleanPhone10(actId) === clean) {
            return { partnerId: actId, ...activePartners[actId] };
          }
        }
        return null;
      };

      // 1. Fetch online partners from DB table 'online_partners'
      let dbOnlineList = [];
      try {
        const { data: rows } = await supabase
          .from('online_partners')
          .select('*');
        if (rows && rows.length > 0) {
          dbOnlineList = rows;
        }
      } catch (err) {
        console.warn('online_partners query note:', err.message || err);
      }

      // Also merge active connected partners in memory into dbOnlineList
      Object.keys(activePartners).forEach(pId => {
        const memPartner = activePartners[pId];
        const cleanMem = cleanPhone10(pId);
        if (!dbOnlineList.some(p => cleanPhone10(p.partner_id) === cleanMem)) {
          dbOnlineList.push({
            partner_id: pId,
            service_category: memPartner.serviceCategory || category,
            location_lat: memPartner.lat,
            location_lng: memPartner.lng
          });
        }
      });

      // 2. Filter partners within 7.5 km range & matching service category
      dbOnlineList.forEach(p => {
        const pLat = parseFloat(p.location_lat);
        const pLng = parseFloat(p.location_lng);
        const distKm = getDistanceKm(lat, lng, pLat, pLng);

        const categoryMatch = !category || !p.service_category ||
          p.service_category.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(p.service_category.toLowerCase()) ||
          p.service_category.toLowerCase() === 'all' ||
          category.toLowerCase() === 'all';

        if (distKm <= 7.5 && categoryMatch) {
          const sock = findActiveSock(p.partner_id);
          if (sock && sock.socketId && !matchedPartners.some(m => m.partnerId === sock.partnerId)) {
            matchedPartners.push({
              partnerId: sock.partnerId,
              socketId: sock.socketId,
              distance: distKm
            });
          }
        }
      });

      // 3. Resilient Fallback: If 0 partners found within 7.5km, notify any active connected partner!
      // This ensures that during testing, across demo devices, or if GPS is offset, the online partner still gets notified!
      if (matchedPartners.length === 0) {
        console.log(`[Multi-Broadcast] No partner within 7.5km. Checking all active connected partners (${Object.keys(activePartners).length} online)...`);
        for (const actId in activePartners) {
          const actPartner = activePartners[actId];
          const distKm = getDistanceKm(lat, lng, actPartner.lat, actPartner.lng);
          const categoryMatch = !category || !actPartner.serviceCategory ||
            actPartner.serviceCategory.toLowerCase().includes(category.toLowerCase()) ||
            category.toLowerCase().includes(actPartner.serviceCategory.toLowerCase()) ||
            actPartner.serviceCategory.toLowerCase() === 'all' ||
            category.toLowerCase() === 'all';

          if (categoryMatch && actPartner.socketId && !matchedPartners.some(m => m.partnerId === actId)) {
            matchedPartners.push({
              partnerId: actId,
              socketId: actPartner.socketId,
              distance: isFinite(distKm) ? distKm : 2.4
            });
          }
        }
      }

      console.log(`[Multi-Broadcast] Found ${matchedPartners.length} active online partner(s) to notify.`);
    } catch (err) {
      console.error('Geo broadcast matching error:', err);
    }

    if (matchedPartners.length > 0) {
      // Record notified partner IDs for assignment race
      newJob.notifiedPartners = matchedPartners.map(m => m.partnerId);

      matchedPartners.forEach(mp => {
        console.log(`>> Broadcasting job ${activeJobId} to Partner ${mp.partnerId} (${mp.distance.toFixed(2)} km away)...`);
        io.to(mp.socketId).emit('new_job_broadcast', {
          jobId: activeJobId,
          problemDescription,
          customerName,
          estimatedPrice,
          distance: parseFloat(mp.distance.toFixed(1)),
          lat,
          lng,
          fullAddress: fullAddress || '',
          houseNo: houseNo || '',
          streetAddress: streetAddress || '',
          landmark: landmark || ''
        });
      });

      socket.emit('booking_status_update', {
        jobId: activeJobId,
        status: 'broadcasted',
        message: `Looking for professionals near you (${matchedPartners.length} online nearby)...`
      });
    } else {
      console.log(`>> No online partner found in 7.5km range for category: ${category}`);
      socket.emit('booking_status_update', {
        jobId: activeJobId,
        status: 'no_partners',
        message: 'No professionals are currently online near your location (7.5 km range).'
      });
    }
  });

  socket.on('accept_job', async (data) => {
    const { jobId } = data;
    const partnerId = socket.userId || data?.partnerId;
    
    // Authorization Check
    if (socket.userType !== 'partner') {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'accept_job' but is authenticated as ${socket.userId} (${socket.userType}).`);
      return;
    }

    console.log(`Partner ${partnerId} attempting to accept Job ${jobId}...`);

    if (activeJobs[jobId]) {
      const job = activeJobs[jobId];

      // Assignment Race Guard: If already accepted by another partner
      if (job.status === 'accepted' || job.assignedPartner) {
        console.log(`[Accept Job Race] Job ${jobId} already accepted by partner ${job.assignedPartner}. Notifying partner ${partnerId}.`);
        socket.emit('job_assigned_to_other', { jobId });
        return;
      }

      job.status = 'accepted';
      job.assignedPartner = partnerId;

      try {
        const { error: updateError } = await supabase
          .from('job_requests')
          .update({ 
            status: 'accepted',
            assigned_partner: partnerId
          })
          .eq('id', jobId);
        if (updateError) throw updateError;
      } catch (err) {
        console.error('Supabase accept_job error:', err.message);
      }

      // Notify all other notified online partners that the job was assigned
      const notifiedPartnerIds = job.notifiedPartners || [];
      notifiedPartnerIds.forEach(pId => {
        if (pId !== partnerId && activePartners[pId]) {
          io.to(activePartners[pId].socketId).emit('job_assigned_to_other', { jobId });
        }
      });

      // Retrieve details from DB securely
      let partnerDetails = {
        name: 'Professional Partner',
        phone: 'Hidden',
        rating: 5.0,
        experience: 1
      };

      try {
        const pDb = await dbHelper.findPartnerById(partnerId);
        if (pDb) {
          partnerDetails = {
            name: pDb.name || 'Professional Partner',
            phone: pDb.phone || 'Hidden',
            rating: pDb.rating || 5.0,
            experience: pDb.experience || 1
          };
        }
      } catch (err) {
        console.error('Failed to read partner info for broadcast:', err);
      }

      const customerSocketId = customerSockets[job.customerId];
      if (customerSocketId) {
        io.to(customerSocketId).emit('booking_status_update', {
          jobId,
          status: 'accepted',
          message: 'Booking accepted by professional!',
          partner: partnerDetails
        });
      }
    }
  });

  socket.on('update_location', async (data) => {
    const { partnerId, lat, lng } = data;
    
    // Authorization Check
    if (socket.userType !== 'partner' || socket.userId !== partnerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'update_location' for partnerId ${partnerId} but is authenticated as ${socket.userId}.`);
      return;
    }

    if (activePartners[partnerId]) {
      activePartners[partnerId].lat = lat;
      activePartners[partnerId].lng = lng;
    }

    // Update partner location in database
    try {
      await dbHelper.updatePartnerById(partnerId, {
        location: {
          coordinates: [lng, lat]
        }
      });
    } catch (err) {
      console.error(`Failed to update location in DB for partner ${partnerId}:`, err);
    }

    // Broadcast live coordinates to customer if job is in progress
    for (const jid in activeJobs) {
      const job = activeJobs[jid];
      if (job.assignedPartner === partnerId && ['accepted', 'on_the_way', 'reached', 'work_started'].includes(job.status)) {
        const customerSocketId = customerSockets[job.customerId];
        if (customerSocketId) {
          io.to(customerSocketId).emit('partner_location_update', {
            jobId: jid,
            lat,
            lng
          });
        }
      }
    }
  });

  socket.on('update_job_status', async (data) => {
    const { jobId, status, partnerId } = data;
    
    // Allow customers to cancel their own pending/broadcasted jobs
    const isCustomerCancelling = socket.userType === 'customer' && status === 'cancelled';

    if (!isCustomerCancelling) {
      // Authorization Check: only partners can advance job status
      if (socket.userType !== 'partner' || socket.userId !== partnerId) {
        console.error(`[Security Violation] Socket ${socket.id} attempted 'update_job_status' for partnerId ${partnerId} but is authenticated as ${socket.userId}.`);
        return;
      }
    }

    console.log(`[Job ${jobId}] Status advanced to: ${status}`);

    if (activeJobs[jobId]) {
      const job = activeJobs[jobId];
      
      if (isCustomerCancelling) {
        // Validate this customer owns the job
        if (job.customerId !== socket.userId) {
          console.error(`[Security Violation] Customer ${socket.userId} attempted to cancel job ${jobId} owned by ${job.customerId}.`);
          return;
        }
        // Only allow cancellation if no partner assigned yet
        if (job.assignedPartner && job.status === 'accepted') {
          socket.emit('error_notification', 'Cannot cancel after a professional has accepted. Please contact support.');
          return;
        }
      } else {
        // Ownership check: partner must be the one assigned
        if (job.assignedPartner !== partnerId) {
          console.error(`[Security Violation] Partner ${partnerId} attempted status update on unassigned job ${jobId}. Assigned: ${job.assignedPartner}`);
          return;
        }
      }

      job.status = status;

      try {
        const { error: updateError } = await supabase
          .from('job_requests')
          .update({ status })
          .eq('id', jobId);
        if (updateError) throw updateError;
      } catch (err) {
        console.error('Supabase update_job_status error:', err.message);
      }

      const customerSocketId = customerSockets[job.customerId];
      if (customerSocketId) {
        io.to(customerSocketId).emit('booking_status_update', {
          jobId,
          status,
          message: isCustomerCancelling ? 'Your booking has been cancelled.' : `Professional status: ${status}`
        });
      }

      // Clean up in-memory job if cancelled
      if (status === 'cancelled') {
        jobStore.completeJob(jobId, { status: 'cancelled' });
      }
    }
  });

  socket.on('complete_job', async (data) => {
    const { jobId } = data;
    const partnerId = socket.userId || data?.partnerId;
    
    // Authorization Check
    if (socket.userType !== 'partner') {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'complete_job' but is authenticated as ${socket.userId} (${socket.userType}).`);
      return;
    }

    console.log(`Job ${jobId} completed by partner ${partnerId}`);

    if (activeJobs[jobId]) {
      const job = activeJobs[jobId];
      
      // Ownership check: partner must be the one assigned
      if (job.assignedPartner !== partnerId) {
        console.error(`[Security Violation] Partner ${partnerId} attempted 'complete_job' on unassigned job ${jobId}.`);
        return;
      }

      const selectedPaymentMethod = data.paymentMethod || 'COD';
      job.status = 'completed';
      job.paymentMethod = selectedPaymentMethod;

      try {
        const { error: updateError } = await supabase
          .from('job_requests')
          .update({ 
            status: 'completed',
            payment_method: selectedPaymentMethod,
            completed_at: new Date()
          })
          .eq('id', jobId);
        if (updateError) throw updateError;
      } catch (err) {
        console.error('Supabase complete_job status update error:', err.message);
        return;
      }

      try {
        const gross = job.estimatedPrice || 0;
        const commission = Math.round(gross * 0.2);
        const net = gross - commission;

        const partner = await dbHelper.findPartnerById(partnerId);
        if (partner) {
          let newBalance = partner.walletBalance || 0;

          if (job.paymentMethod === 'COD') {
            // Cash payment: Partner received Gross in cash. Deduct 20% platform commission from wallet.
            await dbHelper.createTransaction({
              partnerId,
              jobId,
              type: 'commission_deduction',
              amount: -commission,
              description: `Platform Commission (20%) for Cash Job`
            });

            newBalance -= commission;
            console.log(`[Payment] COD Job: Deducted commission ₹${commission} from partner ${partnerId}. New balance: ₹${newBalance}`);
          } else {
            // UPI payment: Platform collected the gross. Credit 80% net earnings to partner wallet.
            await dbHelper.createTransaction({
              partnerId,
              jobId,
              type: 'earning',
              amount: gross,
              description: `${job.category || 'Service'} Job completed`
            });

            await dbHelper.createTransaction({
              partnerId,
              jobId,
              type: 'commission_deduction',
              amount: -commission,
              description: 'Platform Commission (20%)'
            });

            newBalance += net;
            console.log(`[Payment] Online Job: Credited net earning ₹${net} to partner ${partnerId}. New balance: ₹${newBalance}`);
          }

          // Save new balance
          await dbHelper.updatePartnerById(partnerId, {
            walletBalance: newBalance,
            jobsCompleted: (partner.jobsCompleted || 0) + 1
          });
        }
      } catch (err) {
        console.error('Error saving transactions and updating partner wallet:', err);
      }

      const customerSocketId = customerSockets[job.customerId];
      if (customerSocketId) {
        io.to(customerSocketId).emit('booking_status_update', {
          jobId,
          status: 'completed',
          message: 'Service completed successfully!'
        });
      }

      jobStore.completeJob(jobId, { status: 'completed', paymentMethod: selectedPaymentMethod, completedAt: new Date().toISOString() });
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    for (const pid in activePartners) {
      if (activePartners[pid].socketId === socket.id) {
        console.log(`Partner ${pid} automatically removed on disconnect`);
        delete activePartners[pid];
        // Set offline in database on disconnect
        try {
          await dbHelper.updatePartnerById(pid, {
            isOnline: false
          });
          console.log(`Partner ${pid} status updated to offline in DB on disconnect.`);
        } catch (err) {
          console.error(`Failed to update offline status in DB for partner ${pid} on disconnect:`, err);
        }
        break;
      }
    }
  });
});

const errorHandler = require('./src/middlewares/error');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
