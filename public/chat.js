//llama-chatbot-replicate from A2Z

// import * as fs from 'fs';
// import fs from 'fs';

const userInput = document.getElementById('user-input');

// Event listener to adjust the height of the text area based on its content
userInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

// Initialize an array to store the conversation history
let conversationHistory = [];

// Function to append a message to the chat container
function appendMessage(who, message) {
  const chatContainer = document.getElementById('chat-container');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  const roleSpan = document.createElement('span');
  roleSpan.className = who.toLowerCase();
  roleSpan.textContent = who + ': ';

  // Create a span element to contain the message text
  const contentSpan = document.createElement('span');
  contentSpan.className = 'message-content';
  contentSpan.textContent = message;

  // Add the sender label and message content to the message div
  messageDiv.appendChild(roleSpan);
  messageDiv.appendChild(contentSpan);
  chatContainer.appendChild(messageDiv);

  // Automatically scroll the chat container to the newest message
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Async function to handle sending messages
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
