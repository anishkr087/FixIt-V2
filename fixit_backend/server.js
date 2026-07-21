const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dbHelper = require('./db_helper');
const supabase = require('./src/config/supabase');
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
const activePartners = {};
// Registry of active jobs & socket mappings for customers
const activeJobs = {};
const customerSockets = {};

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
    const { partnerId, lat, lng, membershipTier = 'basic', serviceCategory } = data;
    
    // Authorization Check: Socket owner must match action target
    if (socket.userType !== 'partner' || socket.userId !== partnerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'go_online' for partnerId ${partnerId} but is authenticated as user ${socket.userId} (${socket.userType}).`);
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

    console.log(`Partner ${partnerId} (${membershipTier}) [${serviceCategory || 'No Category'}] online at: ${lat}, ${lng}`);
    
    activePartners[partnerId] = {
      socketId: socket.id,
      lat: lat || 28.6139,
      lng: lng || 77.2090,
      membershipTier,
      serviceCategory
    };
    
    // Update partner status and location in database
    try {
      await dbHelper.updatePartnerById(partnerId, {
        isOnline: true,
        location: {
          coordinates: [lng || 77.2090, lat || 28.6139]
        }
      });
      console.log(`Partner ${partnerId} status updated to online in DB.`);
    } catch (err) {
      console.error(`Failed to update online status in DB for partner ${partnerId}:`, err);
    }
    
    socket.join('online_partners');
  });

  socket.on('go_offline', async (data) => {
    const { partnerId } = data;
    
    // Authorization Check
    if (socket.userType !== 'partner' || socket.userId !== partnerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'go_offline' for partnerId ${partnerId} but is authenticated as ${socket.userId}.`);
      return;
    }

    console.log(`Partner ${partnerId} offline`);
    delete activePartners[partnerId];

    // Update partner offline status in database
    try {
      await dbHelper.updatePartnerById(partnerId, {
        isOnline: false
      });
      console.log(`Partner ${partnerId} status updated to offline in DB.`);
    } catch (err) {
      console.error(`Failed to update offline status in DB for partner ${partnerId}:`, err);
    }
  });

  // Client requests a service professional
  socket.on('request_job', async (data) => {
    const { 
      customerId, 
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
    
    // Authorization Check
    if (socket.userType !== 'customer' || socket.userId !== customerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'request_job' for customerId ${customerId} but is authenticated as ${socket.userId}.`);
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

    // Save to Supabase strictly
    try {
      const { data: savedJob, error: dbError } = await supabase
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

      if (dbError) throw dbError;
      
      // Update customer profile with default location and address if provided
      if (fullAddress || lat || lng) {
        await supabase
          .from('customers')
          .update({
            location: fullAddress || undefined,
            full_address: fullAddress || undefined,
            house_no: houseNo || undefined,
            street_address: streetAddress || undefined,
            landmark: landmark || undefined,
            location_lat: lat || undefined,
            location_lng: lng || undefined,
            alternate_phone: altPhone || undefined,
            address_type: addressType || undefined
          })
          .eq('phone', customerId);
      }

      // Re-key in-memory registry with real UUID ID
      const tempJobId = newJob.jobId; // preserve temp key before overwriting
      newJob.jobId = savedJob.id;
      activeJobs[savedJob.id] = newJob;
      delete activeJobs[tempJobId]; // delete the old temp key, not the new one
      console.log(`JobRequest persisted in Supabase with ID: ${savedJob.id}`);
    } catch (err) {
      console.error('Failed to persist JobRequest to database:', err);
      socket.emit('booking_status_update', {
        status: 'error',
        message: 'Could not create booking request due to database failure.'
      });
      return;
    }

    const activeJobId = newJob.jobId;

    // Run matching algorithm to locate closest online partner of matching serviceCategory
    let closestPartner = null;
    let minDistance = Infinity;

    try {
      console.log(`[Matching] Looking for nearest online partners for category '${category}' at lat: ${lat}, lng: ${lng} within 7km...`);
      const dbPartners = await dbHelper.findNearestOnlinePartners(lat, lng, category, 7000);
      console.log(`[Matching] Database RPC returned ${dbPartners ? dbPartners.length : 0} online partner(s) of category '${category}'.`);
      
      if (dbPartners && dbPartners.length > 0) {
        dbPartners.forEach((p, idx) => {
          const distance = getDistanceKm(lat, lng, p.location?.coordinates[1], p.location?.coordinates[0]);
          const sock = activePartners[p._id.toString()];
          console.log(`  [Partner #${idx + 1}] ID: ${p._id}, Name: ${p.name || 'No Name'}, Coords: [${p.location?.coordinates}], Distance: ${distance.toFixed(2)} km, Socket: ${sock ? 'Connected (' + sock.socketId + ')' : 'Offline/No Socket'}`);
        });

        const nearestDbPartner = dbPartners[0];
        // Find their active socket connection information
        const partnerSocketInfo = activePartners[nearestDbPartner._id.toString()];
        if (partnerSocketInfo) {
          closestPartner = {
            partnerId: nearestDbPartner._id.toString(),
            socketId: partnerSocketInfo.socketId,
            distance: getDistanceKm(lat, lng, nearestDbPartner.location.coordinates[1], nearestDbPartner.location.coordinates[0])
          };
        } else {
          console.log(`[Matching] Nearest partner ${nearestDbPartner._id} is online in DB but has no active socket connection.`);
        }
      } else {
        // Log all active in-memory partners to see if anyone is connected but not matched in DB
        console.log(`[Matching] Active socket partners online:`, Object.keys(activePartners));
      }
    } catch (err) {
      console.error('Geo matching error:', err);
    }

    if (closestPartner) {
      console.log(`>> Professional found: Partner ${closestPartner.partnerId} at ${closestPartner.distance.toFixed(2)} km. Emitting booking request...`);
      
      activeJobs[activeJobId].assignedPartner = closestPartner.partnerId;

      io.to(closestPartner.socketId).emit('new_job_broadcast', {
        jobId: activeJobId,
        problemDescription,
        customerName,
        estimatedPrice,
        distance: parseFloat(closestPartner.distance.toFixed(1)),
        lat,
        lng,
        fullAddress: fullAddress || '',
        houseNo: houseNo || '',
        streetAddress: streetAddress || '',
        landmark: landmark || ''
      });

      socket.emit('booking_status_update', {
        jobId: activeJobId,
        status: 'broadcasted',
        message: 'Looking for professionals in your area...'
      });
    } else {
      console.log(`>> No partner found in range for category: ${category}`);
      socket.emit('booking_status_update', {
        jobId: activeJobId,
        status: 'no_partners',
        message: 'No professionals are currently online near you.'
      });
    }
  });

  socket.on('accept_job', async (data) => {
    const { jobId, partnerId } = data;
    
    // Authorization Check
    if (socket.userType !== 'partner' || socket.userId !== partnerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'accept_job' for partnerId ${partnerId} but is authenticated as ${socket.userId}.`);
      return;
    }

    console.log(`Partner ${partnerId} accepted Job ${jobId}`);

    if (activeJobs[jobId]) {
      const job = activeJobs[jobId];
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
        return;
      }

      // Retrieve details from DB securely
      let partnerDetails = {
        name: 'Professional Partner',
        phone: 'Hidden',
        rating: 5.0,
        experience: 1
      };

      try {
        const { data: pDb, error: pError } = await supabase
          .from('partners')
          .select('*')
          .eq('id', partnerId)
          .maybeSingle();
        if (pError) throw pError;
        if (pDb) {
          partnerDetails = {
            name: pDb.name,
            phone: pDb.phone,
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
        delete activeJobs[jobId];
      }
    }
  });

  socket.on('complete_job', async (data) => {
    const { jobId, partnerId } = data;
    
    // Authorization Check
    if (socket.userType !== 'partner' || socket.userId !== partnerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'complete_job' for partnerId ${partnerId} but is authenticated as ${socket.userId}.`);
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

      job.status = 'completed';

      try {
        const { error: updateError } = await supabase
          .from('job_requests')
          .update({ 
            status: 'completed',
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

      delete activeJobs[jobId];
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
