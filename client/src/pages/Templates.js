import React, { useState, useEffect } from 'react';
import { getTemplates, addTemplate, updateTemplate, deleteTemplate } from '../lib/templateStore';
import { Plus, Save, Edit, Trash2 } from 'lucide-react';

const Templates = ({ showNotification }) => {
    const [templates, setTemplates] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ id: null, name: '', content: '' });

    useEffect(() => {
        setTemplates(getTemplates());
    }, []);

    const handleEdit = (template) => {
        setIsEditing(true);
        setCurrentTemplate(template);
    };

    const handleDelete = (templateId) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus template ini?')) {
            deleteTemplate(templateId);
            setTemplates(getTemplates());
            showNotification('Template berhasil dihapus', 'success');
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!currentTemplate.name || !currentTemplate.content) {
            showNotification('Nama dan isi template tidak boleh kosong', 'error');
            return;
        }

        if (isEditing) {
            updateTemplate(currentTemplate);
            showNotification('Template berhasil diperbarui', 'success');
        } else {
            addTemplate({ ...currentTemplate, id: Date.now().toString() });
            showNotification('Template baru berhasil disimpan', 'success');
        }

        setTemplates(getTemplates());
        handleCancel();
    };

    const handleCancel = () => {
        setIsEditing(false);
        setCurrentTemplate({ id: null, name: '', content: '' });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    {isEditing ? 'Edit Template' : 'Buat Template Baru'}
                </h2>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">Nama Template</label>
                        <input
                            type="text"
                            id="templateName"
                            value={currentTemplate.name}
                            onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                            placeholder="Contoh: Ucapan Selamat Pagi"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="templateContent" className="block text-sm font-medium text-gray-700">Isi Pesan</label>
                        <textarea
                            id="templateContent"
                            rows="5"
                            value={currentTemplate.content}
                            onChange={(e) => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
                            placeholder="Halo {nama}, semoga harimu menyenangkan!"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                                                                        <p className="mt-1 text-xs text-gray-500">{'Gunakan kurung kurawal untuk variabel, contoh: \'{{nama}}\' atau \'{{order_id}}\'.'}</p>
                    </div>
                    <div className="flex justify-end gap-4">
                        {isEditing && (
                            <button type="button" onClick={handleCancel} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                Batal
                            </button>
                        )}
                        <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                            <Save className="-ml-1 mr-2 h-5 w-5" />
                            Simpan Template
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Daftar Template</h2>
                <div className="space-y-3">
                    {templates.length > 0 ? templates.map(template => (
                        <div key={template.id} className="p-4 border rounded-lg flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-gray-800">{template.name}</p>
                                <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{template.content}</p>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <button onClick={() => handleEdit(template)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(template.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-4">Belum ada template yang disimpan.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Templates;
