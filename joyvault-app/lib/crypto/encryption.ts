export interface EncryptedData {
  ciphertext: Uint8Array
  nonce: Uint8Array
  ciphertextHex: string
  nonceHex: string
}

export async function encryptSecret(
  masterKey: Uint8Array,
  plaintext: string
): Promise<EncryptedData> {
  if (!plaintext || plaintext.trim().length === 0) {
    throw new Error('Plaintext cannot be empty')
  }

  const MAX_SECRET_SIZE = 1024
  if (plaintext.length > MAX_SECRET_SIZE) {
    throw new Error(`Secret must be less than ${MAX_SECRET_SIZE} characters`)
  }

  const nonce = crypto.getRandomValues(new Uint8Array(12))

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    masterKey.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const encoder = new TextEncoder()
  const plaintextBytes = encoder.encode(plaintext)

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce.buffer as ArrayBuffer,
    },
    cryptoKey,
    plaintextBytes.buffer as ArrayBuffer
  )

  const ciphertext = new Uint8Array(ciphertextBuffer)

  return {
    ciphertext,
    nonce,
    ciphertextHex: bufferToHex(ciphertext),
    nonceHex: bufferToHex(nonce),
  }
}

export async function decryptSecret(
  masterKey: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array
): Promise<string> {
  if (!ciphertext || ciphertext.length === 0) {
    throw new Error('Ciphertext cannot be empty')
  }

  if (!nonce || nonce.length !== 12) {
    throw new Error('Nonce must be 12 bytes')
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    masterKey.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce.buffer as ArrayBuffer,
      },
      cryptoKey,
      ciphertext.buffer as ArrayBuffer
    )

    const decoder = new TextDecoder()
    return decoder.decode(plaintextBuffer)
  } catch (error) {
    throw new Error('Decryption failed - wrong key or corrupted data')
  }
}

export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hexToBuffer(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string')
  }

  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }

  return bytes
}

export function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}
