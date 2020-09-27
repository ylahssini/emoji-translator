import React from 'react'
import { TranslatorProvider } from './src/context';

export const wrapRootElement = ({ element }) => (
    <TranslatorProvider>{element}</TranslatorProvider>
);
