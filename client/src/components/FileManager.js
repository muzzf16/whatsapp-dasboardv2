import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FolderOpen, Upload, Trash2, File, Image as ImageIcon, Copy, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { API_URL } from '../lib/api';

const FileManager = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/files`);
            if (res.data.success) {
                setFiles(res.data.files);
            }
        } catch (error) {
            console.error("Error fetching files:", error);
            showNotification("Failed to load files.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input immediately so same file can be selected again
        e.target.value = null;

        if (file.size > 25 * 1024 * 1024) {
             showNotification("File size exceeds 25MB limit.", "error");
             return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_URL}/api/files/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                showNotification("File uploaded successfully!", "success");
                fetchFiles();
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            showNotification("Failed to upload file.", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (filename) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;

        try {
            const res = await axios.delete(`${API_URL}/api/files/${encodeURIComponent(filename)}`);
            if (res.data.success) {
                showNotification("File deleted successfully.", "success");
                fetchFiles();
            }
        } catch (error) {
            console.error("Error deleting file:", error);
            showNotification(error.response?.data?.message || "Failed to delete file.", "error");
        }
    };

    const previewFile = async (file) => {
        try {
            const response = await axios.get(`${API_URL}${file.url}`, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(response.data);
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
        } catch (error) {
            console.error("Error previewing file:", error);
            showNotification("Failed to preview file.", "error");
        }
    };

    const copyToClipboard = (url) => {
        const fullUrl = `${API_URL}${url}`;
        navigator.clipboard.writeText(fullUrl);
        showNotification("Protected file URL copied. Login is required to access it.", "success");
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
            return <ImageIcon className="w-10 h-10 text-emerald-500" />;
        }
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
            return <FileText className="w-10 h-10 text-blue-500" />;
        }
        return <File className="w-10 h-10 text-gray-400" />;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 font-sans">
            {notification.message && (
                <div className={`fixed top-8 right-8 p-4 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right z-50 flex items-center gap-3 bg-white ${notification.type === 'success' ? 'text-green-600 border-green-100' : 'text-red-600 border-red-100'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span>{notification.message}</span>
                </div>
            )}

            {/* Header / Upload Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                <div className="flex items-center">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mr-4 border border-blue-100">
                        <FolderOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">File Manager</h2>
                        <p className="text-sm text-gray-500 mt-1">Easily manage your local uploads directly from the dashboard.</p>
                    </div>
                </div>

                <div className="w-full md:w-auto">
                     <input
                         id="file-upload-input"
                         type="file"
                         onChange={handleFileUpload}
                         className="hidden"
                         disabled={uploading}
                     />
                     <label
                         htmlFor="file-upload-input"
                         className={`inline-flex items-center justify-center w-full md:w-auto px-6 py-3 rounded-xl shadow-sm text-sm font-semibold text-white transition-all cursor-pointer ${uploading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                     >
                         <Upload className="w-4 h-4 mr-2" />
                         {uploading ? 'Uploading...' : 'Upload File'}
                     </label>
                </div>
            </div>

            {/* Grid Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 md:p-8">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-medium animate-pulse">Loading directory contents...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        <FolderOpen className="w-16 h-16 text-gray-200 mb-2" />
                        <p className="text-gray-500 font-medium">No files uploaded yet</p>
                        <p className="text-xs mt-1">Upload a file above to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {files.map((file) => (
                            <div key={file.name} className="group border border-gray-100 rounded-xl p-4 hover:shadow-lg transition-all bg-gray-50/30 flex flex-col relative overflow-hidden">
                                <div className="flex justify-center items-center h-24 mb-3 bg-white rounded-lg border border-gray-50 group-hover:scale-[1.02] transition-transform">
                                     {getFileIcon(file.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-gray-800 truncate mb-1" title={file.name}>{file.name}</h3>
                                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                                        <span>{formatBytes(file.size)}</span>
                                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                
                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => previewFile(file)}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Preview"
                                    >
                                        <File className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => copyToClipboard(file.url)}
                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                        title="Copy Link"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(file.name)}
                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileManager;
