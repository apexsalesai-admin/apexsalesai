/**
 * Token Encryption Utilities
 * Uses AES-256-GCM for encrypting OAuth tokens at rest
 *
 * SECURITY REQUIREMENTS:
 * - ENCRYPTION_KEY must be a 32-byte (256-bit) key, base64 encoded
 * - Generate with: openssl rand -base64 32
 * - Store in environment variable, never commit to code
 * - Tokens are stored as: iv:ciphertext:authTag (all base64)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * Get the encryption key from environment
 * @throws Error if ENCRYPTION_KEY is not configured or invalid
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY

  if (!keyBase64) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: openssl rand -base64 32'
    )
  }

  const key = Buffer.from(keyBase64, 'base64')

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (256 bits). ` +
        `Current key is ${key.length} bytes. ` +
        `Generate a valid key with: openssl rand -base64 32`
    )
  }

  return key
}

/**
 * Encrypt a plaintext string
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:ciphertext:authTag (base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Format: iv:ciphertext:authTag
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`
}

/**
 * Decrypt an encrypted string
 * @param encryptedData - Encrypted string in format: iv:ciphertext:authTag
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (invalid data, wrong key, tampered)
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()

  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected iv:ciphertext:authTag')
  }

  const [ivBase64, ciphertext, authTagBase64] = parts
  const iv = Buffer.from(ivBase64, 'base64')
  const authTag = Buffer.from(authTagBase64, 'base64')

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: ${iv.length}, expected ${IV_LENGTH}`)
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: ${authTag.length}, expected ${AUTH_TAG_LENGTH}`)
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Safely encrypt a token, returning null if encryption fails
 * Logs errors but does not throw
 */
export function safeEncrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null

  try {
    return encrypt(plaintext)
  } catch (error) {
    console.error('Token encryption failed:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Safely decrypt a token, returning null if decryption fails
 * Logs errors but does not throw
 */
export function safeDecrypt(encryptedData: string | null | undefined): string | null {
  if (!encryptedData) return null

  try {
    return decrypt(encryptedData)
  } catch (error) {
    console.error('Token decryption failed:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Check if encryption is properly configured
 * @returns true if ENCRYPTION_KEY is valid
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey()
    return true
  } catch {
    return false
  }
}

/**
 * Validate encryption configuration and return status
 */
export function getEncryptionStatus(): {
  configured: boolean
  error?: string
} {
  try {
    getEncryptionKey()
    return { configured: true }
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
