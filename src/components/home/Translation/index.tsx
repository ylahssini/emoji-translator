import React, { useContext } from 'react';
import { TranslatorContext, EmojiContextInterface } from '../../../context';

export default function Translation() {
    const { state } = useContext(TranslatorContext) as unknown as EmojiContextInterface;
    const { translated } = state;

    return (
        <blockquote
            className="flex-initial w-4/4 border-t border-gray-300 h-400 p-4 mt-3 md:border-l md:border-t-0 md:h-4/4 md:w-2/4 md:mt-0"
            dangerouslySetInnerHTML={{ __html: translated }}
        />
    );
}
