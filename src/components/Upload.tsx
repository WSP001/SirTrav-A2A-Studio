import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * Upload Component - File upload with drag & drop
 * 
 * Features:
 * - Drag and drop file upload
 * - Multiple file support
 * - File type validation
 * - Upload progress tracking
 * - Preview for images
 */

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

interface UploadProps {
  projectId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number; // bytes
}

const DEFAULT_ACCEPT = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.mov', '.avi', '.webm'],
  'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
};

export default function Upload({
  projectId,
  onUploadComplete,
  onError,
  accept = DEFAULT_ACCEPT,
  maxFiles = 20,
  maxSize = 50 * 1024 * 1024, // 50MB
}: UploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(r => 
        `${r.file.name}: ${r.errors.map((e: any) => e.message).join(', ')}`
      );
      onError?.(errors.join('\n'));
    }

    // Add accepted files
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
  });

  const uploadFile = async (uploadFile: UploadedFile): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('projectId', projectId);

    try {
      const response = await fetch('/.netlify/functions/intake-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        ...uploadFile,
        status: 'completed',
        progress: 100,
        url: result.url || result.data?.url,
      };
    } catch (error) {
      return {
        ...uploadFile,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    
    const pendingFiles = files.filter(f => f.status === 'pending');
    const results: UploadedFile[] = [];

    for (const file of pendingFiles) {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading' as const, progress: 50 } : f
      ));

      const result = await uploadFile(file);
      results.push(result);

      // Update with result
      setFiles(prev => prev.map(f => 
        f.id === file.id ? result : f
      ));
    }

    setIsUploading(false);
    
    const successful = results.filter(f => f.status === 'completed');
    if (successful.length > 0) {
      onUploadComplete?.(successful);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'completed').length;

  return (
    <div className="upload-container">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
        style={{
          border: '2px dashed',
          borderColor: isDragActive ? '#10b981' : '#374151',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(55, 65, 81, 0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
        {isDragActive ? (
          <p style={{ color: '#10b981', fontWeight: 600 }}>Drop files here...</p>
        ) : (
          <>
            <p style={{ color: '#e5e7eb', fontWeight: 500 }}>
              Drag & drop files here, or click to select
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Images, videos, audio • Max {maxFiles} files • {Math.round(maxSize / 1024 / 1024)}MB each
            </p>
          </>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: '#e5e7eb' }}>
              {files.length} file{files.length !== 1 ? 's' : ''} selected
              {completedCount > 0 && ` • ${completedCount} uploaded`}
            </span>
            <button
              onClick={clearAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Clear all
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {files.map(file => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  borderRadius: '8px',
                }}
              >
                {/* Preview */}
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(107, 114, 128, 0.3)',
                    borderRadius: '6px',
                    fontSize: '1.5rem',
                  }}>
                    {file.file.type.startsWith('video/') ? '🎬' : 
                     file.file.type.startsWith('audio/') ? '🎵' : '📄'}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ 
                    color: '#e5e7eb', 
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.file.name}
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {file.status === 'pending' && (
                    <span style={{ color: '#9ca3af' }}>⏳</span>
                  )}
                  {file.status === 'uploading' && (
                    <span style={{ color: '#3b82f6' }}>⬆️</span>
                  )}
                  {file.status === 'completed' && (
                    <span style={{ color: '#10b981' }}>✅</span>
                  )}
                  {file.status === 'error' && (
                    <span style={{ color: '#ef4444' }} title={file.error}>❌</span>
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '0.25rem',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          {pendingCount > 0 && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.75rem',
                backgroundColor: isUploading ? '#4b5563' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { Upload };
