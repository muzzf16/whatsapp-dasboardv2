import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const Notification = ({ message, type, onClose }) => {
    if (!message) return null;

    const isSuccess = type === 'success';

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-y-0 ${isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
            {isSuccess ? <CheckCircle className="w-5 h-5 mr-3" /> : <AlertCircle className="w-5 h-5 mr-3" />}
            <div className="text-sm font-medium">{message}</div>
            <button
                onClick={onClose}
                className={`ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 ${isSuccess
                        ? 'text-emerald-500 hover:bg-emerald-100'
                        : 'text-rose-500 hover:bg-rose-100'
                    }`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Notification;
