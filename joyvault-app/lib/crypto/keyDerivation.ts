// Use Web Crypto API for key derivation (PBKDF2)
const PBKDF2_ITERATIONS = 600000 // High iteration count for security (matches OWASP recommendations)
const KEY_LENGTH = 256 // 256 bits = 32 bytes

const APP_SALT = 'JoyVault-v1-2026'

export interface DerivedKey {
  masterKey: Uint8Array
  hashHex: string
}

export async function deriveKeyFromLifePhrase(
  lifePhrase: string
): Promise<DerivedKey> {
  if (!lifePhrase || lifePhrase.trim().length === 0) {
    throw new Error('Life Phrase cannot be empty')
  }

  const encoder = new TextEncoder()
  const phraseBytes = encoder.encode(lifePhrase)
  const saltBytes = encoder.encode(APP_SALT)

  try {
    // Import the password as a CryptoKey
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      phraseBytes.buffer as ArrayBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    )

    // Derive key using PBKDF2
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
  } catch (error) {
    throw new Error(`Key derivation failed: ${error}`)
  }
}

export function validateLifePhrase(lifePhrase: string): {
  isValid: boolean
  errors: string[]
  strength: number
} {
  const errors: string[] = []
  let strength = 0

  if (!lifePhrase || lifePhrase.trim().length === 0) {
    return { isValid: false, errors: ['Life Phrase cannot be empty'], strength: 0 }
  }

  const trimmed = lifePhrase.trim()
  const words = trimmed.split(/\s+/)
  const hasNumber = /\d/.test(trimmed)

  if (trimmed.length < 40) {
    errors.push('Life Phrase must be at least 40 characters long')
  } else {
    strength += 20
  }

  if (words.length < 5) {
    errors.push('Life Phrase must contain at least 5 words')
  } else {
    strength += 20
  }

  if (!hasNumber) {
    errors.push('Life Phrase must contain at least one number')
  } else {
    strength += 20
  }

  const commonWeakPatterns = [
    'password',
    '123456',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
  ]
  const hasWeakPattern = commonWeakPatterns.some((pattern) =>
    trimmed.toLowerCase().includes(pattern)
  )

  if (hasWeakPattern) {
    errors.push('Life Phrase contains common weak patterns')
    strength -= 20
  } else {
    strength += 20
  }

  const entropy = calculateEntropy(trimmed)
  if (entropy >= 80) {
    strength += 20
  } else if (entropy >= 60) {
    strength += 10
  }

  strength = Math.max(0, Math.min(100, strength))

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  }
}

function calculateEntropy(text: string): number {
  const charSet = new Set(text)
  const uniqueChars = charSet.size

  let entropy = 0
  const length = text.length

  if (length === 0) return 0

  const freq: { [key: string]: number } = {}
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1
  }

  for (const char in freq) {
    const probability = freq[char] / length
    entropy -= probability * Math.log2(probability)
  }

  return entropy * length
}

export function clearSensitiveData(data: Uint8Array | string): void {
  if (data instanceof Uint8Array) {
    data.fill(0)
  } else if (typeof data === 'string') {
    data = ''
  }
}
