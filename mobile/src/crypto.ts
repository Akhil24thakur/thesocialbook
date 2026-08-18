import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

const KEY_PAIR_STORE = "tsb.e2e.keypair.v1";
export const ENC_PREFIX = "enc:v1:";

export interface E2EKeyPair {
  publicKey: string;
  privateKey: string;
}

export async function loadOrCreateKeyPair(): Promise<E2EKeyPair> {
  try {
    const raw = await SecureStore.getItemAsync(KEY_PAIR_STORE);
    if (raw) {
      const parsed = JSON.parse(raw) as E2EKeyPair;
      if (parsed?.publicKey && parsed?.privateKey) return parsed;
    }
  } catch {
    // Fall through to generate
  }
  const pair = nacl.box.keyPair();
  const kp: E2EKeyPair = {
    publicKey: naclUtil.encodeBase64(pair.publicKey),
    privateKey: naclUtil.encodeBase64(pair.secretKey),
  };
  try {
    await SecureStore.setItemAsync(KEY_PAIR_STORE, JSON.stringify(kp));
  } catch {
    // Best effort - key is regenerated next launch if not persisted
  }
  return kp;
}

export function encryptMessage(plain: string, myPrivateKeyB64: string, theirPublicKeyB64: string): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const cipher = nacl.box(
    naclUtil.decodeUTF8(plain),
    nonce,
    naclUtil.decodeBase64(theirPublicKeyB64),
    naclUtil.decodeBase64(myPrivateKeyB64)
  );
  return `${ENC_PREFIX}${naclUtil.encodeBase64(nonce)}:${naclUtil.encodeBase64(cipher)}`;
}

export function decryptMessage(
  payload: string,
  myPrivateKeyB64: string,
  theirPublicKeyB64: string
): string | null {
  if (!payload.startsWith(ENC_PREFIX)) return payload;
  try {
    const rest = payload.slice(ENC_PREFIX.length);
    const sep = rest.indexOf(":");
    if (sep < 0) return null;
    const nonce = naclUtil.decodeBase64(rest.slice(0, sep));
    const cipher = naclUtil.decodeBase64(rest.slice(sep + 1));
    const plain = nacl.box.open(
      cipher,
      nonce,
      naclUtil.decodeBase64(theirPublicKeyB64),
      naclUtil.decodeBase64(myPrivateKeyB64)
    );
    return plain ? naclUtil.encodeUTF8(plain) : null;
  } catch {
    return null;
  }
}