import React from 'react'
import Layout from '../components/layout';
import TextArea from '../components/home/TextArea';
import Translation from '../components/home/Translation';

export default function Home() {
    return (
        <Layout title="😀 Emoji translator">
            <div className="h-50-screen">
                <div className="bg-white block md:flex shadow-2xl border-gray-600 rounded-md w-3/4 h-auto md:h-600 mx-auto relative -top-16">
                    <TextArea />
                    <Translation />
                </div>
            </div>
        </Layout>
    );
}
