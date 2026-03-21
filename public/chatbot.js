(function() {
  const API_URL = window.OMNI_CHAT_API || '/api/chat';
  let messages = [];
  let isOpen = false;
  let isTyping = false;

  // Theme - configurable via window.OMNI_CHAT_THEME
  const t = window.OMNI_CHAT_THEME || {};
  const C = {
    primary: t.primary || '#bf1e2e',       // button & user msg bg
    primaryDark: t.primaryDark || '#9a1824', // hover
    header: t.header || '#002868',          // header bg
    headerText: t.headerText || '#ffffff',
    bg: t.bg || '#0f1729',                  // chat window bg
    msgBg: t.msgBg || '#1a2744',            // bot msg bg
    msgText: t.msgText || '#e8ecf4',        // bot msg text
    userText: t.userText || '#ffffff',       // user msg text
    inputBg: t.inputBg || '#0a1020',        // input area bg
    inputField: t.inputField || '#1a2744',  // input field bg
    border: t.border || '#1e3a5f',
    accent: t.accent || '#d4a84b',          // focus/accent
    btnText: t.btnText || '#ffffff',        // button icon color
  };

  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    #omni-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 60px; height: 60px; border-radius: 50%;
      background: ${C.primary};
      border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #omni-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.4); background: ${C.primaryDark}; }
    #omni-chat-btn svg { width: 28px; height: 28px; fill: ${C.btnText}; }
    #omni-chat-btn .close-icon { display: none; }
    #omni-chat-btn.open .chat-icon { display: none; }
    #omni-chat-btn.open .close-icon { display: block; }

    #omni-chat-window {
      position: fixed; bottom: 96px; right: 24px; z-index: 9998;
      width: 380px; max-height: 520px; border-radius: 16px;
      background: ${C.bg}; border: 1px solid ${C.border};
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      display: none; flex-direction: column; overflow: hidden;
      font-family: 'Inter', -apple-system, sans-serif;
    }
    #omni-chat-window.open { display: flex; }

    #omni-chat-header {
      padding: 16px 20px; background: ${C.header};
      border-bottom: 1px solid ${C.border}; display: flex; align-items: center; gap: 12px;
    }
    #omni-chat-header .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: ${C.primary};
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; color: ${C.btnText};
    }
    #omni-chat-header .info h4 { margin: 0; font-size: 14px; color: ${C.headerText}; font-weight: 600; }
    #omni-chat-header .info p { margin: 0; font-size: 11px; color: ${C.accent}; }

    #omni-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
      max-height: 340px; min-height: 200px;
    }
    #omni-chat-messages::-webkit-scrollbar { width: 4px; }
    #omni-chat-messages::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }

    .omni-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; word-wrap: break-word; }
    .omni-msg.bot { background: ${C.msgBg}; color: ${C.msgText}; align-self: flex-start; border-bottom-left-radius: 4px; }
    .omni-msg.user { background: ${C.primary}; color: ${C.userText}; align-self: flex-end; border-bottom-right-radius: 4px; font-weight: 500; }
    .omni-msg.typing { opacity: 0.7; }
    .omni-msg.typing span { display: inline-block; animation: omni-bounce 1.4s infinite; }
    .omni-msg.typing span:nth-child(2) { animation-delay: 0.2s; }
    .omni-msg.typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes omni-bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }

    #omni-chat-input-area {
      padding: 12px 16px; border-top: 1px solid ${C.border}; display: flex; gap: 8px;
      background: ${C.inputBg};
    }
    #omni-chat-input {
      flex: 1; padding: 10px 14px; background: ${C.inputField}; border: 1px solid ${C.border};
      border-radius: 8px; color: ${C.msgText}; font-size: 13px; font-family: inherit;
      outline: none; resize: none;
    }
    #omni-chat-input:focus { border-color: ${C.accent}; }
    #omni-chat-input::placeholder { color: #6b7b9a; }
    #omni-chat-send {
      width: 38px; height: 38px; border-radius: 8px; border: none; cursor: pointer;
      background: ${C.primary};
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s;
    }
    #omni-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #omni-chat-send svg { width: 16px; height: 16px; fill: ${C.btnText}; }

    @media (max-width: 480px) {
      #omni-chat-window { width: calc(100vw - 16px); right: 8px; bottom: 88px; max-height: 70vh; }
      #omni-chat-btn { bottom: 16px; right: 16px; width: 54px; height: 54px; }
    }
  `;
  document.head.appendChild(style);

  // Create chat button
  const btn = document.createElement('button');
  btn.id = 'omni-chat-btn';
  btn.innerHTML = `
    <svg class="chat-icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <svg class="close-icon" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#0a0a0a" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>
  `;
  btn.onclick = toggleChat;
  document.body.appendChild(btn);

  // Create chat window
  const win = document.createElement('div');
  win.id = 'omni-chat-window';
  win.innerHTML = `
    <div id="omni-chat-header">
      <div class="avatar">O</div>
      <div class="info">
        <h4>Omni Gaming</h4>
        <p>Skill Games Texas Assistant</p>
      </div>
    </div>
    <div id="omni-chat-messages"></div>
    <div id="omni-chat-input-area">
      <input id="omni-chat-input" type="text" placeholder="Ask about skill games..." />
      <button id="omni-chat-send"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
    </div>
  `;
  document.body.appendChild(win);

  const msgContainer = document.getElementById('omni-chat-messages');
  const input = document.getElementById('omni-chat-input');
  const sendBtn = document.getElementById('omni-chat-send');

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener('click', sendMessage);

  // Auto-open after 8 seconds if user hasn't opened it
  const autoOpenDelay = window.OMNI_CHAT_DELAY || 8000;
  setTimeout(function() {
    if (!isOpen) {
      toggleChat();
    }
  }, autoOpenDelay);

  function toggleChat() {
    isOpen = !isOpen;
    btn.classList.toggle('open', isOpen);
    win.classList.toggle('open', isOpen);
    if (isOpen && messages.length === 0) {
      addMessage('bot', "Hey! I'm the Skill Games Texas assistant. I can help you learn about our games, revenue share program, and whether skill games are right for your business. What would you like to know?");
    }
    if (isOpen) input.focus();
  }

  function addMessage(role, text) {
    messages.push({ role: role === 'bot' ? 'assistant' : 'user', content: text });
    const div = document.createElement('div');
    div.className = `omni-msg ${role}`;
    div.textContent = text;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'omni-msg bot typing';
    div.id = 'omni-typing';
    div.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('omni-typing');
    if (el) el.remove();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    addMessage('user', text);

    isTyping = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      hideTyping();
      if (data.reply) {
        addMessage('bot', data.reply);
      } else {
        addMessage('bot', "Sorry, I'm having trouble right now. Please call us at (470) 304-2695 or visit skillgamestexas.com/contact.");
      }
    } catch (e) {
      hideTyping();
      addMessage('bot', "I couldn't connect. Please call us at (470) 304-2695 or visit skillgamestexas.com/contact.");
    }

    isTyping = false;
    sendBtn.disabled = false;
    input.focus();
  }
})();
