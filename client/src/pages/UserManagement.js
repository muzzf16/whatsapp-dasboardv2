import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_URL as BASE_API_URL } from '../lib/api';

const UserManagement = () => {
    const { token } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'user'
    });
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const API_URL = `${BASE_API_URL}/api/users`;

    const config = {
        headers: {
            'x-auth-token': token
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get(API_URL, config);
            setUsers(res.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch users');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            if (editMode) {
                await axios.put(`${API_URL}/${editId}`, formData, config);
                setSuccess('User updated successfully');
            } else {
                await axios.post(API_URL, formData, config);
                setSuccess('User created successfully');
            }
            fetchUsers();
            resetForm();
        } catch (err) {
            setError(err.response?.data?.msg || 'Operation failed');
        }
    };

    const onDelete = async id => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await axios.delete(`${API_URL}/${id}`, config);
                setSuccess('User deleted');
                fetchUsers();
            } catch (err) {
                setError('Failed to delete user');
            }
        }
    };

    const onEdit = user => {
        setEditMode(true);
        setEditId(user.id);
        setFormData({
            username: user.username,
            email: user.email,
            password: '', // Don't show password
            full_name: user.full_name,
            role: user.role
        });
    };

    const resetForm = () => {
        setEditMode(false);
        setEditId(null);
        setFormData({
            username: '',
            email: '',
            password: '',
            full_name: '',
            role: 'user'
        });
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">User Management</h1>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
            {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-semibold mb-2">{editMode ? 'Edit User' : 'Add User'}</h2>
                    <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow-md">
                        <div className="mb-4">
                            <label className="block text-gray-700">Username</label>
                            <input type="text" name="username" value={formData.username} onChange={onChange} className="w-full px-3 py-2 border rounded" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={onChange} className="w-full px-3 py-2 border rounded" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">Password {editMode && '(Leave blank to keep current)'}</label>
                            <input type="password" name="password" value={formData.password} onChange={onChange} className="w-full px-3 py-2 border rounded" required={!editMode} />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">Full Name</label>
                            <input type="text" name="full_name" value={formData.full_name} onChange={onChange} className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">Role</label>
                            <select name="role" value={formData.role} onChange={onChange} className="w-full px-3 py-2 border rounded">
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">{editMode ? 'Update' : 'Create'}</button>
                            {editMode && <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>}
                        </div>
                    </form>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-2">Existing Users</h2>
                    <div className="bg-white rounded shadow-md overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="px-4 py-2 text-left">Username</th>
                                    <th className="px-4 py-2 text-left">Email</th>
                                    <th className="px-4 py-2 text-left">Role</th>
                                    <th className="px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b">
                                        <td className="px-4 py-2">{user.username}</td>
                                        <td className="px-4 py-2">{user.email}</td>
                                        <td className="px-4 py-2">{user.role}</td>
                                        <td className="px-4 py-2">
                                            <button onClick={() => onEdit(user)} className="bg-yellow-500 text-white px-2 py-1 rounded mr-2 text-sm">Edit</button>
                                            <button onClick={() => onDelete(user.id)} className="bg-red-500 text-white px-2 py-1 rounded text-sm">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
