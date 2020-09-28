import React, { useContext, useState } from 'react';
import { TranslatorContext, EmojiContextInterface } from '../../../context';
import JSON_EMOJI from '../../../data/emoji.json';

export interface CollectEmoji {
    keyword: string;
    emoji: string;
}

export default function TextArea() {
    const {
        state: { text, lastText },
        dispatch,
    } = useContext(TranslatorContext) as unknown as EmojiContextInterface;
    const [error, setError] = useState<string | null>(null);

    function handleChange(event) {
        const { value } = event.currentTarget;
        dispatch({ type: 'CHANGE_TEXT', payload: value });

        if (error) {
            setError(null);
        }
    }

    function handleClear() {
        setError(null);
        dispatch({ type: 'CLEAR_TEXT' });
    }

    function handleTranslate() {
        setError(null);

        if (text === '') {
            setError('Please enter your text!');
            return false;
        } else if (text === lastText) {
            setError('You haven\'t changed your text!');
            return false;
        }

        let translated = text;
        const collectEmojis = [] as CollectEmoji[];

        for (let i = 0; i < JSON_EMOJI.length; i += 1) {
            const emoji = JSON_EMOJI[i];

            for (let j = 0; j < emoji.keywords.length; j += 1) {
                const keyword = emoji.keywords[j];
                const regexReplaceByEmoji = new RegExp(`\\b((\\s)*${keyword}(\\s)*)\\b`, 'gi');
                const regexRemoveSpace = new RegExp(`${emoji.emoji}([a-z]+)`, 'gi');

                if (collectEmojis.find((ce) => ce.keyword === keyword)) {
                    break;
                }
                
                if (regexReplaceByEmoji.test(translated)) {
                    translated = translated
                        .replace(regexReplaceByEmoji, ` ${emoji.emoji}`)
                        .replace(regexRemoveSpace, `${emoji.emoji} $1`);

                    collectEmojis.push({ keyword, emoji: emoji.emoji }); 
                }
            }
        }

        for (let m = 0; m < collectEmojis.length; m += 1) {
            const emoji = collectEmojis[m];
            const regexEmoji = new RegExp(`(${collectEmojis[m].emoji})`);
            const regexBreakLines = new RegExp('\\n', 'g');

            translated = translated
                .replace(regexEmoji, `<span title="${emoji.keyword}">$1</span>`)
                .replace(regexBreakLines, '<br />');
        }

        dispatch({ type: 'TRANSLATE_TEXT', payload: translated });
        dispatch({ type: 'SET_LAST_TEXT', payload: text });
    }

    return (
        <div className="flex-initial rounded-tl-md rounded-bl-md w-4/4 md:w-2/4 h-400 md:h-4/4 p-4">
            <textarea
                className="rounded-tl-md rounded-bl-md h-4/4 w-full h-3/4 resize-none placeholder-gray-500"
                placeholder="Enter your text (english)"
                onChange={handleChange}
                value={text}
            />

            <footer className={`inline-flex pt-6 w-full h-1/4 justify-${error ? 'between' : 'end'} items-center`}>
                { error && <strong className="text-red">{error}</strong> }

                <div>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="transition duration-500 ease-in-out bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={handleTranslate}
                        className="transition duration-500 ease-in-out bg-purple-400 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-r"
                    >
                        Translate
                    </button>
                </div>
            </footer>
        </div>
        
    )
}