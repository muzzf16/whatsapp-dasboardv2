import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import { FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle, File } from 'lucide-react';

export default function ExcelUpload({ activeConnectionId, status }) {
    const [file, setFile] = useState(null);
    const [isRecurring, setIsRecurring] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ message: '', type: '' });

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadStatus({ message: '', type: '' });
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadStatus({ message: 'Please select an Excel file first.', type: 'error' });
            return;
        }

        if (!activeConnectionId || status !== 'connected') {
            setUploadStatus({ message: 'WhatsApp connection required.', type: 'error' });
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('connectionId', activeConnectionId);
        formData.append('isRecurring', isRecurring);

        try {
            const res = await axios.post(`${API_BASE}/upload-excel`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setUploadStatus({
                message: res.data.message,
                type: res.data.status === 'warning' ? 'warning' : 'success'
            });
            if (res.data.status !== 'warning') {
                setFile(null);
                // Reset file input
                const fileInput = document.getElementById('excel-upload-input');
                if (fileInput) fileInput.value = '';
            }
        } catch (error) {
            console.error("Error uploading Excel:", error);
            setUploadStatus({
                message: error.response?.data?.message || 'Failed to upload Excel file.',
                type: 'error'
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
                <div className="flex items-center">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mr-3">
                        <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Bulk Schedule via Excel</h2>
                        <p className="text-xs text-gray-500">Upload schedules from existing spreadsheets</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Instructions Box */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Required Format
                    </h3>
                    <ul className="list-disc list-inside text-xs text-blue-800 space-y-1 ml-1">
                        <li>Column Headers: <strong>Name, Bill Amount, Due Date, Phone Number</strong></li>
                        <li>Schedules messages for D-1, D+1, and D+3 from Due Date automatically</li>
                    </ul>
                    <div className="mt-3">
                        <a href="/template_jadwal_pesan.xlsx" download className="inline-flex items-center text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline transition-colors">
                            <Download className="w-3 h-3 mr-1" />
                            Download Excel Template
                        </a>
                    </div>
                </div>

                {/* Upload Area */}
                <div className="space-y-4">
                    <div className={`border-2 border-dashed rounded-xl p-8 transition-colors text-center ${file ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50'}`}>
                        <input
                            id="excel-upload-input"
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label htmlFor="excel-upload-input" className="cursor-pointer block">
                            {file ? (
                                <div className="flex flex-col items-center animate-in fade-in zoom-in-95">
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                        <File className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                    <p className="text-xs text-emerald-600 mt-2 font-medium">Click to change file</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-colors">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">Click to upload Excel file</p>
                                    <p className="text-xs text-gray-500 mt-1">or drag and drop here</p>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className="flex items-center space-x-2 p-1">
                        <input
                            type="checkbox"
                            id="excel-recurring-check"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
                        />
                        <label htmlFor="excel-recurring-check" className="text-sm text-gray-700 cursor-pointer select-none">
                            Repeat monthly <span className="text-gray-400 text-xs">(Based on dates in file)</span>
                        </label>
                    </div>

                    {uploadStatus.message && (
                        <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${uploadStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                                uploadStatus.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                    'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {uploadStatus.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                            {uploadStatus.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                            <p>{uploadStatus.message}</p>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={isUploading || !file || !activeConnectionId}
                        className="w-full py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                    >
                        {isUploading ? 'Uploading & Processing...' : 'Upload & Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
}
