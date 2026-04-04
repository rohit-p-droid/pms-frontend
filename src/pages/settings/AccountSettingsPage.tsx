import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Key, Lock, Shield, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { RootState } from '../../store/store';
import { deriveKey, encryptText, decryptText } from '../../utils/crypto';
import { setAuth } from '../../store/slices/authSlice';

export default function AccountSettingsPage() {
    const dispatch = useDispatch();
    const { user, token } = useSelector((state: RootState) => state.auth);

    // Initialise Vault States
    const [initMasterKey, setInitMasterKey] = useState('');
    const [initLoginPass, setInitLoginPass] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    const [initSuccess, setInitSuccess] = useState(false);

    // Change Password States
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);
    const [changePassError, setChangePassError] = useState<string | null>(null);
    const [changePassSuccess, setChangePassSuccess] = useState(false);

    // --- Vault Initialization Handler ---
    const handleInitializeVault = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!initMasterKey || !initLoginPass) return;

        setIsInitializing(true);
        setInitError(null);
        setInitSuccess(false);

        try {
            // 1. Verify the login password is correct before proceeding
            const isValid = await apiClient.verifyPassword(initLoginPass);
            if (!isValid) {
                setInitError("Incorrect login password.");
                return;
            }

            // 2. Derive key from Login Password to encrypt the Master Key
            const encryptionKey = await deriveKey(initLoginPass);
            const encryptedSecretKey = await encryptText(initMasterKey, encryptionKey);

            // 3. Send to backend
            const updatedUser = await apiClient.updateSecretKey(encryptedSecretKey);

            // 4. Update local redux user state
            dispatch(setAuth({ user: { ...user, encryptedSecretKey: updatedUser.data.encryptedSecretKey }, access_token: token! } as any));
            
            setInitSuccess(true);
            setInitMasterKey('');
            setInitLoginPass('');
        } catch (error: any) {
            console.error(error);
            setInitError(error?.response?.data?.message || "Failed to initialize vault.");
        } finally {
            setIsInitializing(false);
        }
    };

    // --- Change Password Handler ---
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oldPassword || !newPassword || !confirmNewPassword) return;

        if (newPassword !== confirmNewPassword) {
            setChangePassError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 8) {
            setChangePassError("New password must be at least 8 characters.");
            return;
        }

        setIsChangingPass(true);
        setChangePassError(null);
        setChangePassSuccess(false);

        try {
            let newEncryptedSecretKey: string | undefined = undefined;

            // If the user has an initialized vault, we must re-wrap the key!
            if (user?.encryptedSecretKey) {
                try {
                    // Try to derive key and decrypt to make sure old password is correct locally
                    const oldKey = await deriveKey(oldPassword);
                    const plainSecretKey = await decryptText(user.encryptedSecretKey, oldKey);

                    // Re-wrap with new password
                    const newKey = await deriveKey(newPassword);
                    newEncryptedSecretKey = await encryptText(plainSecretKey, newKey);
                } catch (decryptError) {
                    console.error("Local vault unwrap failed: ", decryptError);
                    setChangePassError("Incorrect old password or vault is corrupt.");
                    setIsChangingPass(false);
                    return;
                }
            }

            // Dispatch Request
            const response = await apiClient.changePassword({
                oldPassword,
                newPassword,
                newEncryptedSecretKey
            });

            // Update user in Redux
            dispatch(setAuth({ user: { ...user, encryptedSecretKey: response.data.encryptedSecretKey }, access_token: token! } as any));

            setChangePassSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error: any) {
            console.error(error);
            setChangePassError(error?.response?.data?.message || "Failed to change password.");
        } finally {
            setIsChangingPass(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-gray-50 dark:bg-[#1e2327]">
            <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-32">
                
                <div className="mb-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your authentication details and adjust zero-knowledge encryption protocols.</p>
                </div>

                {/* --- Master Vault Key Initialization Section --- */}
                <section className="bg-white dark:bg-[#252b30] rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Key className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                                    <span>Zero-Knowledge Master Vault Key</span>
                                    {user?.encryptedSecretKey && (
                                        <span className="inline-flex items-center rounded-md bg-green-50 dark:bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">
                                            Initialized
                                        </span>
                                    )}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Create a detached encryption boundary for your credentials.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50/50 dark:bg-transparent">
                        {user?.encryptedSecretKey ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-green-50/30 dark:bg-green-900/5 rounded-xl border border-green-100 dark:border-green-800/30">
                                <CheckCircle2 className="h-12 w-12 text-green-500" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Vault is Encrypted!</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mt-2">
                                        Your master secret key is securely encapsulated by your login password and stored on the server. Your vault data maintains Zero-Knowledge integrity.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleInitializeVault} className="max-w-xl space-y-5">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl flex space-x-3">
                                    <Shield className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-800 dark:text-amber-400/80">
                                        <strong className="block font-semibold mb-1 text-amber-900 dark:text-amber-400">Why Initialize a Master Key?</strong>
                                        By default, your credentials require a Master Key to be encrypted. Create one below to unlock the Password Manager feature. It will be encrypted locally using your account password, so you never have to remember it!
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Master Encryption Key</label>
                                    <input 
                                        type="password"
                                        required
                                        placeholder="Generate a strong 32-character mixed string"
                                        value={initMasterKey}
                                        onChange={e => setInitMasterKey(e.target.value)}
                                        disabled={isInitializing}
                                        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d21] px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm disabled:opacity-50"
                                    />
                                    <p className="text-xs text-gray-500 mt-1.5">This key physically encrypts every credential in your vault.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Wrap with Login Password</label>
                                    <input 
                                        type="password"
                                        required
                                        placeholder="Confirm your account login password"
                                        value={initLoginPass}
                                        onChange={e => setInitLoginPass(e.target.value)}
                                        disabled={isInitializing}
                                        className={`w-full rounded-xl border ${initError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-[#1a1d21] px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm disabled:opacity-50`}
                                    />
                                    {initError && <p className="text-red-500 text-xs mt-2 font-medium">{initError}</p>}
                                    {initSuccess && <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium">Vault Key Successfully Initialized!</p>}
                                </div>

                                <div className="pt-2">
                                    <button 
                                        type="submit" 
                                        disabled={isInitializing || !initMasterKey || !initLoginPass}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 shadow-sm disabled:opacity-50 transition-colors"
                                    >
                                        {isInitializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                                        <span>Initialize Encryption</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </section>

                {/* --- Change Account Password Section --- */}
                <section className="bg-white dark:bg-[#252b30] rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 mb-20">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl">
                                <Lock className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Change Account Password</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Automatically rewrites your Vault Master Key cipher if applicable.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50/50 dark:bg-transparent">
                        <form onSubmit={handleChangePassword} className="max-w-md space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                                <input 
                                    type="password"
                                    required
                                    placeholder="Enter current password"
                                    value={oldPassword}
                                    onChange={e => setOldPassword(e.target.value)}
                                    disabled={isChangingPass}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d21] px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm disabled:opacity-50"
                                />
                            </div>
                            
                            <div className="pt-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                                <input 
                                    type="password"
                                    required
                                    placeholder="Minimum 8 characters"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    disabled={isChangingPass}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d21] px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                                <input 
                                    type="password"
                                    required
                                    placeholder="Retype new password"
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(e.target.value)}
                                    disabled={isChangingPass}
                                    className={`w-full rounded-xl border ${changePassError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-[#1a1d21] px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm disabled:opacity-50`}
                                />
                                {changePassError && <p className="text-red-500 text-xs mt-2 font-medium">{changePassError}</p>}
                                {changePassSuccess && <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium mb-2">Password changed successfully! Vault Key rotated.</p>}
                            </div>

                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isChangingPass || !oldPassword || !newPassword || !confirmNewPassword}
                                    className="bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 shadow-sm disabled:opacity-50 transition-colors"
                                >
                                    {isChangingPass ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : <RotateCcw className="h-4 w-4" />}
                                    <span>Update Password</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
                
            </div>
        </div>
    );
}
