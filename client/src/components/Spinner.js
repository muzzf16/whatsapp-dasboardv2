import React from 'react';

// Komponen Spinner sederhana menggunakan Tailwind CSS
const Spinner = ({ size = 'h-8 w-8', color = 'border-blue-500' }) => {
    return (
        <div className={`animate-spin rounded-full ${size} border-t-2 border-b-2 ${color}`}></div>
    );
};

export const FullPageSpinner = () => {
    return (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex justify-center items-center z-50">
            <Spinner size="h-16 w-16" />
        </div>
    );
};

export const ContentSpinner = () => {
    return (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex justify-center items-center z-10">
            <Spinner />
        </div>
    );
}

export default Spinner;
