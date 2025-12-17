import { useState } from 'react';

interface Props {
    projectId: string;
    videoUrl: string;
    onReset: () => void;
}

export default function ResultsPreview({ projectId, videoUrl, onReset }: Props) {
    const [voted, setVoted] = useState(false);

    const handleVote = async (rating: 'good' | 'bad') => {
        await fetch('/.netlify/functions/submit-evaluation', {
            method: 'POST',
            body: JSON.stringify({ projectId, rating })
        });
        setVoted(true);
    };

    return (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 text-center animate-fade-in">
            <h2 className="text-2xl font-bold text-green-400 mb-4">🎉 Production Complete!</h2>
            <div className="text-xs text-slate-500 mb-2">ID: {projectId}</div>

            <div className="mb-6 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
                <video controls autoPlay className="w-full aspect-video bg-black" src={videoUrl}>
                    Your browser does not support the video tag.
                </video>
            </div>

            {!voted ? (
                <div className="flex justify-center gap-4 mb-6">
                    <button onClick={() => handleVote('good')} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-full font-bold">👍 Good Run</button>
                    <button onClick={() => handleVote('bad')} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-full font-bold">👎 Bad Run</button>
                </div>
            ) : (
                <div className="text-blue-400 font-bold mb-6 animate-pulse">Thanks for the feedback! Memory Updated. 🧠</div>
            )}

            <button onClick={onReset} className="mt-6 text-slate-500 hover:text-white underline">Start New Project</button>
        </div>
    );
}
