import { useMemo } from "react";
import { Send, X } from "lucide-react";

export function ChatPanel({ currentUser, chatMessages, chatInput, setChatInput, sendChatMessage, onClose }) {
  const displayMessages = useMemo(() => {
    return [...chatMessages].slice(-20);
  }, [chatMessages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!chatInput.trim() || !currentUser?.email) {
      return;
    }
    // Use displayName from profile, fallback to username, then email
    const senderName = currentUser.profile?.displayName || currentUser.username || currentUser.email;
    await sendChatMessage(senderName, chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-xl w-full max-w-[320px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Live Trader Chat</h3>
          <p className="text-xs text-muted-foreground">{currentUser?.roles?.map((role) => role.name).join(', ') || 'Guest'}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-slate-900/90"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-2xl border border-[#DC2626]/30 bg-[#1a0505] p-4 text-sm text-white">
        {displayMessages.length === 0 ? (
          <div className="text-center text-gray-400">No chat messages yet.</div>
        ) : (
          displayMessages.map((message) => (
            <div key={message.id} className="mb-3 last:mb-0">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="font-semibold text-[#ff6b6b]">{message.sender}</span>
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="rounded-2xl bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white">{message.text}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder={currentUser ? "Type a message..." : "Login to join the chat"}
          disabled={!currentUser}
          className="flex-1 rounded-2xl border border-[#DC2626]/30 bg-[#1a0505] px-4 py-3 text-sm text-foreground outline-none focus:border-[#DC2626] focus:ring-[#DC2626] min-w-0"
        />
        <button
          type="submit"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DC2626] text-sm font-semibold text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!currentUser || !chatInput.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
