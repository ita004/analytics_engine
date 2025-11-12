import { generateApiKey, isValidApiKeyFormat } from '../utils/apiKey';
import { parseUserAgent } from '../utils/userAgent';

describe('API Key Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate API key of correct length', () => {
      const apiKey = generateApiKey(32);
      expect(apiKey).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique API keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });

    it('should generate valid hex string', () => {
      const apiKey = generateApiKey();
      expect(/^[a-f0-9]+$/.test(apiKey)).toBe(true);
    });
  });

  describe('isValidApiKeyFormat', () => {
    it('should validate correct format', () => {
      const validKey = generateApiKey();
      expect(isValidApiKeyFormat(validKey)).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(isValidApiKeyFormat('invalid')).toBe(false);
      expect(isValidApiKeyFormat('zzzzz')).toBe(false);
      expect(isValidApiKeyFormat('')).toBe(false);
    });
  });
});

describe('User Agent Parser', () => {
  it('should parse Chrome on Windows', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    const result = parseUserAgent(ua);

    expect(result.browser).toBe('Chrome');
    expect(result.os).toBe('Windows');
    expect(result.device).toBe('desktop');
  });

  it('should parse Safari on iOS', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
    const result = parseUserAgent(ua);

    expect(result.browser).toBe('Safari');
    expect(result.os).toBe('iOS');
    expect(result.device).toBe('mobile');
  });

  it('should parse Chrome on Android', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
    const result = parseUserAgent(ua);

    expect(result.browser).toBe('Chrome');
    expect(result.os).toBe('Android');
    expect(result.device).toBe('mobile');
  });

  it('should handle unknown user agent', () => {
    const ua = 'Unknown Browser';
    const result = parseUserAgent(ua);

    expect(result.browser).toBe('Unknown');
    expect(result.os).toBe('Unknown');
    expect(result.device).toBe('desktop');
  });
});
