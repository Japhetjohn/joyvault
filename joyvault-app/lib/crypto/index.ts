export {
  deriveKeyFromLifePhrase,
  validateLifePhrase,
  clearSensitiveData,
  type DerivedKey,
} from './keyDerivation'

export {
  encryptSecret,
  decryptSecret,
  bufferToHex,
  hexToBuffer,
  bufferToBase64,
  base64ToBuffer,
  type EncryptedData,
} from './encryption'

export {
  deriveVaultSeed,
  deriveVaultAddress,
  shortenAddress,
} from './vaultAddress'
