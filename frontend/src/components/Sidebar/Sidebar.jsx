import React from 'react';

const Sidebar = ({ role, setRole }) => {
  return (
    <div className="sidebar glass-morphism">
      <div className="logo-section">
        <h1 className="logo-text">SLAW</h1>
        <span className="logo-sub">Secure Local AI</span>
      </div>
      
      <div className="nav-section">
        <div className="nav-item active">
          <i className="chat-icon"></i>
          <span>Workspace</span>
        </div>
        <div className="nav-item">
          <i className="docs-icon"></i>
          <span>Documents</span>
        </div>
      </div>

      <div className="role-switcher">
        <span className="role-label">Mode:</span>
        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value)}
          className="role-select"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="doc-upload glass-morphism">
          <p>Drop documents to train local AI</p>
          <button className="upload-btn">Upload</button>
      </div>

      <style jsx>{`
        .sidebar {
          width: 280px;
          height: calc(100vh - 40px);
          margin: 20px;
          display: flex;
          flex-direction: column;
          padding: 24px;
          gap: 32px;
        }
        .logo-text {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .logo-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .nav-section {
          flex: 1;
        }
        .nav-item {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: var(--text-muted);
        }
        .nav-item.active {
          background: rgba(99, 102, 241, 0.1);
          color: var(--text-main);
          border-left: 4px solid var(--primary);
        }
        .role-switcher {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
        }
        .role-select {
          background: transparent;
          color: var(--text-main);
          border: none;
          outline: none;
          cursor: pointer;
        }
        .doc-upload {
          padding: 20px;
          text-align: center;
          border: 2px dashed var(--border);
        }
        .upload-btn {
          margin-top: 12px;
          padding: 8px 24px;
          border-radius: 8px;
          background: var(--primary);
          color: white;
          border: none;
          cursor: pointer;
          transition: 0.3s;
        }
        .upload-btn:hover {
          background: var(--primary-hover);
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
