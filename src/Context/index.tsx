import React, { createContext, useReducer } from 'react';
import reducer from './reducer';

const initState = {};
const TranslatorContext = createContext(initState);

const TranslatorProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initState);

    return (
        <TranslatorContext.Provider value={{ state, dispatch }}>
            { children }
        </TranslatorContext.Provider>
    );
}

export { TranslatorContext, TranslatorProvider }