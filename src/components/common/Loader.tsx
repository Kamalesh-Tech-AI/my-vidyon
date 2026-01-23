import React from 'react';

const Loader = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <div className="relative flex flex-col items-center justify-center animate-pulse">
                <img
                    src="/logo.png"
                    alt="Loading..."
                    className="h-24 w-24 rounded-full object-contain"
                />
            </div>
        </div>
    );
};

export default Loader;
