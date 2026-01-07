/**
 * Enhanced Key Derivation for JoyVault
 *
 * Security improvements:
 * - Uses scrypt (memory-hard KDF) with PBKDF2 fallback
 * - Per-user salt based on wallet address (prevents rainbow tables)
 * - High cost parameters to resist brute-force attacks
 */

import scrypt from 'scrypt-js'

// KDF Parameters
const SCRYPT_N = 16384 // CPU/memory cost (2^14)
const SCRYPT_R = 8 // Block size
const SCRYPT_P = 1 // Parallelization
const SCRYPT_KEYLEN = 32 // 256 bits

const PBKDF2_ITERATIONS = 600000 // Fallback if scrypt fails
const KEY_LENGTH = 256 // 256 bits = 32 bytes

const APP_SALT = 'JoyVault-v1-2026' // App-wide salt component

export interface DerivedKey {
  masterKey: Uint8Array
  hashHex: string
}

/**
 * Create per-user salt from wallet address
 * This prevents rainbow table attacks across users
 */
function createPerUserSalt(walletAddress?: string): Uint8Array {
  const encoder = new TextEncoder()

  // Combine app salt with wallet address if available
  const saltString = walletAddress
    ? `${APP_SALT}-${walletAddress}`
    : APP_SALT

  return encoder.encode(saltString)
}

/**
 * Enhanced key derivation using scrypt (memory-hard KDF)
 * Falls back to PBKDF2 if scrypt fails
 *
 * @param lifePhrase - The user's memorable Life Phrase
 * @param walletAddress - Optional wallet address for per-user salt
 */
export async function deriveKeyFromLifePhrase(
  lifePhrase: string,
  walletAddress?: string
): Promise<DerivedKey> {
  if (!lifePhrase || lifePhrase.trim().length === 0) {
    throw new Error('Life Phrase cannot be empty')
  }

  const encoder = new TextEncoder()
  const phraseBytes = encoder.encode(lifePhrase)
  const saltBytes = createPerUserSalt(walletAddress)

  try {
    // Try scrypt first (memory-hard, resistant to GPU/ASIC attacks)
    const masterKey = await scrypt.scrypt(
      phraseBytes,
      saltBytes,
      SCRYPT_N,
      SCRYPT_R,
      SCRYPT_P,
      SCRYPT_KEYLEN
    )

    const hashHex = Array.from(masterKey)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return {
      masterKey: new Uint8Array(masterKey),
      hashHex,
    }
  } catch (error) {
    console.warn('Scrypt failed, falling back to PBKDF2:', error)

    // Fallback to PBKDF2
    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        phraseBytes.buffer as ArrayBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
      )

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes.buffer as ArrayBuffer,
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        KEY_LENGTH
      )

      const masterKey = new Uint8Array(derivedBits)
      const hashHex = Array.from(masterKey)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      return {
        masterKey,
        hashHex,
      }
    } catch (pbkdf2Error) {
      throw new Error(`Key derivation failed: ${pbkdf2Error}`)
    }
  }
}

/**
 * Rate limiting for Life Phrase attempts
 * Implements progressive delays to prevent brute-force attacks
 */
const attemptTracker: Map<string, { count: number; lastAttempt: number }> = new Map()
const MAX_ATTEMPTS_PER_MINUTE = 3
const PROGRESSIVE_DELAY_MS = [0, 2000, 5000, 10000, 30000, 60000] // Progressive delays

export function checkRateLimit(identifier: string): {
  allowed: boolean
  delayMs: number
  attemptsRemaining: number
} {
  const now = Date.now()
  const track = attemptTracker.get(identifier) || { count: 0, lastAttempt: 0 }

  // Reset if last attempt was over 1 minute ago
  if (now - track.lastAttempt > 60000) {
    track.count = 0
  }

  const delayIndex = Math.min(track.count, PROGRESSIVE_DELAY_MS.length - 1)
  const requiredDelay = PROGRESSIVE_DELAY_MS[delayIndex]
  const timeSinceLastAttempt = now - track.lastAttempt

  if (timeSinceLastAttempt < requiredDelay) {
    return {
      allowed: false,
      delayMs: requiredDelay - timeSinceLastAttempt,
      attemptsRemaining: 0,
    }
  }

  // Update tracker
  track.count++
  track.lastAttempt = now
  attemptTracker.set(identifier, track)

  return {
    allowed: true,
    delayMs: 0,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS_PER_MINUTE - track.count),
  }
}

/**
 * Simplified validation for backward compatibility
 * Use lifePhraseValidation.ts for comprehensive checks
 */
export function validateLifePhrase(lifePhrase: string): {
  isValid: boolean
  errors: string[]
  strength: number
} {
  const errors: string[] = []

  if (!lifePhrase || lifePhrase.trim().length === 0) {
    return { isValid: false, errors: ['Life Phrase cannot be empty'], strength: 0 }
  }

  const trimmed = lifePhrase.trim()
  const words = trimmed.split(/\s+/)

  // Minimum requirements
  if (trimmed.length < 50) {
    errors.push('Life Phrase must be at least 50 characters long')
  }

  if (words.length < 6) {
    errors.push('Life Phrase must contain at least 6 words')
  }

  // Calculate basic strength (0-100)
  let strength = 0
  strength += Math.min(40, (trimmed.length / 80) * 40)
  strength += Math.min(30, (words.length / 10) * 30)
  strength += /\d/.test(trimmed) ? 20 : 0
  strength += !/password|123456|qwerty/i.test(trimmed) ? 10 : -20

  return {
    isValid: errors.length === 0,
    errors,
    strength: Math.round(Math.max(0, Math.min(100, strength))),
  }
}

export function clearSensitiveData(data: Uint8Array | string): void {
  if (data instanceof Uint8Array) {
    data.fill(0)
  } else if (typeof data === 'string') {
    data = ''
  }
}
