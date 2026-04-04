import { useState } from 'react';
import { Info, Folder, Key, Plus, Trash2, Eye, EyeOff, Lock, Loader2, Copy, Check } from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { PasswordFolder, PasswordCredential } from '../../types/password';
import { deriveKey, encryptText, decryptText } from '../../utils/crypto';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

export default function PasswordManagerPage() {
    const { user } = useSelector((state: RootState) => state.auth);
    const navigate = useNavigate();

    // Access State
    const [plainMasterKey, setPlainMasterKey] = useState<string | null>(null);
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [secretKeyInput, setSecretKeyInput] = useState('');
    const [unlockError, setUnlockError] = useState<string | null>(null);

    const [folders, setFolders] = useState<PasswordFolder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);

    // Models
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    const [isCreateCredModalOpen, setIsCreateCredModalOpen] = useState(false);
    const [newCredName, setNewCredName] = useState('');
    const [newCredUser, setNewCredUser] = useState('');
    const [newCredPass, setNewCredPass] = useState('');
    const [isCreatingCred, setIsCreatingCred] = useState(false);
    const [credError, setCredError] = useState<string | null>(null);

    const [isDecryptingId, setIsDecryptingId] = useState<string | null>(null);
    const [decryptedCreds, setDecryptedCreds] = useState<Record<string, { username: string, password: string }>>({});
    
    // Delete states
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'folder' | 'cred', id: string } | null>(null);
    const [deletePasswordInput, setDeletePasswordInput] = useState('');
    const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [decryptModalCred, setDecryptModalCred] = useState<PasswordCredential | null>(null);
    const [decryptPasswordInput, setDecryptPasswordInput] = useState('');
    const [decryptModalError, setDecryptModalError] = useState<string | null>(null);
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

    const handleCopy = (id: string, type: string, text: string) => {
        navigator.clipboard.writeText(text);
        const key = `${id}-${type}`;
        setCopiedMap(prev => ({ ...prev, [key]: true }));
        setTimeout(() => setCopiedMap(prev => ({ ...prev, [key]: false })), 2000);
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!secretKeyInput) return;
        
        if (!user?.encryptedSecretKey) {
            setUnlockError("Master Key not initialized. Please configure it in Account Settings.");
            return;
        }

        setIsUnlocking(true);
        setUnlockError(null);
        try {
            const isValid = await apiClient.verifyPassword(secretKeyInput);
            if (!isValid) {
                setUnlockError("Incorrect login password. Access denied.");
                return;
            }

            // Derive local wrapping key from the login password
            const localWrapKey = await deriveKey(secretKeyInput);
            // Decrypt the Master Vault Key
            const extractedMasterKey = await decryptText(user.encryptedSecretKey, localWrapKey);

            setPlainMasterKey(extractedMasterKey);
            setIsVaultUnlocked(true);
            fetchFolders();
        } catch (error) {
            console.error(error);
            setUnlockError("Error decrypting Vault Master Key. Password may be incorrect or vault is missing.");
        } finally {
            setIsUnlocking(false);
        }
    };

    const fetchFolders = async () => {
        try {
            setIsLoadingFolders(true);
            const data = await apiClient.getPasswordFolders();
            setFolders(data);
            if (data.length > 0 && !selectedFolderId) {
                setSelectedFolderId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch folders", error);
        } finally {
            setIsLoadingFolders(false);
        }
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim() || isCreatingFolder) return;
        setIsCreatingFolder(true);
        try {
            await apiClient.createPasswordFolder({ name: newFolderName });
            setNewFolderName('');
            setIsCreateFolderModalOpen(false);
            await fetchFolders();
        } catch (error) {
            console.error("Failed to create folder", error);
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleDeleteFolder = (folderId: string) => {
        setDeleteConfirm({ type: 'folder', id: folderId });
        setDeletePasswordInput('');
        setDeleteModalError(null);
    };

    const handleCreateCredential = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFolderId || !newCredName || !newCredUser || !newCredPass || isCreatingCred) return;

        setIsCreatingCred(true);
        setCredError(null);
        try {
            if (!plainMasterKey) throw new Error("Vault not unlocked properly");

            const key = await deriveKey(plainMasterKey);
            const encryptedUsername = await encryptText(newCredUser, key);
            const encryptedPassword = await encryptText(newCredPass, key);

            await apiClient.createPasswordCredential({
                name: newCredName,
                encryptedUsername,
                encryptedPassword,
                folderId: selectedFolderId
            });

            setIsCreateCredModalOpen(false);
            setNewCredName('');
            setNewCredUser('');
            setNewCredPass('');
            await fetchFolders();
        } catch (error) {
            console.error("Encryption/Creation failed", error);
            setCredError("Failed to securely save credential.");
        } finally {
            setIsCreatingCred(false);
        }
    };

    const handleDeleteCredential = (credId: string) => {
        setDeleteConfirm({ type: 'cred', id: credId });
        setDeletePasswordInput('');
        setDeleteModalError(null);
    };

    const executeDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deleteConfirm || !deletePasswordInput) return;
        
        setIsDeleting(true);
        setDeleteModalError(null);
        try {
            const isValid = await apiClient.verifyPassword(deletePasswordInput);
            if (!isValid) {
                setDeleteModalError("Incorrect password. Deletion cancelled.");
                return;
            }

            if (deleteConfirm.type === 'folder') {
                await apiClient.deletePasswordFolder(deleteConfirm.id);
                if (selectedFolderId === deleteConfirm.id) setSelectedFolderId(null);
            } else if (deleteConfirm.type === 'cred') {
                await apiClient.deletePasswordCredential(deleteConfirm.id);
            }
            await fetchFolders();
            setDeleteConfirm(null);
        } catch (error) {
            console.error(error);
            setDeleteModalError("An error occurred. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDecryptClick = (cred: PasswordCredential) => {
        setDecryptModalCred(cred);
        setDecryptPasswordInput('');
        setDecryptModalError(null);
    };

    const handleDecryptConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decryptModalCred || !decryptPasswordInput) return;
        if (!user?.encryptedSecretKey) return;

        setIsDecryptingId(decryptModalCred.id);
        setDecryptModalError(null);
        try {
            // First, prove they know the login password by unwrapping the master key
            const localWrapKey = await deriveKey(decryptPasswordInput);
            const extractedMasterKey = await decryptText(user.encryptedSecretKey, localWrapKey);

            // Now derive the actual encryption key
            const actualEncryptionKey = await deriveKey(extractedMasterKey);

            const username = await decryptText(decryptModalCred.encryptedUsername, actualEncryptionKey);
            const password = await decryptText(decryptModalCred.encryptedPassword, actualEncryptionKey);
            
            setDecryptedCreds(prev => ({
                ...prev,
                [decryptModalCred.id]: { username, password }
            }));
            
            setDecryptModalCred(null);
            setDecryptPasswordInput('');
        } catch (error) {
            console.error(error);
            setDecryptModalError("Incorrect password or corrupt encryption.");
        } finally {
            setIsDecryptingId(null);
        }
    };

    if (!isVaultUnlocked) {
        return (
            <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900 items-center justify-center px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center relative group">
                    <div className="absolute top-4 right-4 text-gray-400 hover:text-yellow-500 cursor-pointer transition-colors group/tooltip">
                        <Info className="h-5 w-5" />
                        <div className="absolute top-full -left-1/2 -translateX-1/2 mt-2 w-64 bg-gray-900 border border-gray-700 text-white text-xs p-3 rounded-xl shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 tooltip-arrow">
                            <strong>Zero-Knowledge Security</strong>
                            <p className="mt-1 text-gray-300">
                                Your login password acts as your local encryption key. We never store it. If you forget your password, your credentials are unrecoverable.
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/40 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unlock Your Vault</h2>
                    {user?.encryptedSecretKey ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Enter your account login password to securely decrypt and access your credentials.</p>
                    ) : (
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mb-8">Warning: Your Zero-Knowledge Vault Master Key has not been initialized.</p>
                    )}
                    
                    <form onSubmit={handleUnlock} className="space-y-4 text-left">
                        <div>
                            <input 
                                type="password"
                                required
                                autoFocus
                                disabled={isUnlocking}
                                placeholder="Login Password"
                                value={secretKeyInput}
                                onChange={(e) => {
                                    setSecretKeyInput(e.target.value);
                                    setUnlockError(null);
                                }}
                                className={`w-full rounded-xl border ${unlockError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'} dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white shadow-sm disabled:opacity-50`}
                            />
                            {unlockError && <p className="text-red-500 text-xs mt-2 font-medium">{unlockError}</p>}
                            
                            {!user?.encryptedSecretKey && (
                                <div className="mt-4 flex justify-center">
                                    <button type="button" onClick={() => navigate('/settings')} className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg transition-colors">
                                        Initialize Key in Account Settings →
                                    </button>
                                </div>
                            )}
                        </div>
                        <button 
                            type="submit" 
                            disabled={isUnlocking || !secretKeyInput}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isUnlocking ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Unlock Vault'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const selectedFolder = folders.find(f => f.id === selectedFolderId);

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Top Bar Area */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shrink-0 flex justify-between items-center shadow-sm relative z-20">
                <div className="flex items-center space-x-2">
                    <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Password Vault</span>
                    <div className="group relative ml-2 mt-0.5">
                        <Info className="h-4 w-4 text-gray-400 hover:text-yellow-500 cursor-help transition-colors" />
                        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <strong>Local Encryption</strong>
                            <p className="mt-1 text-gray-300">
                                Your login password acts as your local encryption key. We never store it. All credentials are encrypted inside your browser before being sent to our servers.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Vault Unlocked</span>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Folders */}
                <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Folders</h2>
                        <button 
                            onClick={() => setIsCreateFolderModalOpen(true)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {isLoadingFolders ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                        ) : folders.map(folder => (
                            <div 
                                key={folder.id}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${selectedFolderId === folder.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                onClick={() => setSelectedFolderId(folder.id)}
                            >
                                <Folder className="h-4 w-4 shrink-0 opacity-70" />
                                <span className="truncate flex-1">{folder.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
                    {selectedFolder ? (
                        <>
                            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                                        <Folder className="h-6 w-6 text-gray-400" />
                                        <span>{selectedFolder.name}</span>
                                    </h1>
                                </div>
                                <div className="space-x-3 flex items-center">
                                    <button 
                                        onClick={() => setIsCreateCredModalOpen(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center space-x-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Add Credential</span>
                                    </button>
                                    <button 
                                        title="Delete Folder"
                                        onClick={() => handleDeleteFolder(selectedFolder.id)}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors border border-transparent dark:hover:border-red-800/30"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedFolder.credentials && selectedFolder.credentials.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {selectedFolder.credentials.map(cred => {
                                            const isDecrypted = !!decryptedCreds[cred.id];
                                            const decInfo = decryptedCreds[cred.id];
                                            return (
                                                <div key={cred.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow relative">
                                                    <div className="p-5">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                                                                    <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                                                </div>
                                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={cred.name}>{cred.name}</h3>
                                                            </div>
                                                            <button onClick={() => handleDeleteCredential(cred.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="text-[11px] font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Username / Email</label>
                                                                <div className="flex items-center space-x-2 mt-1">
                                                                    <div className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800 overflow-x-auto truncate">
                                                                        {isDecrypted ? decInfo.username : '••••••••••••••••'}
                                                                    </div>
                                                                    {isDecrypted && (
                                                                        <button onClick={() => handleCopy(cred.id, 'user', decInfo.username)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 transition-colors">
                                                                            {copiedMap[`${cred.id}-user`] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Password</label>
                                                                <div className="flex items-center space-x-2 mt-1">
                                                                    <div className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800 overflow-x-auto truncate">
                                                                        {isDecrypted ? decInfo.password : '••••••••••••••••'}
                                                                    </div>
                                                                    {isDecrypted && (
                                                                        <button onClick={() => handleCopy(cred.id, 'pass', decInfo.password)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 transition-colors">
                                                                            {copiedMap[`${cred.id}-pass`] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {!isDecrypted && (
                                                        <div className="border-t border-gray-100 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                                                            <span className="text-xs text-gray-500">AES-256-GCM Encrypted {"🔒"}</span>
                                                            <button 
                                                                onClick={() => handleDecryptClick(cred)}
                                                                disabled={isDecryptingId === cred.id}
                                                                className="flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-800/80 transition-colors"
                                                            >
                                                                {isDecryptingId === cred.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                                                <span>{isDecryptingId === cred.id ? 'Decrypting...' : 'View'}</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                    {isDecrypted && (
                                                        <div className="border-t border-gray-100 dark:border-gray-700 p-3 bg-green-50 dark:bg-green-900/10 flex items-center justify-between">
                                                            <span className="text-xs text-green-700 dark:text-green-500 font-medium">Decrypted Successfully {"🔓"}</span>
                                                            <button 
                                                                onClick={() => {
                                                                    const next = { ...decryptedCreds };
                                                                    delete next[cred.id];
                                                                    setDecryptedCreds(next);
                                                                }}
                                                                className="flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                            >
                                                                <EyeOff className="h-4 w-4" />
                                                                <span>Hide</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 m-2">
                                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                                            <Key className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <p className="mb-4 font-medium text-gray-600 dark:text-gray-300">No credentials stored via this folder.</p>
                                        <button 
                                            onClick={() => setIsCreateCredModalOpen(true)}
                                            className="bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 px-5 py-2 rounded-lg font-medium shadow-sm transition-colors"
                                        >
                                            Add First Credential
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 p-6 flex-col">
                            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                                <Folder className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-1">Select a Vault Area</p>
                            <p className="text-sm">Choose a folder on the left or create a new one to begin.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Folder Modal */}
            {isCreateFolderModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm z-10 relative">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                <Folder className="h-5 w-5 text-gray-400" />
                                <span>Create Vault Folder</span>
                            </h3>
                        </div>
                        <form onSubmit={handleCreateFolder} className="p-5 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Folder Title</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    required
                                    disabled={isCreatingFolder}
                                    placeholder="e.g. Finance, Server Logins..."
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" disabled={isCreatingFolder} onClick={() => setIsCreateFolderModalOpen(false)} className="text-gray-600 dark:text-gray-300 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium text-sm transition-colors">Cancel</button>
                                <button type="submit" disabled={isCreatingFolder || !newFolderName.trim()} className="bg-blue-600 text-white px-5 py-2 flex items-center space-x-2 rounded-xl font-medium text-sm hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors">
                                    {isCreatingFolder && <Loader2 className="h-4 w-4 animate-spin" />}
                                    <span>Create</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Credential Modal */}
            {isCreateCredModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm z-10 relative">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                <Key className="h-5 w-5 text-gray-400" />
                                <span>Store Secure Credential</span>
                            </h3>
                        </div>
                        <form onSubmit={handleCreateCredential} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Credential Identity</label>
                                <input 
                                    type="text" required placeholder="e.g. AWS Root Account"
                                    disabled={isCreatingCred}
                                    value={newCredName} onChange={e => setNewCredName(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Username or Email</label>
                                <input 
                                    type="text" required
                                    disabled={isCreatingCred}
                                    value={newCredUser} onChange={e => setNewCredUser(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white text-sm font-mono focus:border-blue-500 focus:ring-blue-500 shadow-sm disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                                <input 
                                    type="password" required
                                    disabled={isCreatingCred}
                                    value={newCredPass} onChange={e => setNewCredPass(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white text-sm font-mono focus:border-blue-500 focus:ring-blue-500 shadow-sm disabled:opacity-50"
                                />
                                <div className="flex items-start space-x-2 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-800 dark:text-blue-300 text-xs">
                                    <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>Payload will be instantly encrypted locally using AES-256-GCM before transmission.</span>
                                </div>
                                {credError && <p className="text-red-500 text-xs mt-2 font-medium">{credError}</p>}
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-5 border-t border-gray-100 dark:border-gray-700 mt-4">
                                <button type="button" disabled={isCreatingCred} onClick={() => { setIsCreateCredModalOpen(false); setCredError(null); }} className="text-gray-600 dark:text-gray-300 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium text-sm transition-colors">Cancel</button>
                                <button type="submit" disabled={isCreatingCred} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center space-x-2 transition-colors">
                                    {isCreatingCred ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                    <span>{isCreatingCred ? 'Encrypting...' : 'Encrypt Storage'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10 shadow-sm z-10 relative">
                            <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center space-x-2">
                                <Trash2 className="h-5 w-5" />
                                <span>Confirm Deletion</span>
                            </h3>
                        </div>
                        <form onSubmit={executeDelete} className="p-5 space-y-5">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {deleteConfirm.type === 'folder' 
                                    ? 'Are you sure you want to delete this folder and ALL credentials inside it? This action cannot be undone.'
                                    : 'Are you sure you want to delete this credential? This action cannot be undone.'}
                            </p>
                            <div>
                                <input 
                                    autoFocus
                                    type="password" 
                                    required
                                    disabled={isDeleting}
                                    placeholder="Confirm with Login Password"
                                    value={deletePasswordInput}
                                    onChange={e => {
                                        setDeletePasswordInput(e.target.value);
                                        setDeleteModalError(null);
                                    }}
                                    className={`w-full rounded-xl border ${deleteModalError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 disabled:opacity-50`}
                                />
                                {deleteModalError && <p className="text-red-500 text-xs mt-2 font-medium">{deleteModalError}</p>}
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" disabled={isDeleting} onClick={() => setDeleteConfirm(null)} className="text-gray-600 dark:text-gray-300 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium text-sm transition-colors">Cancel</button>
                                <button type="submit" disabled={isDeleting || !deletePasswordInput} className="bg-red-600 text-white px-5 py-2 flex items-center space-x-2 rounded-xl font-medium text-sm hover:bg-red-700 shadow-sm disabled:opacity-50 transition-colors">
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    <span>Delete</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Decrypt Credential Modal */}
            {decryptModalCred && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm z-10 relative">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                <Lock className="h-5 w-5 text-gray-400" />
                                <span>Authentication Required</span>
                            </h3>
                        </div>
                        <form onSubmit={handleDecryptConfirm} className="p-5 space-y-5">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Enter your login password to decrypt and view <strong>{decryptModalCred.name}</strong>.
                            </p>
                            <div>
                                <input 
                                    autoFocus
                                    type="password" 
                                    required
                                    disabled={isDecryptingId === decryptModalCred.id}
                                    placeholder="Login Password"
                                    value={decryptPasswordInput}
                                    onChange={e => {
                                        setDecryptPasswordInput(e.target.value);
                                        setDecryptModalError(null);
                                    }}
                                    className={`w-full rounded-xl border ${decryptModalError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50`}
                                />
                                {decryptModalError && <p className="text-red-500 text-xs mt-2 font-medium">{decryptModalError}</p>}
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 mt-2">
                                <button type="button" disabled={isDecryptingId === decryptModalCred.id} onClick={() => setDecryptModalCred(null)} className="text-gray-600 dark:text-gray-300 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium text-sm transition-colors">Cancel</button>
                                <button type="submit" disabled={isDecryptingId === decryptModalCred.id || !decryptPasswordInput} className="bg-blue-600 text-white px-5 py-2 flex items-center space-x-2 rounded-xl font-medium text-sm hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors">
                                    {isDecryptingId === decryptModalCred.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                    <span>Decrypt</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
