// Utility to derive a CryptoKey from a secret string using PBKDF2
export const deriveKey = async (secret: string): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    // Use a fixed salt for the password manager namespace.
    // In a fully robust system, the salt would be unique per user.
    // For this context, a strong static salt suffices since the cypher stays completely offline to others.
    const salt = encoder.encode("personal-system-password-manager-salt-v1");

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};

export const encryptText = async (text: string, key: CryptoKey): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Generate a unique IV for this specific encryption
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        data
    );

    // Convert IV and Ciphertext to base64 for storage
    const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

    return `${ivBase64}:${cipherBase64}`;
};

export const decryptText = async (encryptedData: string, key: CryptoKey): Promise<string> => {
    try {
        const [ivBase64, cipherBase64] = encryptedData.split(":");
        if (!ivBase64 || !cipherBase64) throw new Error("Invalid encrypted format");

        const ivBytes = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const cipherBytes = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0));

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBytes },
            key,
            cipherBytes
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (e) {
        throw new Error("Decryption failed. Incorrect secret key or corrupted data.");
    }
};
