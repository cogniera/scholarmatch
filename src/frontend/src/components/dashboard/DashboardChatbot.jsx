import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, ChevronRight, LoaderCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { sendChatMessage } from '../../services/api';

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

const WELCOME_MESSAGE = "Hi! I'm your ScholarMatch assistant. I can help you:\n\n• **Organize scholarships** — e.g. \"Sort by deadline\" or \"Show highest amount first\"\n• **Filter** — e.g. \"Only show $5000+\" or \"80% match and above\"\n• **Answer questions** — about scholarships, applications, or your profile\n\nWhat would you like to know?";

export default function DashboardChatbot() {
  const { state, dispatch } = useApp();
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME_MESSAGE, ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!userId) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Please sign in or create a profile to use the chat.', ts: Date.now() },
      ]);
      return;
    }

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text, ts: Date.now() }]);
    setLoading(true);

    try {
      const summary = state.scholarshipsForChat?.length
        ? state.scholarshipsForChat
        : null;
      const res = await sendChatMessage(userId, text, null, summary);

      const responseText = res.response || 'I could not generate a response. Please try again.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: responseText, ts: Date.now() },
      ]);

      if (res.organize && typeof res.organize === 'object') {
        dispatch({ type: 'SET_CHAT_ORGANIZE', payload: res.organize });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err?.message || 'Failed to send message. Please try again.',
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderContent = (content) => {
    if (typeof content !== 'string') return content;
    return content.split('\n').map((line, i) => {
      if (line.startsWith('• ')) {
        return (
          <li key={i} className="ml-4 list-disc">
            {line.slice(2).replace(/\*\*(.+?)\*\*/g, '$1')}
          </li>
        );
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-brand-text">
            {line.slice(2, -2)}
          </strong>
        );
      }
      return <p key={i}>{line}</p>;
    });
  };

  return (
    <div
      className={`flex flex-col h-full bg-white border-l border-brand-border transition-all duration-300 ${
        isOpen ? 'w-[360px] min-w-[360px]' : 'w-14 min-w-[56px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-brand-border shrink-0">
        {isOpen ? (
          <>
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-brand-accent" />
              <span className="font-display font-semibold text-brand-text text-sm">ScholarMatch Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors"
              aria-label="Collapse chat"
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-center p-2 text-brand-muted hover:text-brand-accent transition-colors"
            aria-label="Expand chat"
          >
            <MessageCircle size={22} />
          </button>
        )}
      </div>

      {isOpen && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((m) => (
              <div
                key={m.ts}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-brand-accent text-white'
                      : 'bg-brand-bg border border-brand-border text-brand-text'
                  }`}
                >
                  <div className="space-y-1">{renderContent(m.content)}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5">
                  <LoaderCircle size={18} className="animate-spin text-brand-accent" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-brand-border shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about scholarships or how to organize..."
                className="input-field flex-1 text-sm py-2"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="btn-primary py-2 px-4 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
