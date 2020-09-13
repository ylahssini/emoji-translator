import React from 'react'
import Layout from '../components/Layout';
import TextArea from './TextArea';

export default function Home() {
    return (
        <Layout>
            <div className="h-50-screen">
                <div className="bg-white flex shadow-2xl border-gray-600 rounded-md w-3/4 h-600 mx-auto relative -top-16">
                    <TextArea />

                    <blockquote className="flex-initial w-2/4 border-l border-gray-300 h-4/4 p-4">

                    </blockquote>
                </div>
            </div>
        </Layout>
    )
}
