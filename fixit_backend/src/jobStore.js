// In-memory reliable store for active jobs and completed job history
const activePartners = {};
const activeJobs = {};
const completedJobs = []; // Array of completed / cancelled jobs (keeps last 500)
const customerSockets = {};

function normalizePhoneVariants(phone) {
  if (!phone) return [];
  const clean = phone.toString().replace(/[^0-9]/g, '');
  const variants = new Set();
  variants.add(phone.toString());
  if (clean) variants.add(clean);
  if (clean.length === 10) {
    variants.add('+91' + clean);
    variants.add('91' + clean);
  } else if (clean.length === 12 && clean.startsWith('91')) {
    variants.add('+' + clean);
    variants.add(clean.substring(2));
  }
  return Array.from(variants);
}

function recordJob(job) {
  if (!job || !job.jobId) return;
  activeJobs[job.jobId] = {
    ...job,
    updatedAt: new Date().toISOString(),
    createdAt: job.createdAt || new Date().toISOString()
  };
}

function updateJob(jobId, updates) {
  if (!jobId || !activeJobs[jobId]) return null;
  activeJobs[jobId] = {
    ...activeJobs[jobId],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  return activeJobs[jobId];
}

function completeJob(jobId, updates = {}) {
  const existing = activeJobs[jobId];
  const finishedJob = {
    ...(existing || {}),
    ...updates,
    jobId,
    id: jobId,
    _id: jobId,
    status: updates.status || 'completed',
    completedAt: updates.completedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: (existing && existing.createdAt) || new Date().toISOString()
  };

  // Add to completedJobs (prepend newest first)
  const existingIdx = completedJobs.findIndex(j => (j.id || j.jobId) === jobId);
  if (existingIdx >= 0) {
    completedJobs[existingIdx] = finishedJob;
  } else {
    completedJobs.unshift(finishedJob);
    if (completedJobs.length > 500) {
      completedJobs.pop();
    }
  }

  // Remove from activeJobs
  delete activeJobs[jobId];
  return finishedJob;
}

function getCustomerMemoryBookings(phone) {
  const variants = normalizePhoneVariants(phone);
  const matched = [];
  const seenIds = new Set();

  // 1. Active jobs
  for (const jid in activeJobs) {
    const job = activeJobs[jid];
    if (variants.some(v => v === job.customerId || v === job.customerPhone)) {
      if (!seenIds.has(job.jobId)) {
        seenIds.add(job.jobId);
        matched.push(formatMemoryJobForCustomer(job));
      }
    }
  }

  // 2. Completed / cancelled jobs
  for (const job of completedJobs) {
    const cId = job.customerId || job.customer_id || job.customerPhone;
    if (variants.some(v => v === cId)) {
      const id = job.id || job.jobId || job._id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        matched.push(formatMemoryJobForCustomer(job));
      }
    }
  }

  return matched;
}

function getPartnerMemoryJobs(partnerId) {
  const variants = normalizePhoneVariants(partnerId);
  const matched = [];
  const seenIds = new Set();

  // 1. Active jobs assigned to this partner
  for (const jid in activeJobs) {
    const job = activeJobs[jid];
    if (variants.some(v => v === job.assignedPartner)) {
      if (!seenIds.has(job.jobId)) {
        seenIds.add(job.jobId);
        matched.push(formatMemoryJobForPartner(job));
      }
    }
  }

  // 2. Completed jobs
  for (const job of completedJobs) {
    const pId = job.assignedPartner || job.assigned_partner || job.partnerId;
    if (variants.some(v => v === pId)) {
      const id = job.id || job.jobId || job._id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        matched.push(formatMemoryJobForPartner(job));
      }
    }
  }

  return matched;
}

function formatMemoryJobForCustomer(job) {
  const id = job.id || job.jobId || job._id;
  return {
    _id: id,
    id: id,
    customerId: job.customerId || job.customer_id,
    customer_id: job.customerId || job.customer_id,
    problemDescription: job.problemDescription || job.problem_description || 'Home Service',
    problem_description: job.problemDescription || job.problem_description || 'Home Service',
    estimatedPrice: Number(job.estimatedPrice || job.estimated_price || 0),
    estimated_price: Number(job.estimatedPrice || job.estimated_price || 0),
    status: job.status || 'pending',
    assignedPartner: job.assignedPartner || job.assigned_partner || null,
    assigned_partner: job.assignedPartner || job.assigned_partner || null,
    paymentMethod: job.paymentMethod || job.payment_method || 'COD',
    payment_method: job.paymentMethod || job.payment_method || 'COD',
    customerLocation: {
      type: 'Point',
      coordinates: [
        Number(job.customerLocationLng || job.customer_location_lng || job.lng || 0),
        Number(job.customerLocationLat || job.customer_location_lat || job.lat || 0)
      ]
    },
    customer_location_lat: Number(job.customerLocationLat || job.customer_location_lat || job.lat || 0),
    customer_location_lng: Number(job.customerLocationLng || job.customer_location_lng || job.lng || 0),
    full_address: job.fullAddress || job.full_address || '',
    house_no: job.houseNo || job.house_no || '',
    street_address: job.streetAddress || job.street_address || '',
    landmark: job.landmark || '',
    alternate_phone: job.altPhone || job.alternate_phone || '',
    address_type: job.addressType || job.address_type || 'Home',
    partner: job.partner || null,
    createdAt: job.createdAt || job.created_at || new Date().toISOString(),
    created_at: job.createdAt || job.created_at || new Date().toISOString(),
    completedAt: job.completedAt || job.completed_at || null,
    completed_at: job.completedAt || job.completed_at || null
  };
}

function formatMemoryJobForPartner(j) {
  const id = j.id || j.jobId || j._id;
  const createdAt = j.createdAt || j.created_at || new Date().toISOString();
  return {
    id: id,
    _id: id,
    customerName: j.customerName || (j.customer && j.customer.name) || (j.customers && j.customers.name) || 'Valued Customer',
    problemDescription: j.problemDescription || j.problem_description || 'Service Request',
    amount: Number(j.estimatedPrice || j.estimated_price || j.amount || 0),
    date: new Date(createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: new Date(createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    address: j.fullAddress || j.full_address || (j.house_no ? `${j.house_no}, ${j.street_address}` : 'Customer Location'),
    paymentMethod: j.paymentMethod || j.payment_method || 'COD',
    status: j.status || 'completed',
    lat: Number(j.customerLocationLat || j.customer_location_lat || j.lat || 0),
    lng: Number(j.customerLocationLng || j.customer_location_lng || j.lng || 0)
  };
}

module.exports = {
  activePartners,
  activeJobs,
  completedJobs,
  customerSockets,
  normalizePhoneVariants,
  recordJob,
  updateJob,
  completeJob,
  getCustomerMemoryBookings,
  getPartnerMemoryJobs,
  formatMemoryJobForCustomer,
  formatMemoryJobForPartner
};
