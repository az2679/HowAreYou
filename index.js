// Import necessary modules
import express from 'express';
import bodyParser from 'body-parser';
import Replicate from 'replicate';
import dotenv from 'dotenv';

// Initialize dotenv for environment variable management
dotenv.config();

// Create an Express application instance
const app = express();
// Instantiate the Replicate client with the API token
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
// Define the model and version to use with Replicate
const model = 'meta/llama-2-7b-chat';
const version = '8e6975e5ed6174911a6ff3d60540dfd4844201974602551e10e9e87ab143d81e';

// Middleware for parsing JSON request bodies
app.use(bodyParser.json());

app.use(express.static('public'));

// Function to format the conversation history and generate a response using Replicate
async function generate(history) {
  let formattedHistory = '';
  let markov = '';

  for (let i = 0; i < history.length; i++) {
    if (history[i].role === 'user') {
      formattedHistory += `[INST] ${history[i].content} [/INST]\n`;
    } else if (history[i].role === 'markov') {
      markov += history[i].content;
    } else {
      formattedHistory += `${history[i].content}\n`;
    }
  }

  if (formattedHistory.endsWith('\n')) {
    formattedHistory = formattedHistory.slice(0, -1);
  }

  /*
  need to pass in markov generation.
  system prompt: 
  `Someone asked you, “how are you?” ${} is how you feel. Respond based on how you feel, but do not ask them how they are.`
  */

  const input = {
    prompt: formattedHistory,
    temperature: 0.5,
    system_prompt: `Someone asked you, “how are you?” ${markov} is how you feel. Respond based on how you feel, but do not ask them how they are.`,
  };

  const output = await replicate.run(`${model}:${version}`, { input });
  return output.join('').trim();
}

// Route handler for POST requests to '/api/chat'
app.post('/api/chat', async (req, res) => {
  const conversationHistory = req.body.history;
  try {
    const modelReply = await generate(conversationHistory);
    res.json({ reply: modelReply });
  } catch (error) {
    console.error('Error communicating with Replicate API:', error);
    res.status(500).send('Error generating response');
  }
});

// Define the port for the server to listen on and start listening
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
