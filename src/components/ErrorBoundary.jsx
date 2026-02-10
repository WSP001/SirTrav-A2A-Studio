import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0a0a1a',
                    color: 'white',
                    padding: '24px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                    <div style={{
                        maxWidth: '480px',
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '16px',
                        padding: '32px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                        <h1 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: '#f87171',
                            marginBottom: '8px',
                        }}>
                            Something went wrong
                        </h1>
                        <p style={{
                            color: '#94a3b8',
                            fontSize: '0.875rem',
                            marginBottom: '16px',
                        }}>
                            The SirTrav A2A Studio encountered a critical error.
                        </p>
                        <pre style={{
                            background: 'rgba(0,0,0,0.4)',
                            padding: '12px',
                            borderRadius: '8px',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            color: '#fca5a5',
                            overflow: 'auto',
                            maxHeight: '120px',
                            marginBottom: '16px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}>
                            {this.state.error?.toString()}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '10px 24px',
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                            onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                            onMouseOut={(e) => e.target.style.background = '#dc2626'}
                        >
                            Reload Application
                        </button>
                        <p style={{
                            marginTop: '16px',
                            fontSize: '0.75rem',
                            color: '#64748b',
                        }}>
                            Build: v2.0.0 | For the Commons Good 🌍
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
