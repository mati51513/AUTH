const crypto = require('crypto');

/**
 * Generates a secure license key in required format:
 * Total length: 32 characters, starts with "bcwtf" then 27 safe chars.
 * Safe charset excludes 0,1,I,O to avoid confusion.
 */
const generateLicenseKey = () => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 27; i++) {
    const idx = crypto.randomInt(0, charset.length);
    suffix += charset[idx];
  }
  return `bcwtf${suffix}`;
};

/**
 * Generates a secure license key with custom pattern
 * Allows for more complex patterns with mixed character sets
 */
const generateCustomKey = () => {
  // Character sets for different parts of the key
  const charSets = {
    uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ', // Removed confusing I and O
    lowercase: 'abcdefghijkmnopqrstuvwxyz', // Removed confusing l
    numbers: '23456789', // Removed confusing 0 and 1
    special: '#$%&@'
  };
  
  // Define pattern for each segment (8 segments of 4 chars)
  // Each segment uses a different pattern for added security
  const patterns = [
    'UUNN', // 2 uppercase + 2 numbers
    'NNUU', // 2 numbers + 2 uppercase
    'ULUL', // Alternating uppercase and lowercase
    'NULN', // Number, uppercase, lowercase, number
    'UUUU', // All uppercase
    'NNNN', // All numbers
    'ULNS', // Uppercase, lowercase, number, special
    'SULN'  // Special, uppercase, lowercase, number
  ];
  
  // Generate key based on patterns
  const segments = patterns.map(pattern => {
    return pattern.split('').map(charType => {
      const set = charType === 'U' ? charSets.uppercase :
                 charType === 'L' ? charSets.lowercase :
                 charType === 'N' ? charSets.numbers :
                 charSets.special;
      
      const randomIndex = crypto.randomInt(0, set.length);
      return set[randomIndex];
    }).join('');
  });
  
  // Join segments with hyphens
  return segments.join('-');
};

/**
 * Validates a license key format
 * @param {string} key - The license key to validate
 * @returns {boolean} - Whether the key format is valid
 */
const validateKeyFormat = (key) => {
  // Format: bcwtf followed by 27 uppercase alphanumerics (no hyphens)
  const regex = /^bcwtf[A-Z0-9]{27}$/;
  return regex.test(key);
};

/**
 * Generates a checksum for a license key to prevent tampering
 * @param {string} key - The license key without checksum
 * @returns {string} - Two character checksum
 */
const generateChecksum = (key) => {
  const keyWithoutHyphens = key.replace(/-/g, '');
  const hash = crypto.createHash('sha256').update(keyWithoutHyphens).digest('hex');
  return hash.substring(0, 2).toUpperCase();
};

module.exports = {
  generateLicenseKey,
  generateCustomKey,
  validateKeyFormat,
  generateChecksum
};
