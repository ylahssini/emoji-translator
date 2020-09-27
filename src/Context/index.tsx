import React, { createContext, useReducer } from 'react';
import reducer, { initState } from './reducer';
import { EmojiContextInterface } from './interface';

const TranslatorContext = createContext(initState);

const TranslatorProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initState);

    return (
        <TranslatorContext.Provider value={{ state, dispatch }}>
            { children }
        </TranslatorContext.Provider>
    );
}

export { TranslatorContext, TranslatorProvider, EmojiContextInterface }