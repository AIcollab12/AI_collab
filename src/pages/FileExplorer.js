import React from "react";

function FileExplorer({ files, currentFile, setCurrentFile }) {
  return (
    <div style={explorer}>
      {Object.keys(files).map((file) => (
        <div
          key={file}
          onClick={() => setCurrentFile(file)}
          style={{
            padding: "8px",
            cursor: "pointer",
            background: currentFile === file ? "#333" : "transparent",
          }}
        >
          📄 {file}
        </div>
      ))}
    </div>
  );
}

export default FileExplorer;

const explorer = {
  width: "200px",
  background: "#1e1e1e",
  color: "#fff",
  height: "100vh",
};
