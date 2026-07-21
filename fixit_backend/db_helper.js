const crypto = require('crypto');
const supabase = require('./src/config/supabase');

// Key derivation from JWT_SECRET to ensure 32-byte key for AES-256-CBC
const ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret_longer_key_needed_32', 'salt', 32);
const IV_LENGTH = 16;

function encryptText(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptText(text) {
  if (!text || !text.includes(':')) return text;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

const isDbConnected = () => {
  // Returns true if Supabase URL and Key are initialized
  return !!supabase.supabaseUrl && !!supabase.supabaseKey;
};

const enforceDbConnection = () => {
  if (!isDbConnected()) {
    throw new Error('Database connection is not active. Operation rejected for security and consistency.');
  }
};

const findPartnerByPhone = async (phone) => {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    console.error('Error finding partner by phone:', error.message);
    throw error;
  }
  return decryptPartnerData(data);
};

const createPartner = async (partnerData) => {
  const dataToInsert = {
    phone: partnerData.phone,
    kyc_verified: partnerData.kycVerified || false,
    membership_tier: partnerData.membershipTier || 'basic'
  };
  
  if (partnerData.documents && partnerData.documents.idProof) {
    dataToInsert.id_proof = encryptText(partnerData.documents.idProof);
  }
  if (partnerData.bankDetails && partnerData.bankDetails.accountNumber) {
    dataToInsert.bank_account_number = encryptText(partnerData.bankDetails.accountNumber);
  }

  const { data, error } = await supabase
    .from('partners')
    .insert(dataToInsert)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating partner:', error.message);
    throw error;
  }
  return decryptPartnerData(data);
};

const findPartnerById = async (id) => {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('phone', id)
    .maybeSingle();

  if (error) {
    console.error('Error finding partner by id:', error.message);
    throw error;
  }
  return decryptPartnerData(data);
};

const updatePartnerById = async (id, updateData) => {
  const dataToUpdate = {};
  
  if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
  if (updateData.serviceCategory !== undefined) dataToUpdate.service_category = updateData.serviceCategory;
  if (updateData.experience !== undefined) dataToUpdate.experience = Number(updateData.experience);
  if (updateData.serviceArea !== undefined) dataToUpdate.service_area = updateData.serviceArea;
  if (updateData.profilePhoto !== undefined) dataToUpdate.profile_photo = updateData.profilePhoto;
  
  if (updateData.documents) {
    if (updateData.documents.idProof !== undefined) dataToUpdate.id_proof = encryptText(updateData.documents.idProof);
    if (updateData.documents.skillCertificate !== undefined) dataToUpdate.skill_certificate = updateData.documents.skillCertificate;
  }
  if (updateData.bankDetails) {
    if (updateData.bankDetails.accountNumber !== undefined) dataToUpdate.bank_account_number = encryptText(updateData.bankDetails.accountNumber);
    if (updateData.bankDetails.ifsc !== undefined) dataToUpdate.bank_ifsc = updateData.bankDetails.ifsc;
  }
  if (updateData.rating !== undefined) dataToUpdate.rating = Number(updateData.rating);
  if (updateData.jobsCompleted !== undefined) dataToUpdate.jobs_completed = Number(updateData.jobsCompleted);
  if (updateData.walletBalance !== undefined) dataToUpdate.wallet_balance = Number(updateData.walletBalance);
  if (updateData.isOnline !== undefined) dataToUpdate.is_online = updateData.isOnline;
  if (updateData.kycVerified !== undefined) dataToUpdate.kyc_verified = updateData.kycVerified;
  if (updateData.membershipTier !== undefined) dataToUpdate.membership_tier = updateData.membershipTier;
  
  if (updateData.location && updateData.location.coordinates) {
    dataToUpdate.location_lng = updateData.location.coordinates[0];
    dataToUpdate.location_lat = updateData.location.coordinates[1];
  }

  // Check if partner exists before updating
  const { data: existingPartner } = await supabase
    .from('partners')
    .select('phone')
    .eq('phone', id)
    .maybeSingle();

  let data, error;
  if (!existingPartner) {
    console.log(`[DB Helper] Partner ${id} not found in DB. Creating new partner record...`);
    const insertRes = await supabase
      .from('partners')
      .insert({
        phone: id,
        ...dataToUpdate
      })
      .select('*')
      .single();
    data = insertRes.data;
    error = insertRes.error;
  } else {
    const updateRes = await supabase
      .from('partners')
      .update(dataToUpdate)
      .eq('phone', id)
      .select('*')
      .single();
    data = updateRes.data;
    error = updateRes.error;
  }

  if (error) {
    console.error('Error updating or creating partner by id:', error.message);
    throw error;
  }
  return decryptPartnerData(data);
};

