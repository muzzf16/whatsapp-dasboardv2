import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user, updateProfile, logout } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        username: '',
        avatar_url: ''
    });
    const [msg, setMsg] = useState('');
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
            </div>
        </div>
    );
};

export default Profile;
