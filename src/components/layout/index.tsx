import React from 'react'
import './styles.css'

export default function Layout({ children }) {
    return (
        <main className="container">
            <header className="p-7 bg-purple-400 text-center h-40-screen">
                <h1 className="text-white text-6xl font-semibold">😀 Emoji translator</h1>
            </header>

            {children}

            <footer className="px-7 pt-5 bg-gray-200 h-10-screen text-center">
                <em>Created by Youssef Lahssini</em><br />
            </footer>
        </main>
    );
}
