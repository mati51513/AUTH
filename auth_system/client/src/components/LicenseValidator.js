import React, { useState } from 'react';
import axios from 'axios';
import { getValidatedTime, validateTimestamp } from '../utils/timeValidator';

const LicenseValidator = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateLicense = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // First validate client time with server
      const validatedTime = await getValidatedTime();
      
      // Proceed with license validation
      const response = await axios.post('/api/license/validate', {
        key: licenseKey,
        clientTime: validatedTime.toISOString()
      });
      
      setValidationResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during validation');
      setValidationResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="license-validator">
      <h2>License Key Validation</h2>
      <form onSubmit={validateLicense}>
        <div className="form-group">
          <label htmlFor="licenseKey">License Key</label>
          <input
            type="text"
            id="licenseKey"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="Enter your license key"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Validating...' : 'Validate License'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {validationResult && (
        <div className={`validation-result ${validationResult.valid ? 'valid' : 'invalid'}`}>
          <h3>Validation Result</h3>
          <p>Status: {validationResult.valid ? 'Valid' : 'Invalid'}</p>
          {validationResult.message && <p>Message: {validationResult.message}</p>}
          {validationResult.expiresAt && (
            <p>Expires: {new Date(validationResult.expiresAt).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LicenseValidator;