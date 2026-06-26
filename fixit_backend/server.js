const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dbHelper = require('./db_helper');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixit_partner')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
const authRoutes = require('./routes/auth');
const partnerRoutes = require('./routes/partner');

app.use('/api/auth', authRoutes);
app.use('/api/partner', partnerRoutes);

app.get('/', (req, res) => res.send('FixIt Backend Running.'));

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

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('go_online', (data) => {
    const { partnerId, lat, lng, membershipTier = 'basic', serviceCategory } = data;
    console.log(`Partner ${partnerId} (${membershipTier}) [${serviceCategory || 'No Category'}] online at: ${lat}, ${lng}`);
    
    activePartners[partnerId] = {
      socketId: socket.id,
      lat: lat || 28.6139,
      lng: lng || 77.2090,
      membershipTier,
      serviceCategory
    };
    
    socket.join('online_partners');

    // MOCK: Emit filtered job requests after 5 seconds to test the range logic!
    if (process.env.ENABLE_MOCK_JOBS === 'true') {
      setTimeout(() => {
        // Check if partner is still online and has same socket connection
        if (!activePartners[partnerId] || activePartners[partnerId].socketId !== socket.id) return;
  
        const partner = activePartners[partnerId];
        const pLat = partner.lat;
        const pLng = partner.lng;
  
        // Define three mock jobs at increasing offsets from partner's actual position
        const simulatedJobs = [
          {
            jobId: 'job_basic_1.8km',
            problemDescription: 'AC is leaking water',
            customerName: 'Aisha Y.',
            estimatedPrice: 600,
            lat: pLat + 0.012,
            lng: pLng + 0.012
          },
          {
            jobId: 'job_silver_4.0km',
            problemDescription: 'Ceiling fan replacement',
            customerName: 'Rohan M.',
            estimatedPrice: 400,
            lat: pLat + 0.027,
            lng: pLng + 0.027
          },
          {
            jobId: 'job_gold_6.2km',
            problemDescription: 'Full house painting inspection',
            customerName: 'Vikram S.',
            estimatedPrice: 1200,
            lat: pLat + 0.042,
            lng: pLng + 0.042
          }
        ];
  
        // Service range based on membership tier
        let maxRangeKm = 3.0;
        /* FUTURE UPDATE:
        if (partner.membershipTier === 'silver') maxRangeKm = 5.0;
        if (partner.membershipTier === 'gold') maxRangeKm = 7.5;
        */
  
        console.log(`Matching jobs for partner ${partnerId} (${partner.membershipTier}). Max range threshold: ${maxRangeKm} km`);
  
        simulatedJobs.forEach((job) => {
          const dist = getDistanceKm(pLat, pLng, job.lat, job.lng);
          console.log(`Job ${job.jobId} is at distance ${dist.toFixed(2)} km from partner`);
  
          if (dist <= maxRangeKm) {
            console.log(`>> Dispatching Job ${job.jobId} (within ${maxRangeKm} km range)`);
            io.to(socket.id).emit('new_job_broadcast', {
              jobId: job.jobId,
              problemDescription: job.problemDescription,
              customerName: job.customerName,
              estimatedPrice: job.estimatedPrice,
              distance: parseFloat(dist.toFixed(1)),
              lat: job.lat,
              lng: job.lng
            });
          } else {
            console.log(`>> Filtering out Job ${job.jobId} (outside ${maxRangeKm} km range)`);
          }
        });
      }, 5000);
    }
  });

  socket.on('go_offline', (data) => {
    const { partnerId } = data;
    console.log(`Partner ${partnerId} offline`);
    delete activePartners[partnerId];
  });

  // Client requests a service professional
  socket.on('request_job', async (data) => {
    const { customerId, customerName, problemDescription, category, estimatedPrice, lat, lng } = data;
    console.log(`[Job Request] Customer ${customerName} requested ${category} for ₹${estimatedPrice} - "${problemDescription}"`);

    const tempJobId = 'job_' + Math.random().toString(36).substr(2, 9);
    const newJob = {
      jobId: tempJobId,
      customerId,
      customerName,
      problemDescription,
      category,
      estimatedPrice,
      status: 'pending',
      assignedPartner: null,
      lat,
      lng,
      createdAt: new Date()
    };

    activeJobs[tempJobId] = newJob;
    customerSockets[customerId] = socket.id;

    // Save to Mongoose if MongoDB is active
    if (mongoose.connection.readyState === 1) {
      try {
        const JobRequest = require('./models/JobRequest');
        const dbJob = new JobRequest({
          customerId,
          problemDescription,
          estimatedPrice,
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
        delete activeJobs[tempJobId];
        console.log(`JobRequest persisted in MongoDB with ID: ${savedJob._id}`);
      } catch (err) {
        console.error('Failed to persist JobRequest to MongoDB:', err);
      }
    }

    const activeJobId = newJob.jobId;

    // Run matching algorithm to locate closest online partner of matching serviceCategory
    let closestPartner = null;
    let minDistance = Infinity;

    if (dbHelper.isDbConnected()) {
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
    }

    // Fallback if database is disconnected or no active socket match was found in MongoDB
    if (!closestPartner) {
      console.log('[Matching] Falling back to active memory matching registry...');
      for (const pid in activePartners) {
        const partner = activePartners[pid];
        
        if (partner.serviceCategory === category || !partner.serviceCategory) {
          const dist = getDistanceKm(lat, lng, partner.lat, partner.lng);
          
          let maxRangeKm = 3.0;
          /* FUTURE UPDATE:
          if (partner.membershipTier === 'silver') maxRangeKm = 5.0;
          if (partner.membershipTier === 'gold') maxRangeKm = 7.5;
          */

          console.log(`Checking matching partner ${pid} (${partner.membershipTier || 'basic'}): distance ${dist.toFixed(2)} km`);

          if (dist <= maxRangeKm && dist < minDistance) {
            minDistance = dist;
            closestPartner = {
              partnerId: pid,
              socketId: partner.socketId,
              distance: dist
            };
          }
        }
      }
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
    console.log(`Partner ${partnerId} accepted Job ${jobId}`);

    if (activeJobs[jobId]) {
      const job = activeJobs[jobId];
      job.status = 'accepted';
      job.assignedPartner = partnerId;

      if (mongoose.connection.readyState === 1) {
        try {
          const JobRequest = require('./models/JobRequest');
          await JobRequest.findByIdAndUpdate(jobId, { 
            status: 'accepted',
            assignedPartner: partnerId
          });
        } catch (err) {
          console.error('MongoDB accept_job error:', err);
        }
      }

      // Send partner details back to user app
      let partnerDetails = {
        name: 'John Doe',
        phone: '9876543210',
        rating: 4.8,
        experience: 5
      };

      if (activePartners[partnerId]) {
        // Retrieve details from memory fallback if needed
        const p = activePartners[partnerId];
        partnerDetails = {
          name: p.name || 'John Doe',
          phone: p.phone || '9876543210',
          rating: p.rating || 4.8,
          experience: p.experience || 5
        };
      } else {
        // Query DB for partner details
        try {
          const Partner = require('./models/Partner');
          const pDb = await Partner.findById(partnerId);
          if (pDb) {
            partnerDetails = {
              name: pDb.name,
              phone: pDb.phone,
              rating: pDb.rating,
              experience: pDb.experience
            };
          }
        } catch (err) {
          console.error(err);
        }
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
    console.log(`[Job ${jobId}] Status advanced to: ${status}`);

    if (activeJobs[jobId]) {
      activeJobs[jobId].status = status;

      if (mongoose.connection.readyState === 1) {
        try {
          const JobRequest = require('./models/JobRequest');
          await JobRequest.findByIdAndUpdate(jobId, { status });
        } catch (err) {
          console.error('MongoDB update_job_status error:', err);
        }
      }

      const job = activeJobs[jobId];
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
    console.log(`Job ${jobId} completed by partner ${partnerId}`);

    if (activeJobs[jobId]) {
      const job = activeJobs[jobId];
      job.status = 'completed';

      if (mongoose.connection.readyState === 1) {
        try {
          const JobRequest = require('./models/JobRequest');
          await JobRequest.findByIdAndUpdate(jobId, { 
            status: 'completed',
            completedAt: new Date()
          });
        } catch (err) {
          console.error('MongoDB complete_job status update error:', err);
        }
      }

      try {
        const gross = job.estimatedPrice || 0;
        const commission = Math.round(gross * 0.2);
        const net = gross - commission;

        // Save gross earning transaction
        await dbHelper.createTransaction({
          partnerId,
          jobId,
          type: 'earning',
          amount: gross,
          description: `${job.category || 'Service'} Job completed`
        });

        // Save platform commission transaction
        await dbHelper.createTransaction({
          partnerId,
          jobId,
          type: 'commission_deduction',
          amount: -commission,
          description: 'Platform Commission (20%)'
        });

        // Update partner's walletBalance & jobsCompleted
        const partner = await dbHelper.findPartnerById(partnerId);
        if (partner) {
          const newBalance = (partner.walletBalance || 0) + net;
          await dbHelper.updatePartnerById(partnerId, {
            walletBalance: newBalance,
            jobsCompleted: (partner.jobsCompleted || 0) + 1
          });
          console.log(`Updated Partner ${partnerId} wallet balance to ₹${newBalance}`);
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
