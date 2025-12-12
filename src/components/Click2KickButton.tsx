import React from 'react';
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react';

// Align with CreativeHub states: idle → validating → running → completed/error
// Keep legacy names for compatibility.
type PipelineStatus = 'idle' | 'validating' | 'running' | 'uploading' | 'processing' | 'completed' | 'error';

interface Click2KickButtonProps {
  status: PipelineStatus;
  onClick: () => void;
  disabled?: boolean;
}

export const Click2KickButton: React.FC<Click2KickButtonProps> = ({ 
  status, 
  onClick, 
  disabled 
}) => {
  const getButtonContent = () => {
    switch (status) {
      case 'validating':
      case 'uploading':
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Validating...</span>
          </>
        );
      case 'running':
      case 'processing':
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Agents Working...</span>
          </>
        );
      case 'completed':
        return (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>Complete!</span>
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="w-5 h-5" />
            <span>Try Again</span>
          </>
        );
      default:
        return (
          <>
            <Play className="w-5 h-5" />
            <span>Click2Kick</span>
          </>
        );
    }
  };

  const getButtonClass = () => {
    const base = "w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform";
    
    if (disabled && status === 'idle') {
      return `${base} bg-gray-700 text-gray-400 cursor-not-allowed`;
    }
    
    switch (status) {
      case 'validating':
      case 'uploading':
      case 'running':
      case 'processing':
        return `${base} bg-gradient-to-r from-amber-500 to-orange-500 text-white cursor-wait`;
      case 'completed':
        return `${base} bg-gradient-to-r from-green-500 to-emerald-500 text-white`;
      case 'error':
        return `${base} bg-gradient-to-r from-red-500 to-rose-500 text-white hover:scale-[1.02] active:scale-[0.98]`;
      default:
        return `${base} bg-gradient-to-r from-brand-500 to-accent-purple text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-brand-500/25`;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || status === 'uploading' || status === 'processing'}
      className={getButtonClass()}
    >
      {getButtonContent()}
    </button>
  );
};

export default Click2KickButton;
