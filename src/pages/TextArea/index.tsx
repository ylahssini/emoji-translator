import React, { useContext } from 'react';
import { TranslatorContext } from '../../context';
import JSON_EMOJI from '../../data/emoji.json';

export default function TextArea() {
    const { state: { text }, dispatch } = useContext(TranslatorContext);

    function handleChange(event) {
        const { value } = event.currentTarget;
        dispatch({ type: 'CHANGE_TEXT', payload: value });
    }

    function handleClear() {
        dispatch({ type: 'CLEAR_TEXT' });
    }

    function handleTranslate() {
        let translated = text;
        const collectEmojis = [];

        for (let i = 0; i < JSON_EMOJI.length; i += 1) {
            const emoji = JSON_EMOJI[i];

            for (let j = 0; j < emoji.keywords.length; j += 1) {
                const keyword = emoji.keywords[j];
                const regexReplaceByEmoji = new RegExp(`\\b(\\w*${keyword}(\\s)*)\\b`, 'gi');
                const regexRemoveSpace = new RegExp(`${emoji.emoji}([a-z]+)`, 'gi');

                if (regexReplaceByEmoji.test(translated)) {
                    translated = translated
                        .replace(regexReplaceByEmoji, emoji.emoji)
                        .replace(regexRemoveSpace, `${emoji.emoji} $1`);

                    collectEmojis.push({ keyword, emoji: emoji.emoji });
                }
            }
        }

        for (let m = 0; m < collectEmojis.length; m += 1) {
            const emoji = collectEmojis[m];
            const regexEmoji = new RegExp(`(${collectEmojis[m].emoji})`);

            translated = translated.replace(regexEmoji, `<span title="${emoji.keyword}">$1</span>`);
        }

        dispatch({ type: 'TRANSLATE_TEXT', payload: translated });
    }

    return (
        <div className="flex-initial rounded-tl-md rounded-bl-md w-2/4 h-4/4 p-4">
            <textarea
                className="rounded-tl-md rounded-bl-md h-4/4 w-full h-3/4 resize-none placeholder-gray-500"
                placeholder="Enter your text (english)"
                onChange={handleChange}
                value={text}
            />

            <div className="inline-flex pt-6 w-full h-1/4 justify-end">
                <button
                    type="button"
                    onClick={handleClear}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l"
                >
                    Clear
                </button>
                <button
                    type="button"
                    onClick={handleTranslate}
                    className="bg-purple-400 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-r"
                >
                    Translate
                </button>
            </div>
        </div>
        
    )
}