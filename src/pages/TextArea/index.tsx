import React from 'react';

export default function TextArea() {
    return (
        <div className="flex-initial rounded-tl-md rounded-bl-md w-2/4 h-4/4 p-4">
            <textarea
                className="rounded-tl-md rounded-bl-md h-4/4 w-full h-3/4 resize-none placeholder-gray-500"
                placeholder="Enter your text (english)"
            />

            <div className="inline-flex pt-6 w-full h-1/4 justify-end">
                <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l">
                    Clear
                </button>
                <button className="bg-purple-400 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-r">
                    Translate
                </button>
            </div>
        </div>
        
    )
}