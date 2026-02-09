import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Notification from '../components/Notification';
import { API_URL } from '../lib/api';
import { Users, Search, UserPlus, Edit2, Trash2, Phone, Mail, Tag, Save, X } from 'lucide-react';

const ContactManager = () => {
    const [contacts, setContacts] = useState([]);
    const [search, setSearch] = useState('');
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', tags: '', notes: '' });
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    };

    const fetchContacts = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/contacts?search=${search}`);
            setContacts(res.data);
        } catch (err) {
            console.error('Error fetching contacts', err);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchContacts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingContact) {
                await axios.put(`${API_URL}/api/contacts/${editingContact.id}`, formData);
                showNotification('Contact updated successfully', 'success');
            } else {
                await axios.post(`${API_URL}/api/contacts`, formData);
                showNotification('Contact added successfully', 'success');
            }
            setFormData({ name: '', phone: '', email: '', tags: '', notes: '' });
            setEditingContact(null);
            fetchContacts();
        } catch (err) {
            showNotification(err.response?.data?.msg || 'Error saving contact', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = contact => {
        setEditingContact(contact);
        setFormData(contact);
    };

    const handleDelete = async id => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;
        try {
            await axios.delete(`${API_URL}/api/contacts/${id}`);
            showNotification('Contact deleted', 'success');
            fetchContacts();
        } catch (err) {
            showNotification(err.response?.data?.msg || 'Error deleting contact', 'error');
        }
    };

    const handleCancel = () => {
        setEditingContact(null);
        setFormData({ name: '', phone: '', email: '', tags: '', notes: '' });
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto font-sans">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="w-8 h-8 text-blue-600" />
                        Contact Manager
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your customer database</p>
                </div>
            </div>

            <div className="fixed top-4 right-4 z-50">
                <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-8">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {editingContact ? <Edit2 className="w-4 h-4 text-blue-500" /> : <UserPlus className="w-4 h-4 text-green-500" />}
                                {editingContact ? 'Edit Contact' : 'Add New Contact'}
                            </h2>
                        </div>
                        <form onSubmit={onSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={onChange}
                                    className="block w-full px-4 py-2.5 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phone (Required)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={onChange}
                                        required
                                        className="block w-full pl-10 pr-4 py-2.5 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono"
                                        placeholder="628123456789"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={onChange}
                                        className="block w-full pl-10 pr-4 py-2.5 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tags</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Tag className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={onChange}
                                        className="block w-full pl-10 pr-4 py-2.5 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                        placeholder="client, vip, active"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">Comma separated</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={onChange}
                                    className="block w-full px-4 py-2.5 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm resize-none"
                                    rows="3"
                                    placeholder="Additional details..."
                                ></textarea>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 flex justify-center items-center py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all"
                                >
                                    {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> {editingContact ? 'Update Contact' : 'Save Contact'}</>}
                                </button>
                                {editingContact && (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="block w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 bg-white shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Info</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tags</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {contacts.length > 0 ? (
                                        contacts.map(contact => (
                                            <tr key={contact.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                            {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-bold text-gray-900">{contact.name || 'No Name'}</div>
                                                            <div className="text-xs text-gray-500">{contact.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-600 font-mono">
                                                        <Phone className="w-3 h-3 mr-2 text-gray-400" />
                                                        {contact.phone}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-wrap gap-1">
                                                        {contact.tags ? contact.tags.split(',').map((tag, i) => (
                                                            <span key={i} className="px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                                {tag.trim()}
                                                            </span>
                                                        )) : <span className="text-gray-400 text-xs">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(contact)}
                                                            className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(contact.id)}
                                                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <Users className="w-12 h-12 mb-3 opacity-20" />
                                                    <p className="text-sm font-medium">No contacts found</p>
                                                    <p className="text-xs mt-1">Add a new contact to get started</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactManager;
