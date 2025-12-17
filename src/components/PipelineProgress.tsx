import { useEffect, useState, useRef } from 'react';

// Added onComplete prop
export default function PipelineProgress({ projectId, onComplete }: { projectId: string, onComplete: () => void }) {
    const [logs, setLogs] = useState<any[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!projectId) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/.netlify/functions/progress?projectId=${projectId}`);
                const data = await res.json();
                if (data.ok && data.events) {
                    setLogs(data.events);

                    // CHECK FOR COMPLETION
                    const lastEvent = data.events[data.events.length - 1];
                    if (lastEvent && lastEvent.status === 'completed') {
                        onComplete();
                        clearInterval(interval);
                    }
                }
            } catch (e) { console.error(e); }
        }, 2000);
        return () => clearInterval(interval);
    }, [projectId, onComplete]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

    return (
        <div className="progress-console">
            <h3>🤖 Real-Time Orchestrator Log</h3>
            {logs.map((log, i) => (
                <div key={i} className="log-entry">
                    <span className="time">[{log.timestamp ? log.timestamp.split('T')[1].split('.')[0] : '00:00:00'}]</span>
                    <span className={`status ${log.status}`}>{log.step?.toUpperCase()}: {log.status}</span>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
