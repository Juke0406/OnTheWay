/**
 * Edge-compatible crypto functions using Web Crypto API
 * This is a replacement for Node.js crypto module for use in Edge Runtime
 */

// Convert a string to Uint8Array
export function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert a Uint8Array to hex string
export function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert a base64 string to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert a Uint8Array to string
export function uint8ArrayToString(buffer: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// SHA-256 hash function
export async function sha256(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return new Uint8Array(hashBuffer);
}

// HMAC-SHA256 function
export async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the data
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return new Uint8Array(signature);
}

// Convenience function to create a SHA-256 hash and return it as a hex string
export async function createHash(data: string): Promise<string> {
  const hash = await sha256(data);
  return uint8ArrayToHex(hash);
}

// Convenience function to create an HMAC-SHA256 and return it as a hex string
export async function createHmac(key: Uint8Array, data: string): Promise<string> {
  const hmac = await hmacSha256(key, data);
  return uint8ArrayToHex(hmac);
}
