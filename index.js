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
  // let markov = '';

  for (let i = 0; i < history.length; i++) {
    if (history[i].role === 'user') {
      formattedHistory += `[INST] ${history[i].content} [/INST]\n`;
      console.log(history[i].content);
      //1. add input to existing responses
      fs.appendFile('data.txt', history[i].content, function (err) {
        if (err) {
          console.error(err);
        }
      });
    } else {
      formattedHistory += `${history[i].content}\n`;
    }
  }
  if (formattedHistory.endsWith('\n')) {
    formattedHistory = formattedHistory.slice(0, -1);
  }

  //2. generate markov
  const lines = fs.readFileSync('voice-over.txt', 'utf-8');
  fs.readFile('data.txt', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(data);
  });
  let markov = new MarkovGeneratorWord(1, 280);
  for (let i = 0; i < lines.length; i++) {
    markov.feed(lines[i]);
  }
  let result = markov.generate();

  console.log(result);

  result = result.replace('\n', '<br/><br/>');

  const input = {
    prompt: formattedHistory,
    temperature: 0.5,
    system_prompt: `Someone asked you, “how are you?” ${result} is how you feel. Respond based on how you feel, but do not ask them how they are.`,
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

// A function to split a text up into tokens
// Just using spaces for now to preserve punctuation
String.prototype.tokenize = function () {
  return this.split(/\s+/);
};

// A Markov Generator class
class MarkovGeneratorWord {
  constructor(n, max) {
    this.n = n;
    this.max = max;
    this.ngrams = {};
    this.beginnings = [];
  }

  // A function to feed in text to the markov chain
  feed(text) {
    // console.log(text);
    var tokens = text.tokenize();
    if (tokens.length < this.n) {
      return false;
    }
    var beginning = tokens.slice(0, this.n).join(' ');
    this.beginnings.push(beginning);

    for (var i = 0; i < tokens.length - this.n; i++) {
      let gram = tokens.slice(i, i + this.n).join(' ');
      let next = tokens[i + this.n];
      if (!this.ngrams[gram]) {
        this.ngrams[gram] = [];
      }
      this.ngrams[gram].push(next);
      // console.log(this.ngrams)
    }

    // console.log(this.beginnings);
  }

  // Generate a text from the information ngrams
  generate() {
    let current = random(this.beginnings);
    let output = current.tokenize();
    for (let i = 0; i < this.max; i++) {
      if (this.ngrams[current]) {
        let possible_next = this.ngrams[current];
        let next = random(possible_next);
        output.push(next);
        current = output.slice(output.length - this.n, output.length).join(' ');
      } else {
        break;
      }
    }
    return output.join(' ');
  }
}
