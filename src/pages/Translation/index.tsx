import React, { useContext } from 'react';
import { TranslatorContext } from '../../Context';

export default function Translation() {
    const { state } = useContext(TranslatorContext);
    const { text } = state;

    return (
        <blockquote className="flex-initial w-2/4 border-l border-gray-300 h-4/4 p-4">
            {text}
        </blockquote>
    );
}
