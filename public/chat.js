//llama-chatbot-replicate from A2Z

// import * as fs from 'fs';
import fs from 'fs';

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

// const fs = require('node:fs/promises');

async function callbackLoadFile() {
  try {
    const data = await fs.readFile('data.txt', { encoding: 'utf8' });
    console.log(data);
  } catch (err) {
    console.log(err);
  }
}

// Async function to handle sending messages
async function sendMessage() {
  const userInput = document.getElementById('user-input');
  const message = userInput.value;
  userInput.value = '';
  appendMessage('you', message);

  ////////

  /*
  enter button or clicking send initiates sendMessage()

  1. add message to json / data.txt
  2. generate markov 
  3. send markov along with convo history

  */

  //1. add input to existing responses

  // const fs = require('node:fs');
  const fs = require('node:fs');

  fs.appendFile('data.txt', message, function (err) {
    if (err) {
      console.error(err);
    }
  });

  //2. generate markov

  //redo ngrams with new input

  // const lines = fs.readFileSync('voice-over.txt', 'utf-8');
  // fs.readFile('data.txt', 'utf8', (err, data) => {
  //   if (err) {
  //     console.error(err);
  //     return;
  //   }
  //   console.log(data);
  // });

  // let lines = loadStrings('data.txt')
  callbackLoadFile();

  let markov = new MarkovGeneratorWord(1, 280);
  for (let i = 0; i < lines.length; i++) {
    markov.feed(lines[i]);
  }
  //make actual markov
  let result = markov.generate();
  console.log(result);
  result = result.replace('\n', '<br/><br/>');

  // 3. add to convo history that gets sent to system

  conversationHistory.push({ role: 'markov', content: result });

  ////////

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
