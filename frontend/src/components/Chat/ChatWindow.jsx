import React, { useState } from 'react';

const ChatWindow = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to SLAW. I am your secure local assistant. All data stays on this machine.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: "Secure analysis complete. Local model (Ollama) is processing your request..." }]);
    }, 1000);
  };

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message-wrapper ${msg.role}`}>
            <div className={`message glass-morphism`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="input-container glass-morphism">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a secure message..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="send-btn">Send</button>
      </div>

      <style jsx>{`
        .chat-window {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 40px);
          margin: 20px 20px 20px 0;
          gap: 20px;
        }
        .messages-container {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
        }
        .message-wrapper {
          display: flex;
        }
        .message-wrapper.user {
          justify-content: flex-end;
        }
        .message {
          max-width: 70%;
          padding: 12px 18px;
          border-radius: 18px;
          line-height: 1.5;
        }
        .user .message {
          background: var(--primary);
          border-bottom-right-radius: 4px;
        }
        .assistant .message {
          background: var(--bg-card);
          border-bottom-left-radius: 4px;
        }
        .input-container {
          padding: 12px;
          display: flex;
          gap: 12px;
          margin-bottom: 0px;
        }
        input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 12px;
          outline: none;
          font-size: 1rem;
        }
        .send-btn {
          background: var(--primary);
          border: none;
          padding: 10px 24px;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;
