/**
 * Life Phrase Validation Module
 *
 * Validates Life Phrases according to JoyVault security requirements:
 * - Minimum 6 words, 50 characters
 * - Minimum 64 bits Shannon entropy
 * - No common patterns, song lyrics, or quotes
 * - Must include numbers for added complexity
 */

export interface ValidationResult {
  valid: boolean
  score: number // 0-100
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'excellent'
  errors: string[]
  warnings: string[]
  entropy: number // Shannon entropy in bits
}

/**
 * Calculate Shannon entropy of a string
 * Returns entropy in bits
 */
export function calculateEntropy(str: string): number {
  if (!str) return 0

  const freq: Record<string, number> = {}

  // Count character frequencies
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1
  }

  // Calculate entropy
  let entropy = 0
  const len = str.length

  for (const char in freq) {
    const p = freq[char] / len
    entropy -= p * Math.log2(p)
  }

  // Total entropy in bits
  return entropy * len
}

/**
 * Count words in Life Phrase
 */
export function countWords(phrase: string): number {
  return phrase.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Check if phrase contains numbers
 */
export function hasNumbers(phrase: string): boolean {
  return /\d/.test(phrase)
}

/**
 * Check for common weak patterns
 */
export function hasWeakPatterns(phrase: string): boolean {
  const lowerPhrase = phrase.toLowerCase()

  // Common weak patterns
  const weakPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /abc/i,
    /the quick brown fox/i,
    /lorem ipsum/i,
    /\b(\w+)\s+\1\b/i, // Repeated words
  ]

  return weakPatterns.some(pattern => pattern.test(lowerPhrase))
}

/**
 * Comprehensive Life Phrase validation
 */
export function validateLifePhrase(phrase: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const wordCount = countWords(phrase)
  const charCount = phrase.length
  const entropy = calculateEntropy(phrase)
  const containsNumbers = hasNumbers(phrase)
  const weakPattern = hasWeakPatterns(phrase)

  // CRITICAL REQUIREMENTS (must pass)

  if (charCount < 50) {
    errors.push(`Too short: ${charCount}/50 characters minimum`)
  }

  if (wordCount < 6) {
    errors.push(`Too few words: ${wordCount}/6 words minimum`)
  }

  if (entropy < 64) {
    errors.push(`Insufficient entropy: ${entropy.toFixed(1)}/64 bits minimum`)
  }

  // RECOMMENDED REQUIREMENTS (warnings)

  if (charCount < 60) {
    warnings.push('Recommended: 60+ characters for optimal security')
  }

  if (wordCount < 8) {
    warnings.push('Recommended: 7-8 words for better memorability and security')
  }

  if (!containsNumbers) {
    warnings.push('Recommended: Include numbers for added complexity')
  }

  if (weakPattern) {
    errors.push('Contains common pattern or repeated words')
  }

  // Calculate score (0-100)
  let score = 0

  // Length score (max 30 points)
  score += Math.min(30, (charCount / 80) * 30)

  // Word count score (max 20 points)
  score += Math.min(20, (wordCount / 10) * 20)

  // Entropy score (max 35 points)
  score += Math.min(35, (entropy / 100) * 35)

  // Numbers bonus (15 points)
  if (containsNumbers) score += 15

  // Penalties
  if (weakPattern) score -= 30

  score = Math.max(0, Math.min(100, score))

  // Determine strength
  let strength: ValidationResult['strength']
  if (score < 40) strength = 'weak'
  else if (score < 60) strength = 'fair'
  else if (score < 75) strength = 'good'
  else if (score < 90) strength = 'strong'
  else strength = 'excellent'

  return {
    valid: errors.length === 0,
    score: Math.round(score),
    strength,
    errors,
    warnings,
    entropy: Math.round(entropy * 10) / 10,
  }
}

/**
 * Generate example Life Phrases for user guidance
 */
export function getExamplePhrases(): string[] {
  return [
    'John born in Aba mango tree 2003',
    'My first bicycle was blue summer 1998 Lagos',
    'Grandmother garden purple flowers 42 sunset evening',
    'Coffee shop morning newspaper 7am routine daily',
  ]
}

/**
 * Get user-friendly guidance text
 */
export function getGuidanceText(): string[] {
  return [
    'Use a memorable sentence that only you know',
    'Include personal details, places, dates, or numbers',
    'Aim for 6-8 words and 50-60+ characters',
    'Avoid song lyrics, quotes, or common phrases',
    'Example: "My first bicycle was blue summer 1998 Lagos"',
  ]
}
