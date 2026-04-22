import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user, updateProfile, logout, setupMfa, verifyMfa, disableMfa } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        username: '',
        avatar_url: ''
    });
    const [msg, setMsg] = useState('');
    const [mfaSetupData, setMfaSetupData] = useState(null);
    const [mfaToken, setMfaToken] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                username: user.username || '',
                avatar_url: user.avatar_url || ''
            });
        }
    }, [user]);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        const res = await updateProfile(formData);
        if (res.success) {
            setMsg('Profile Updated Successfully');
            setTimeout(() => setMsg(''), 3000);
        } else {
            setMsg(res.msg);
        }
    };

    const handleMfaSetup = async () => {
        const res = await setupMfa();
        if (res.success) {
            setMfaSetupData(res.data);
        } else {
            setMsg(res.msg);
        }
    };

    const handleMfaVerify = async () => {
        const res = await verifyMfa(mfaToken);
        if (res.success) {
            setMsg('MFA Enabled Successfully');
            setMfaSetupData(null);
            setMfaToken('');
            setTimeout(() => setMsg(''), 3000);
        } else {
            setMsg(res.msg);
        }
    };

    const handleMfaDisable = async () => {
        if (window.confirm('Are you sure you want to disable MFA? Your account will be less secure.')) {
            const res = await disableMfa();
            if (res.success) {
                setMsg('MFA Disabled');
                setTimeout(() => setMsg(''), 3000);
            } else {
                setMsg(res.msg);
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">User Profile</h1>
            <div className="bg-white p-6 rounded shadow-md">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold text-gray-600">
                        {formData.avatar_url ? <img src={formData.avatar_url} alt="Profile" className="h-20 w-20 rounded-full object-cover" /> : formData.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">{user?.username}</h2>
                        <p className="text-gray-500">Joined: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>

                {msg && <div className={`p-3 rounded mb-4 ${msg.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg}</div>}

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-medium">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            disabled
                            className="w-full px-4 py-2 border rounded bg-gray-100 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-medium">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-4 py-2 border rounded bg-gray-100 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-medium">Full Name</label>
                        <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={onChange}
                            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-medium">Avatar URL</label>
                        <input
                            type="text"
                            name="avatar_url"
                            value={formData.avatar_url}
                            onChange={onChange}
                            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="flex justify-between items-center pt-4">
                        <button
                            type="submit"
                            className="px-6 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none"
                        >
                            Update Profile
                        </button>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="px-6 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 focus:outline-none"
                        >
                            Logout
                        </button>
                    </div>
                </form>

                {/* MFA Section */}
                <div className="mt-10 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <span className="mr-2">🛡️</span> Multi-Factor Authentication
                    </h3>
                    
                    {!user?.mfa_enabled ? (
                        <div className="bg-blue-50 p-4 rounded border border-blue-100">
                            <p className="text-sm text-blue-800 mb-4">
                                Protect your account with an additional security layer. Once enabled, you'll need to enter a code from your authenticator app to log in.
                            </p>
                            
                            {!mfaSetupData ? (
                                <button
                                    onClick={handleMfaSetup}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                    Set Up MFA
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center p-4 bg-white rounded border">
                                        <p className="text-xs font-bold uppercase text-gray-500 mb-2">Scan this QR Code</p>
                                        <img src={mfaSetupData.qrCode} alt="MFA QR Code" className="w-48 h-48 mb-2" />
                                        <p className="text-xs text-gray-500 break-all">Secret: <code className="bg-gray-100 p-1 rounded">{mfaSetupData.secret}</code></p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                                        <input
                                            type="text"
                                            value={mfaToken}
                                            onChange={(e) => setMfaToken(e.target.value)}
                                            placeholder="Enter 6-digit code"
                                            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                        />
                                    </div>
                                    
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleMfaVerify}
                                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                        >
                                            Verify & Enable
                                        </button>
                                        <button
                                            onClick={() => setMfaSetupData(null)}
                                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-green-50 p-4 rounded border border-green-100 flex items-center justify-between">
                            <div>
                                <p className="text-green-800 font-medium">✅ MFA is Active</p>
                                <p className="text-xs text-green-700">Your account is protected with 2FA.</p>
                            </div>
                            <button
                                onClick={handleMfaDisable}
                                className="px-3 py-1 text-xs bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition"
                            >
                                Disable MFA
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
