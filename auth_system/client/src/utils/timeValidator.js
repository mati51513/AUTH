import axios from 'axios';

// Time validation constants
const MAX_TIME_DRIFT_MS = 5 * 60 * 1000; // 5 minutes
const TIME_CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Cache for server time
let serverTimeCache = {
  timestamp: null,
  offset: 0,
  lastUpdated: null
};

/**
 * Get validated time that checks against server time
 * @returns {Promise<Date>} Validated time
 */
export const getValidatedTime = async () => {
  const now = new Date();
  
  // If we have a recent cache, use it
  if (serverTimeCache.lastUpdated && 
      (now.getTime() - serverTimeCache.lastUpdated) < TIME_CACHE_DURATION_MS) {
    return new Date(now.getTime() + serverTimeCache.offset);
  }
  
  try {
    // Request server time validation
    const response = await axios.get('/api/time/validate');
    
    if (response.data.success) {
      const serverTime = new Date(response.data.serverTime);
      const clientTime = new Date();
      const offset = serverTime.getTime() - clientTime.getTime();
      
      // Update cache
      serverTimeCache = {
        timestamp: serverTime,
        offset: offset,
        lastUpdated: clientTime.getTime()
      };
      
      // Check if time drift is too large
      if (Math.abs(offset) > MAX_TIME_DRIFT_MS) {
        console.warn('System time appears to be incorrect. Using server time instead.');
      }
      
      return serverTime;
    }
  } catch (error) {
    console.error('Failed to validate time with server:', error);
  }
  
  // Fallback to client time if server validation fails
  return now;
};

/**
 * Validate a timestamp against server time
 * @param {Date|number} timestamp - Timestamp to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxDrift - Maximum allowed drift in milliseconds
 * @returns {Promise<boolean>} Whether timestamp is valid
 */
export const validateTimestamp = async (timestamp, options = {}) => {
  const maxDrift = options.maxDrift || MAX_TIME_DRIFT_MS;
  const serverTime = await getValidatedTime();
  
  const timestampMs = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const drift = Math.abs(serverTime.getTime() - timestampMs);
  
  return drift <= maxDrift;
};

export default {
  getValidatedTime,
  validateTimestamp
};