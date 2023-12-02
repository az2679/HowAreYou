/*
Chat Formating
Daniel Shiffman, A2Z F23 llama-chatbot-replicate - https://github.com/Programming-from-A-to-Z/llama-chatbot-replicate
*/

const userInput = document.getElementById('user-input');
userInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

let conversationHistory = [];

function appendMessage(who, message) {
  const chatContainer = document.getElementById('chat-container');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  const roleSpan = document.createElement('span');
  roleSpan.className = who.toLowerCase();
  roleSpan.textContent = who + ': ';

  const contentSpan = document.createElement('span');
  contentSpan.className = 'message-content';
  contentSpan.textContent = message;

  messageDiv.appendChild(roleSpan);
  messageDiv.appendChild(contentSpan);
  chatContainer.appendChild(messageDiv);

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage() {
  const userInput = document.getElementById('user-input');
  const message = userInput.value;
  userInput.value = '';
  appendMessage('you', message);
  conversationHistory.push({ role: 'user', content: message });

  const chatContainer = document.getElementById('chat-container');
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history: conversationHistory }),
    });

    const data = await response.json();
    appendMessage('chatbot', data.reply);
    conversationHistory.push({ role: 'buddy', content: data.reply });
    console.log(JSON.stringify(conversationHistory, null, 2));
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}
