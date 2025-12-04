import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../lib/api';

export default function ExcelUpload({ activeConnectionId, status }) {
    const [file, setFile] = useState(null);
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
            setUploadStatus({ message: 'Pilih file Excel terlebih dahulu.', type: 'error' });
            return;
        }

        if (!activeConnectionId || status !== 'connected') {
            setUploadStatus({ message: 'Koneksi WhatsApp harus terhubung.', type: 'error' });
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('connectionId', activeConnectionId);

        try {
            const res = await axios.post(`${API_BASE}/upload-excel`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (res.data.status === 'warning') {
                setUploadStatus({ message: res.data.message, type: 'warning' });
            } else {
                setUploadStatus({ message: res.data.message, type: 'success' });
            }
            setFile(null);
            // Reset file input
            document.getElementById('excel-upload-input').value = '';
        } catch (error) {
            console.error("Error uploading Excel:", error);
            setUploadStatus({
                message: error.response?.data?.message || 'Gagal mengupload file Excel.',
                type: 'error'
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Jadwal via Excel</h2>
            <div className="mb-4 text-sm text-gray-600">
                <p>Format Excel yang didukung:</p>
                <ul className="list-disc list-inside ml-2">
                    <li>Kolom: Nama, No Rekening, Tagihan, Tanggal Jatuh Tempo, Keterangan, Nomor Telepon</li>
                    <li>Sistem akan menjadwalkan pesan untuk H-1, H+1, dan H+3 dari Tanggal Jatuh Tempo.</li>
                </ul>
            </div>

            <div className="flex items-center space-x-4">
                <input
                    id="excel-upload-input"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                />
                <button
                    onClick={handleUpload}
                    disabled={isUploading || !file}
                    className={`px-4 py-2 rounded-md text-white font-medium ${isUploading || !file
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {isUploading ? 'Mengupload...' : 'Upload & Jadwalkan'}
                </button>
            </div>

            {uploadStatus.message && (
                <div className={`mt-4 p-3 rounded ${uploadStatus.type === 'success' ? 'bg-green-100 text-green-700' :
                    uploadStatus.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                    {uploadStatus.message}
                </div>
            )}
        </div>
    );
}
