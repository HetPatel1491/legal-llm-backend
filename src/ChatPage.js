import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Sidebar from './Sidebar';
import './ChatPage.css';

function ChatPage({ isGuest, onBackToHome, onSignIn, onSignUp }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [responseFormat, setResponseFormat] = useState('detailed');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Load conversations on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadConversations();
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  const loadConversations = async () => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (token && userData && !isGuest) {
      // User is logged in - load from database
      const user = JSON.parse(userData);
      try {
        const response = await fetch(
          `https://legal-llm-backend-production.up.railway.app/conversations/${user.id}`
        );
        const data = await response.json();

        if (data.success && data.conversations.length > 0) {
          setConversations(data.conversations);
          const mostRecent = data.conversations[0];
          setCurrentConversationId(mostRecent.id);
          setMessages(mostRecent.messages);
        } else {
          createNewConversation();
        }
      } catch (error) {
        console.log('Could not load from database, using localStorage');
        loadFromLocalStorage();
      }
    } else {
      // Guest user - load from localStorage AND load question count from device
  const deviceId = localStorage.getItem('device_id');
  const savedQuestionCount = parseInt(localStorage.getItem(`guest_questions_${deviceId}`) || '0');
  setQuestionCount(savedQuestionCount);
  
  loadFromLocalStorage();
    }
  };

  const loadFromLocalStorage = () => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      const convs = JSON.parse(savedConversations);
      setConversations(convs);
      if (convs.length > 0) {
        const mostRecent = convs[0];
        setCurrentConversationId(mostRecent.id);
        setMessages(mostRecent.messages);
        if (isGuest) {
          setQuestionCount(mostRecent.messages.filter(m => m.role === 'user').length);
        }
      }
    } else {
      createNewConversation();
    }
  };

  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setConversations([newConversation, ...conversations]);
    setCurrentConversationId(newId);
    setMessages([]);
    setQuestionCount(0);
  };

  const selectConversation = (id) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setCurrentConversationId(id);
      setMessages(conversation.messages);
      if (isGuest) {
        setQuestionCount(conversation.messages.filter(m => m.role === 'user').length);
      }
    }
    setSidebarOpen(false);
  };

  const deleteConversation = (id) => {
  const updatedConversations = conversations.filter(c => c.id !== id);
  setConversations(updatedConversations);
  
  // Save updated conversations to localStorage immediately
  localStorage.setItem('conversations', JSON.stringify(updatedConversations));
  
  if (currentConversationId === id) {
    if (updatedConversations.length > 0) {
      selectConversation(updatedConversations[0].id);
    } else {
      // Only create new if no conversations left
      const newId = Date.now().toString();
      const newConversation = {
        id: newId,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setConversations([newConversation]);
      setCurrentConversationId(newId);
      setMessages([]);
      setQuestionCount(0);
      localStorage.setItem('conversations', JSON.stringify([newConversation]));
    }
  }
};

  const saveMessagesToConversation = (newMessages) => {
    setConversations(
      conversations.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: newMessages }
          : conv
      )
    );
  };

  const getSystemPrompt = () => {
    const prompts = {
      detailed: `You are an expert legal assistant. ALWAYS format your answers professionally and clearly:

**Introduction:** Start with 1-2 sentences explaining the concept briefly.

**Main Definition & Explanation:** Provide 2-3 detailed paragraphs with comprehensive information.

**Types/Categories:** If applicable, list different types using bullet points (•).

**Key Elements or Features:** Use bullet points for main characteristics, requirements, or components.

**Examples:** Provide practical real-world examples in 1-2 paragraphs.

**Important Notes:** Add any important disclaimers, variations by jurisdiction, or special considerations.

Be accurate, helpful, and practical in your legal explanations.`,

      bullets: `You are a legal assistant. Answer the question ONLY using bullet points. Each bullet should be concise and clear. Include:
- Key definition
- Main points (3-5 bullets)
- Important notes

Keep it brief and scannable.`,

      simple: `You are a legal assistant. Answer the question in ONE paragraph only (3-4 sentences). Be concise and clear. Skip examples and detailed explanations. Just the essential information.`,

      qa: `You are a legal assistant. Format your answer as Q&A:

Q: [Restate the user's question]

A: [Provide a clear, comprehensive answer in 2-3 paragraphs]

Keep it professional and accurate.`
    };

    return prompts[responseFormat] || prompts.detailed;
  };