const findNearestOnlinePartners = async (lat, lng, category, maxDistanceMeters = 3000) => {
  const { data, error } = await supabase
    .rpc('find_nearest_online_partners', {
      p_lat: lat,
      p_lng: lng,
      p_category: category,
      p_max_distance_meters: maxDistanceMeters
    });

  if (error) {
    console.error('Error calling find_nearest_online_partners RPC:', error.message);
    throw error;
  }
  return (data || []).map(decryptPartnerData);
};

const createTransaction = async (transactionData) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      partner_id: transactionData.partnerId,
      job_id: transactionData.jobId,
      type: transactionData.type,
      amount: Number(transactionData.amount),
      description: transactionData.description
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating transaction:', error.message);
    throw error;
  }
  
  if (data) {
    data._id = data.id;
  }
  return data;
};

const getPartnerTransactions = async (partnerId) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching partner transactions:', error.message);
    throw error;
  }
  return (data || []).map(tx => {
    const txObj = { ...tx };
    txObj._id = txObj.id;
    txObj.partnerId = txObj.partner_id;
    txObj.jobId = txObj.job_id;
    txObj.createdAt = txObj.created_at;
    return txObj;
  });
};

// Helper function to decrypt partner sensitive data before returning to code
function decryptPartnerData(partner) {
  if (!partner) return null;
  
  const partnerObj = { ...partner };
  
  // Map PostgreSQL phone to _id and id for backend Mongoose compat
  if (partnerObj.phone) {
    partnerObj._id = partnerObj.phone;
    partnerObj.id = partnerObj.phone;
  }
  
  if (partnerObj.id_proof) {
    try {
      partnerObj.documents = partnerObj.documents || {};
      partnerObj.documents.idProof = decryptText(partnerObj.id_proof);
    } catch (e) {
      console.error('Failed to decrypt Aadhaar ID:', e.message);
    }
  }
  if (partnerObj.bank_account_number) {
    try {
      partnerObj.bankDetails = partnerObj.bankDetails || {};
      partnerObj.bankDetails.accountNumber = decryptText(partnerObj.bank_account_number);
    } catch (e) {
      console.error('Failed to decrypt bank account number:', e.message);
    }
  }

  // Map other PostgreSQL snake_case fields to JS camelCase
  if (partnerObj.service_category) partnerObj.serviceCategory = partnerObj.service_category;
  if (partnerObj.profile_photo) partnerObj.profilePhoto = partnerObj.profile_photo;
  if (partnerObj.service_area) partnerObj.serviceArea = partnerObj.service_area;
  if (partnerObj.bank_ifsc) {
    partnerObj.bankDetails = partnerObj.bankDetails || {};
    partnerObj.bankDetails.ifsc = partnerObj.bank_ifsc;
  }
  if (partnerObj.skill_certificate) {
    partnerObj.documents = partnerObj.documents || {};
    partnerObj.documents.skillCertificate = partnerObj.skill_certificate;
  }
  if (partnerObj.jobs_completed !== undefined) partnerObj.jobsCompleted = partnerObj.jobs_completed;
  if (partnerObj.wallet_balance !== undefined) partnerObj.walletBalance = partnerObj.wallet_balance;
  if (partnerObj.is_online !== undefined) partnerObj.isOnline = partnerObj.is_online;
  if (partnerObj.kyc_verified !== undefined) partnerObj.kycVerified = partnerObj.kyc_verified;
  if (partnerObj.membership_tier) partnerObj.membershipTier = partnerObj.membership_tier;
  if (partnerObj.location_lat !== undefined && partnerObj.location_lng !== undefined) {
    partnerObj.location = {
      type: 'Point',
      coordinates: [Number(partnerObj.location_lng), Number(partnerObj.location_lat)]
    };
  }
  
  return partnerObj;
}

module.exports = {
  isDbConnected,
  findPartnerByPhone,
  createPartner,
  findPartnerById,
  updatePartnerById,
  findNearestOnlinePartners,
  createTransaction,
  getPartnerTransactions,
  encryptText,
  decryptText
};
