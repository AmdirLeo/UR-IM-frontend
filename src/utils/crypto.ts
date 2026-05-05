import CryptoJS from 'crypto-js';

/**
 * Encrypts a password using SHA-256 before sending it to the backend.
 * @param password The raw password string.
 * @returns The encrypted password hash (hex string).
 */
export const encryptPassword = (password: string): string => {
  if (!password) return password;
  return CryptoJS.SHA256(password).toString();
};
