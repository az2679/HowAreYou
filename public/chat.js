/*
Chat Formating
Daniel Shiffman, A2Z F23 llama-chatbot-replicate - https://github.com/Programming-from-A-to-Z/llama-chatbot-replicate
*/

const userInput = document.getElementById('user-input');
userInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

let conversationHistory = [
  {
    role: 'chatbot',
    content: 'How are you?',
  },
];
appendMessage('chatbot', 'How are you?');

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

async function search() {
  const userInput = document.getElementById('user-input');
  const searchMessage = userInput.value;
  userInput.value = '';
  appendMessage('you', searchMessage);

  const chatContainer = document.getElementById('chat-container');
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    // Send a POST request to the '/api/similar' endpoint
    const response = await fetch('/api/similar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: searchMessage, n: 3 }),
    });
    const results = await response.json();

    // Format and display the results
    let output = '';
    for (let chunk of results) {
      output += `"${chunk.text}" Score: ${chunk.similarity.toFixed(3)}\n`;
    }
    // resultsP.html(output);
    appendMessage('chatbot', `Someone on the floor feels just like you! They said: "${results[0].text}"`);
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}
