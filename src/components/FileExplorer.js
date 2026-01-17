import React from "react";

function FileExplorer({ files, openFile, addFile }) {
  return (
    <div style={styles.sidebar}>
      <h4>📁 Files</h4>

      {files.map((file) => (
        <div
          key={file.name}
          style={styles.file}
          onClick={() => openFile(file)}
        >
          📄 {file.name}
        </div>
      ))}

      <button style={styles.btn} onClick={addFile}>
        ➕ New File
      </button>
    </div>
  );
}

export default FileExplorer;

const styles = {
  sidebar: {
    width: "220px",
    background: "#020617",
    color: "#fff",
    padding: "10px",
    borderRight: "1px solid #333",
  },
  file: {
    cursor: "pointer",
    padding: "4px",
  },
  btn: {
    marginTop: "10px",
    width: "100%",
  },
};
