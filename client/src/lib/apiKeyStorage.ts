/**
 * Utility functions for securely storing and retrieving API keys in local storage
 */

// Prefix for all API key storage in localStorage
const API_KEY_PREFIX = 'blink_api_key_';

/**
 * Save an API key to localStorage with encryption
 * @param keyName - The name/identifier for the API key
 * @param keyValue - The actual API key value to store
 */
export function saveApiKey(keyName: string, keyValue: string): void {
  if (!keyName || !keyValue) return;
  
  try {
    // Simple obfuscation (not true encryption, but better than plaintext)
    // For a production app, consider using the Web Crypto API
    const obfuscatedValue = btoa(keyValue);
    localStorage.setItem(`${API_KEY_PREFIX}${keyName}`, obfuscatedValue);
  } catch (error) {
    console.error('Error saving API key:', error);
  }
}

/**
 * Retrieve an API key from localStorage
 * @param keyName - The name/identifier for the API key
 * @returns The API key if found, otherwise null
 */
export function getApiKey(keyName: string): string | null {
  if (!keyName) return null;
  
  try {
    const obfuscatedValue = localStorage.getItem(`${API_KEY_PREFIX}${keyName}`);
    if (!obfuscatedValue) return null;
    
    // Decode the obfuscated value
    return atob(obfuscatedValue);
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
}

/**
 * Check if an API key exists in localStorage
 * @param keyName - The name/identifier for the API key
 * @returns True if the key exists, otherwise false
 */
export function hasApiKey(keyName: string): boolean {
  return getApiKey(keyName) !== null;
}

/**
 * Remove an API key from localStorage
 * @param keyName - The name/identifier for the API key to remove
 */
export function removeApiKey(keyName: string): void {
  if (!keyName) return;
  localStorage.removeItem(`${API_KEY_PREFIX}${keyName}`);
}

/**
 * Clear all stored API keys from localStorage
 */
export function clearAllApiKeys(): void {
  Object.keys(localStorage)
    .filter(key => key.startsWith(API_KEY_PREFIX))
    .forEach(key => localStorage.removeItem(key));
}