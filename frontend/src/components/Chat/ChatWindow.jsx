import React, { useState } from 'react';
import { sendChatMessage } from '../../lib/api';

const ChatWindow = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to SLAW. I am your secure local assistant. All data stays on this machine.' }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [useRag, setUseRag] = useState(true);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setInput('');
    setIsSending(true);

    try {
      const result = await sendChatMessage({ prompt, use_rag: useRag });
      const responseText = result.context_used
        ? `${result.response}\n\nIndexed documents were used for this answer.`
        : result.response;

      setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Request failed: ${error.message}` },
      ]);
    } finally {
      setIsSending(false);
    }
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

      <div className="composer-panel glass-morphism">
        <label className="rag-toggle">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
          />
          Use indexed documents
        </label>

        <div className="input-container">
          <input
            className="text-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the local assistant..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isSending}
          />
          <button onClick={handleSend} className="send-btn" disabled={isSending}>
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
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
        .composer-panel {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 0px;
        }
        .rag-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .input-container {
          display: flex;
          gap: 12px;
        }
        .text-input {
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
        .send-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;
