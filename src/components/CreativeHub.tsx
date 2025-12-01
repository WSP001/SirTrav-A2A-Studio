import React, { useState, useCallback } from "react";
import { Upload, FileText, Music, Film, X } from "lucide-react";
import "./CreativeHub.css";

const CreativeHub = () => {
  const [projectId, setProjectId] = useState(() => `PROJ-${Date.now()}`);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="creative-hub-container">
      <div className="hub-header">
        <h2>Creative Hub</h2>
        <div className="project-id-control">
          <label htmlFor="project-id">Project ID:</label>
          <input
            id="project-id"
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="project-id-input"
            aria-label="Project Identifier"
          />
        </div>
      </div>

      <div
        className={`dropzone ${isDragging ? "active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="File Upload Dropzone"
        tabIndex={0}
      >
        <Upload className="upload-icon" aria-hidden="true" />
        <p>Drag & drop assets here or click to upload</p>
        <span className="supported-formats">Supports: .txt, .mp3, .mp4, .jpg</span>
      </div>

      {files.length > 0 && (
        <ul className="file-list" aria-label="Uploaded Files">
          {files.map((file, index) => (
            <li key={index} className="file-item">
              <div className="file-info">
                {file.type.startsWith("image") ? <FileText size={16} /> : 
                 file.type.startsWith("audio") ? <Music size={16} /> : 
                 file.type.startsWith("video") ? <Film size={16} /> : <FileText size={16} />}
                <span className="file-name">{file.name}</span>
              </div>
              <button 
                onClick={() => removeFile(index)}
                className="remove-btn"
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CreativeHub;