const handleSendMessage = async () => {
  if (!input.trim()) return;

  // Check guest question limit
  if (isGuest && questionCount >= 5) {
    alert('You have reached the 5 question limit on this device. Please sign in or sign up to continue asking questions!');
    return;
  }

  const userQuestion = input;
  const userMessage = { role: 'user', content: userQuestion };
  const newMessages = [...messages, userMessage];
  setMessages(newMessages);
  saveMessagesToConversation(newMessages);
  setInput('');
  setLoading(true);

  // Increment question count for guests
  if (isGuest) {
    const deviceId = localStorage.getItem('device_id');
    const currentCount = parseInt(localStorage.getItem(`guest_questions_${deviceId}`) || '0');
    const newCount = currentCount + 1;
    localStorage.setItem(`guest_questions_${deviceId}`, newCount);
    setQuestionCount(newCount);
  }

  try {
    const response = await fetch('https://legal-llm-backend-production.up.railway.app/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        question: userQuestion,
        format: responseFormat
      }),
    });

    const data = await response.json();

    let botMessage;
    if (data.success) {
      botMessage = { role: 'bot', content: data.answer };
    } else {
      botMessage = { role: 'bot', content: `Error: ${data.error}` };
    }

    const updatedMessages = [...newMessages, botMessage];
    setMessages(updatedMessages);
    saveMessagesToConversation(updatedMessages);

    // Save to database if user is logged in (not guest)
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData && !isGuest) {
      const user = JSON.parse(userData);
      
      const messagesToSave = updatedMessages.map(msg => ({
        question: msg.role === 'user' ? msg.content : '',
        answer: msg.role === 'bot' ? msg.content : ''
      }));

      try {
        await fetch('https://legal-llm-backend-production.up.railway.app/conversations/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: currentConversationId,
            messages: messagesToSave,
            title: userQuestion.substring(0, 50) || 'Untitled',
            user_id: user.id
          })
        });
      } catch (dbError) {
        console.log('Note: Could not save to database, but chat saved locally');
      }
    }

  } catch (error) {
    const botMessage = { role: 'bot', content: `Error: ${error.message}` };
    const updatedMessages = [...newMessages, botMessage];
    setMessages(updatedMessages);
    saveMessagesToConversation(updatedMessages);
  }

  setLoading(false);
};

  return (
    <div className={`chat-page-with-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
      />

      <div className="chat-page">
        <div className="chat-container">
          <div className="chat-header">
            <button className="back-btn" onClick={onBackToHome}>← Back</button>
            <button className="menu-btn" onClick={toggleSidebar}>☰ Menu</button>
            <h1>⚖️ Legal AI</h1>
            {isGuest && <p className="guest-badge">Guest Mode ({questionCount}/5)</p>}
            
            {isGuest && (
              <div className="auth-buttons">
                <button className="header-btn sign-in-btn" onClick={onSignIn}>
                  Sign In
                </button>
                <button className="header-btn sign-up-btn" onClick={onSignUp}>
                  Sign Up
                </button>
              </div>
            )}
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="empty-state">
                <h2>⚖️ Welcome to Legal AI</h2>
                <p>Ask any legal question and get instant answers</p>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && <div className="message bot loading">
              <div className="message-content">
                <div className="thinking">Thinking...</div>
              </div>
            </div>}
          </div>

          <div className="chat-input-area">
            <select 
              value={responseFormat} 
              onChange={(e) => setResponseFormat(e.target.value)}
              className="format-selector"
              disabled={loading}
            >
              <option value="detailed">Detailed</option>
              <option value="bullets">Bullet Points</option>
              <option value="simple">Simple</option>
              <option value="qa">Q&A</option>
            </select>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a legal question..."
              disabled={loading}
            />
            <button onClick={handleSendMessage} disabled={loading}>
              Send
            </button>
          </div>

          <div className="disclaimer">
            ⚠️ Legal AI is AI and can make mistakes. Please double-check the responses before using them as legal advice.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;