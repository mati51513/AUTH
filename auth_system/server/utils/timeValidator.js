const axios = require('axios');
const crypto = require('crypto');

/**
 * Time validation utility to prevent time manipulation
 * Uses multiple strategies to ensure accurate time validation
 */

// Store last known valid server time
let lastKnownValidTime = Date.now();
let lastTimeCheck = Date.now();

// Time servers for NTP-like validation
const TIME_SERVERS = [
  'https://worldtimeapi.org/api/ip',
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC'
];

/**
 * Get current server time with validation
 * @returns {Object} Time validation result
 */
const getValidatedTime = async () => {
  const currentTime = Date.now();
  
  // Only check external time every 15 minutes to avoid excessive API calls
  if (currentTime - lastTimeCheck > 15 * 60 * 1000) {
    try {
      const externalTime = await getExternalTime();
      
      // If time difference is more than 5 minutes, something might be wrong
      const timeDiff = Math.abs(currentTime - externalTime);
      if (timeDiff > 5 * 60 * 1000) {
        return {
          valid: false,
          serverTime: externalTime,
          clientTime: currentTime,
          timeDiff,
          message: 'System time appears to be manipulated'
        };
      }
      
      // Update last known valid time
      lastKnownValidTime = externalTime;
      lastTimeCheck = currentTime;
      
      return {
        valid: true,
        serverTime: externalTime,
        clientTime: currentTime,
        timeDiff
      };
    } catch (error) {
      console.error('Error validating time:', error);
      
      // If we can't validate with external time, use last known valid time
      // with a drift allowance
      const maxAllowedDrift = 10 * 60 * 1000; // 10 minutes
      const timeSinceLastCheck = currentTime - lastTimeCheck;
      
      if (timeSinceLastCheck > maxAllowedDrift) {
        return {
          valid: false,
          serverTime: lastKnownValidTime + timeSinceLastCheck,
          clientTime: currentTime,
          message: 'Unable to validate time with external sources'
        };
      }
      
      return {
        valid: true,
        serverTime: lastKnownValidTime + timeSinceLastCheck,
        clientTime: currentTime,
        usingFallback: true
      };
    }
  }
  
  // Use cached time with drift calculation
  const estimatedServerTime = lastKnownValidTime + (currentTime - lastTimeCheck);
  
  return {
    valid: true,
    serverTime: estimatedServerTime,
    clientTime: currentTime,
    usingCached: true
  };
};

/**
 * Get time from external time servers
 * @returns {Number} External timestamp in milliseconds
 */
const getExternalTime = async () => {
  // Try each time server until one succeeds
  for (const server of TIME_SERVERS) {
    try {
      const response = await axios.get(server);
      
      // Handle different API response formats
      if (response.data.unixtime) {
        // worldtimeapi.org format
        return response.data.unixtime * 1000;
      } else if (response.data.dateTime) {
        // timeapi.io format
        return new Date(response.data.dateTime).getTime();
      }
    } catch (error) {
      console.error(`Error fetching time from ${server}:`, error.message);
      // Continue to next server
    }
  }
  
  // If all servers fail, throw error
  throw new Error('Failed to get time from any external time server');
};

/**
 * Create a time-based token that expires
 * @param {String} data - Data to include in token
 * @param {Number} expiresIn - Expiration time in seconds
 * @returns {Object} Token object with value and expiration
 */
const createTimeToken = async (data, expiresIn = 3600) => {
  const { serverTime } = await getValidatedTime();
  
  const payload = {
    data,
    iat: Math.floor(serverTime / 1000),
    exp: Math.floor(serverTime / 1000) + expiresIn
  };
  
  const token = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret')
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return {
    token,
    payload,
    expires: new Date(payload.exp * 1000)
  };
};

/**
 * Verify a time-based token
 * @param {String} token - Token to verify
 * @param {Object} payload - Token payload
 * @returns {Boolean} Whether token is valid
 */
const verifyTimeToken = async (token, payload) => {
  const { serverTime } = await getValidatedTime();
  
  // Check if token has expired
  if (payload.exp < Math.floor(serverTime / 1000)) {
    return false;
  }
  
  // Verify token signature
  const expectedToken = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret')
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return token === expectedToken;
};

module.exports = {
  getValidatedTime,
  createTimeToken,
  verifyTimeToken
};