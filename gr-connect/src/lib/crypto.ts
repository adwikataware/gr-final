import nacl from "tweetnacl";

const PRIVATE_KEY_PREFIX = "gr_privkey_";

/* ------------------------------------------------------------------ */
/* Base64 helpers (browser-native, no tweetnacl-util type issues)     */
/* ------------------------------------------------------------------ */
function toB64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function toBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function fromBytes(buf: Uint8Array): string {
  return new TextDecoder().decode(buf);
}

/* ------------------------------------------------------------------ */
/* Key generation + storage                                            */
/* ------------------------------------------------------------------ */
export function getOrCreateKeyPair(uid: string): { publicKey: string; privateKey: string } {
  const stored = localStorage.getItem(PRIVATE_KEY_PREFIX + uid);
  if (stored) return JSON.parse(stored);
  const kp = nacl.box.keyPair();
  const pair = { publicKey: toB64(kp.publicKey), privateKey: toB64(kp.secretKey) };
  localStorage.setItem(PRIVATE_KEY_PREFIX + uid, JSON.stringify(pair));
  return pair;
}

export function getPrivateKey(uid: string): Uint8Array | null {
  const stored = localStorage.getItem(PRIVATE_KEY_PREFIX + uid);
  if (!stored) return null;
  return fromB64(JSON.parse(stored).privateKey);
}

/* ------------------------------------------------------------------ */
/* Encrypt a message for recipient (nacl.box = Curve25519 + XSalsa20) */
/* ------------------------------------------------------------------ */
export function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderPrivateKey: Uint8Array,
): string {
  const recipientPub = fromB64(recipientPublicKeyB64);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(toBytes(plaintext), nonce, recipientPub, senderPrivateKey);
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  return toB64(combined);
}

/* ------------------------------------------------------------------ */
/* Decrypt a message from sender                                       */
/* ------------------------------------------------------------------ */
export function decryptMessage(
  ciphertextB64: string,
  senderPublicKeyB64: string,
  recipientPrivateKey: Uint8Array,
): string | null {
  try {
    const combined = fromB64(ciphertextB64);
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const ciphertext = combined.slice(nacl.box.nonceLength);
    const senderPub = fromB64(senderPublicKeyB64);
    const decrypted = nacl.box.open(ciphertext, nonce, senderPub, recipientPrivateKey);
    return decrypted ? fromBytes(decrypted) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Encrypt for self (so sender can read their own sent messages)       */
/* ------------------------------------------------------------------ */
export function encryptForSelf(plaintext: string, privateKey: Uint8Array): string {
  const key = privateKey.slice(0, nacl.secretbox.keyLength);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(toBytes(plaintext), nonce, key);
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  return toB64(combined);
}

export function decryptForSelf(ciphertextB64: string, privateKey: Uint8Array): string | null {
  try {
    const combined = fromB64(ciphertextB64);
    const nonce = combined.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = combined.slice(nacl.secretbox.nonceLength);
    const key = privateKey.slice(0, nacl.secretbox.keyLength);
    const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
    return decrypted ? fromBytes(decrypted) : null;
  } catch {
    return null;
  }
}
