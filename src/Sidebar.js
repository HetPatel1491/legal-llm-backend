import React from 'react';
import './Sidebar.css';

function Sidebar({ 
  conversations, 
  currentConversationId, 
  onSelectConversation, 
  onNewConversation, 
  onDeleteConversation 
}) {
  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2>⚖️ Legal LLM</h2>
        <button className="new-chat-btn" onClick={onNewConversation}>
          + New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="conversations-list">
        {conversations.length === 0 ? (
          <p className="no-conversations">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                currentConversationId === conv.id ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-preview">
                <p className="conversation-title">
                  {conv.messages[0]?.content.substring(0, 30)}...
                </p>
                <p className="conversation-date">
                  {new Date(conv.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this conversation?'))
                  onDeleteConversation(conv.id);
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <p>Help people understand law</p>
      </div>
    </div>
  );
}

export default Sidebar;