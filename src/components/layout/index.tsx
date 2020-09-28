import React from 'react';
import { Helmet } from 'react-helmet';
import { TranslatorProvider } from '../../context';
import './styles.css'

export default function Layout({ title, children }) {
    return (
        <main className="w-full">
            <Helmet>
                <title>😀 Emoji translator - created by Youssef Lahssini</title>
            </Helmet>

            <header className="p-7 bg-purple-400 text-center h-40-screen flex justify-center items-end">
                <h1 className="text-white text-4xl md:text-6xl font-semibold pb-7 mb-7">{title}</h1>
            </header>

            <TranslatorProvider>
                {children}
            </TranslatorProvider>

            <footer className="px-7 pt-5 bg-gray-200 h-10-screen text-center">
                <em>Created by Youssef Lahssini</em><br />
            </footer>
        </main>
    );
}
