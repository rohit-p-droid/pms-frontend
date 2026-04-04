export interface PasswordFolder {
    id: string;
    name: string;
    userId: string;
    credentials?: PasswordCredential[];
    createdAt: string;
    updatedAt: string;
}

export interface PasswordCredential {
    id: string;
    name: string;
    encryptedUsername: string;
    encryptedPassword: string;
    folderId: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFolderPayload {
    name: string;
}

export interface CreateCredentialPayload {
    name: string;
    encryptedUsername: string;
    encryptedPassword: string;
    folderId: string;
}

export interface UpdateCredentialPayload {
    name?: string;
    encryptedUsername?: string;
    encryptedPassword?: string;
    folderId?: string;
}
