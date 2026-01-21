import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './Upload.css';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

type UploadDetails = {
  projectId: string;
  files: File[];
};

type UploadProps = {
  className?: string;
  defaultProjectId?: string;
  heading?: string;
  description?: string;
  onCommitted?: (details: UploadDetails) => void;
  onQueueChange?: (files: File[]) => void;
};

const Upload = ({
  className = '',
  defaultProjectId = 'week44-example',
  heading = 'Commit Intake Package',
  description = 'Drop weekly intake clips or click to browse.',
  onCommitted,
  onQueueChange,
}: UploadProps) => {
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<UploadState>('idle');
  const [message, setMessage] = useState(description);

  useEffect(() => {
    setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  useEffect(() => {
    if (status === 'idle' && files.length === 0) {
      setMessage(description);
    }
  }, [description, files.length, status]);

  const applyFiles = useCallback(
    (updater: File[] | ((prev: File[]) => File[])) => {
      setFiles((previous) => {
        const next = typeof updater === 'function' ? (updater as (prev: File[]) => File[])(previous) : updater;
        onQueueChange?.(next);
        return next;
      });
    },
    [onQueueChange]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      applyFiles((prev) => [...prev, ...accepted]);
      setStatus('idle');
      setMessage(`${accepted.length} new file${accepted.length === 1 ? '' : 's'} queued.`);
    },
    [applyFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const totalSize = useMemo(() => files.reduce((acc, file) => acc + file.size, 0), [files]);

  const handleSubmit = async () => {
    if (!files.length) {
      setStatus('error');
      setMessage('Select at least one media file before uploading.');
      return;
    }

    try {
      setStatus('uploading');
      setMessage('Uploading intake package to /.netlify/functions/intake-upload…');

      const body = new FormData();
      body.set('projectId', projectId);
      files.forEach((file) => body.append('media', file, file.name));

      const response = await fetch('/.netlify/functions/intake-upload', {
        method: 'POST',
        body,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { message?: string };
      const summary = `Uploaded ${files.length} file${files.length === 1 ? '' : 's'} · ${(
        totalSize /
        (1024 * 1024)
      ).toFixed(1)} MB`;
      setStatus('success');
      setMessage(payload.message ?? summary);

      await fetch('/.netlify/functions/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-correlation-id': `upload-${Date.now()}` },
        body: JSON.stringify({ step: 'intake-upload', status: 'ok', meta: { projectId, files: files.length } }),
      }).catch(() => undefined);

      onCommitted?.({ projectId, files });
    } catch (error) {
      const descriptionText = error instanceof Error ? error.message : String(error);
      setStatus('error');
      setMessage(descriptionText);
    }
  };

  const reset = () => {
    applyFiles([]);
    setStatus('idle');
    setMessage(description);
  };

  return (
    <section className={`upload-card card ${className}`.trim()}>
      <div className="upload-heading">
        <h2>{heading}</h2>
        <p>{description}</p>
      </div>

      <div {...getRootProps({ className: `dropzone ${isDragActive ? 'drag-active' : ''}` })}>
        <input {...getInputProps()} aria-label="Upload weekly recap media" />
        <p>
          <strong>Drop files</strong> or click to browse
        </p>
        <p className="status-line">Project: {projectId}</p>
      </div>

      <label htmlFor="project-id" className="status-line">
        Project identifier
      </label>
      <input
        id="project-id"
        className="project-input"
        value={projectId}
        onChange={(event) => setProjectId(event.target.value)}
        placeholder="week44-example"
      />

      {files.length > 0 && (
        <ul className="file-list" aria-live="polite">
          {files.map((file) => (
            <li key={`${file.name}-${file.lastModified}`} className="file-pill">
              <span>{file.name}</span>
              <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
            </li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button
          type="button"
          className="primary-btn"
          onClick={handleSubmit}
          disabled={status === 'uploading'}
        >
          {status === 'uploading' ? 'Uploading…' : 'Commit Intake'}
        </button>
        <button type="button" className="primary-btn secondary" onClick={reset} disabled={!files.length && status === 'idle'}>
          Reset
        </button>
        <span className={`status-line ${status}`}>{message}</span>
      </div>
    </section>
  );
};

export default Upload;
