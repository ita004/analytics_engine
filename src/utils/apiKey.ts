import crypto from 'crypto';

/**
 * Generates a cryptographically secure API key
 * @param length - Length of the API key (default: 32)
 * @returns A random API key string
 */
export const generateApiKey = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hashes an API key for secure storage
 * @param apiKey - The API key to hash
 * @returns Hashed API key
 */
export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Generates an expiry date for API key
 * @param days - Number of days until expiry (default: 365)
 * @returns Date object representing expiry time
 */
export const generateExpiryDate = (days: number = 365): Date => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};

/**
 * Validates API key format
 * @param apiKey - The API key to validate
 * @returns Boolean indicating if format is valid
 */
export const isValidApiKeyFormat = (apiKey: string): boolean => {
  return /^[a-f0-9]{64}$/.test(apiKey);
};
