import React, { useState } from 'react';
import axios from 'axios';
import './FileUpload.css';

const FileUpload = ({ socket, roomId, userId }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await axios.post(
        `http://localhost:5000/upload/${roomId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      console.log('File uploaded:', response.data);
      setUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <h3>File Sharing</h3>
      <div className="upload-area">
        <label htmlFor="file-upload" className="upload-label">
          <div className="upload-icon">📁</div>
          <div>Click to upload files</div>
          <div className="upload-hint">Supports: images, documents, code files</div>
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileUpload}
          className="file-input"
          multiple
        />
      </div>
      
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span>{uploadProgress}%</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;