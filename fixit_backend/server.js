const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dbHelper = require('./db_helper');
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
mongoose.connection.on('error', err => {
  console.error('Mongoose connection error:', err);
  lastDbError = err.message || err.toString();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixit_partner')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    lastDbError = err.message || err.toString();
  });

// Routes
const authRoutes = require('./routes/auth');
const partnerRoutes = require('./routes/partner');

app.use('/api/auth', authRoutes);
app.use('/api/partner', partnerRoutes);

app.get('/', (req, res) => res.send('FixIt Secure Backend Running.'));

app.get('/api/db-status', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  
  const uri = process.env.MONGODB_URI || '';
  const match = uri.match(/\/\/([^:]+):/);
  const username = match ? match[1] : 'unknown';

  res.json({
    readyState: state,
    status: states[state] || 'unknown',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    username: username,
    uri: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/.*@/, '//****@') : 'using default localhost',
    error: lastDbError
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
    
    socket.join('online_partners');
  });

  socket.on('go_offline', (data) => {
    const { partnerId } = data;
    
    // Authorization Check
    if (socket.userType !== 'partner' || socket.userId !== partnerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'go_offline' for partnerId ${partnerId} but is authenticated as ${socket.userId}.`);
      return;
    }

    console.log(`Partner ${partnerId} offline`);
    delete activePartners[partnerId];
  });

  // Client requests a service professional
  socket.on('request_job', async (data) => {
    const { customerId, customerName, problemDescription, category, paymentMethod = 'COD', estimatedPrice, lat, lng } = data;
    
    // Authorization Check
    if (socket.userType !== 'customer' || socket.userId !== customerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'request_job' for customerId ${customerId} but is authenticated as ${socket.userId}.`);
      return;
    }

    console.log(`[Job Request] Customer ${customerName} (${customerId}) requested ${category} for ₹${estimatedPrice} [Payment: ${paymentMethod}] - "${problemDescription}"`);

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
      createdAt: new Date()
    };

    activeJobs[newJob.jobId] = newJob;
    customerSockets[customerId] = socket.id;

    // Save to Mongoose strictly
    try {
      const JobRequest = require('./models/JobRequest');
      const dbJob = new JobRequest({
        customerId,
        problemDescription,
        estimatedPrice,
        paymentMethod,
        status: 'pending',
        customerLocation: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });
      const savedJob = await dbJob.save();
      
      // Re-key in-memory registry with real MongoDB ID
      newJob.jobId = savedJob._id.toString();
      activeJobs[savedJob._id.toString()] = newJob;
      delete activeJobs[newJob.jobId];
      console.log(`JobRequest persisted in MongoDB with ID: ${savedJob._id}`);
    } catch (err) {
      console.error('Failed to persist JobRequest to MongoDB:', err);
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
      console.log('[Matching] Performing MongoDB 2dsphere geo-spatial query...');
      // Query partners within standard 3km limit (3000m)
      const dbPartners = await dbHelper.findNearestOnlinePartners(lat, lng, category, 3000);
      if (dbPartners && dbPartners.length > 0) {
        const nearestDbPartner = dbPartners[0];
        // Find their active socket connection information
        const partnerSocketInfo = activePartners[nearestDbPartner._id.toString()];
        if (partnerSocketInfo) {
          closestPartner = {
            partnerId: nearestDbPartner._id.toString(),
            socketId: partnerSocketInfo.socketId,
            distance: getDistanceKm(lat, lng, nearestDbPartner.location.coordinates[1], nearestDbPartner.location.coordinates[0])
          };
        }
      }
    } catch (err) {
      console.error('Geo matching MongoDB error:', err);
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
        lng
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
        const JobRequest = require('./models/JobRequest');
        await JobRequest.findByIdAndUpdate(jobId, { 
          status: 'accepted',
          assignedPartner: partnerId
        });
      } catch (err) {
        console.error('MongoDB accept_job error:', err);
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
        const Partner = require('./models/Partner');
        const pDb = await Partner.findById(partnerId);
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

  socket.on('update_location', (data) => {
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
    
    // Authorization Check
    if (socket.userType !== 'partner' || socket.userId !== partnerId) {
      console.error(`[Security Violation] Socket ${socket.id} attempted 'update_job_status' for partnerId ${partnerId} but is authenticated as ${socket.userId}.`);
      return;
    }

    console.log(`[Job ${jobId}] Status advanced to: ${status}`);

    if (activeJobs[jobId]) {
      const job = activeJobs[jobId];
      
      // Ownership check: partner must be the one assigned
      if (job.assignedPartner !== partnerId) {
        console.error(`[Security Violation] Partner ${partnerId} attempted status update on unassigned job ${jobId}. Assigned: ${job.assignedPartner}`);
        return;
      }

      job.status = status;

      try {
        const JobRequest = require('./models/JobRequest');
        await JobRequest.findByIdAndUpdate(jobId, { status });
      } catch (err) {
        console.error('MongoDB update_job_status error:', err);
      }

      const customerSocketId = customerSockets[job.customerId];
      if (customerSocketId) {
        io.to(customerSocketId).emit('booking_status_update', {
          jobId,
          status,
          message: `Professional status: ${status}`
        });
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
        const JobRequest = require('./models/JobRequest');
        await JobRequest.findByIdAndUpdate(jobId, { 
          status: 'completed',
          completedAt: new Date()
        });
      } catch (err) {
        console.error('MongoDB complete_job status update error:', err);
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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const pid in activePartners) {
      if (activePartners[pid].socketId === socket.id) {
        console.log(`Partner ${pid} automatically removed on disconnect`);
        delete activePartners[pid];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
