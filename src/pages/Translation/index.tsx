import React, { useContext } from 'react';
import { TranslatorContext } from '../../context';

export default function Translation() {
    const { state } = useContext(TranslatorContext);
    const { translated } = state;

    return (
        <blockquote
            className="flex-initial w-2/4 border-l border-gray-300 h-4/4 p-4"
            dangerouslySetInnerHTML={{ __html: translated }}
        />
    );
}
