import express from 'express';
import bodyParser from 'body-parser';
import Replicate from 'replicate';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
const app = express();

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const model = 'meta/llama-2-7b-chat';
const version = '8e6975e5ed6174911a6ff3d60540dfd4844201974602551e10e9e87ab143d81e';

app.use(bodyParser.json());

app.use(express.static('public'));

async function generate(history) {
  // Initialize an empty string to accumulate the formatted history
  let formattedHistory = '';

  // Loop through each message in the history array
  for (let i = 0; i < history.length; i++) {
    // Check the role of the message and format accordingly
    if (history[i].role === 'user') {
      // If the message is from the user, wrap the content with [INST] tags
      formattedHistory += `[INST] ${history[i].content} [/INST]\n`;

      fs.appendFile('data.txt', `\n${history[i].content}`, function (err) {
        if (err) {
          console.error(err);
        }
      });
    } else {
      // If the message is not from the user, add it as is
      formattedHistory += `${history[i].content}\n`;
    }
  }

  // Remove the last newline character from the formatted history string
  if (formattedHistory.endsWith('\n')) {
    formattedHistory = formattedHistory.slice(0, -1);
  }

  // let lines = '';

  // fs.readFileSync('data.txt', 'utf8', (err, data) => {
  //   if (err) {
  //     console.error(err);
  //     return;
  //   }
  //   lines = data.split(/[\n\r]+/);
  //   // console.log(lines);
  //   // console.log(lines.length);
  // });

  let raw = fs.readFileSync('data.txt', 'utf8');
  let lines = raw.split(/[\n\r]+/);
  console.log(lines);
  console.log(lines.length);

  let markov = new MarkovGeneratorWord(1, 280);
  for (let i = 0; i < lines.length; i++) {
    markov.feed(lines[i]);
  }

  let result = markov.generateMarkov();
  result = result.replace('\n', '<br/><br/>');
  console.log(result);

  // Construct the input object for the model
  const input = {
    prompt: formattedHistory,
    temperature: 0.5,
    system_prompt: `Someone asked you, “how are you?” ${result} is how you feel. Respond based on how you feel. Do not ask them how they are.`,
  };

  // Run the model with the formatted input and return the result
  const output = await replicate.run(`${model}:${version}`, { input });
  return output.join('').trim();
}

// Route handler for POST requests to '/api/chat'
app.post('/api/chat', async (req, res) => {
  // Extract the conversation history from the request body
  const conversationHistory = req.body.history;
  try {
    // Generate a response using the Replicate model and send it back
    const modelReply = await generate(conversationHistory);
    res.json({ reply: modelReply });
  } catch (error) {
    // Handle errors in communication with the Replicate API
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
  generateMarkov() {
    console.log('generate');
    let current = this.beginnings[Math.floor(Math.random() * this.beginnings.length)];
    console.log(typeof this.beginnings);
    let output = current.tokenize();
    for (let i = 0; i < this.max; i++) {
      if (this.ngrams[current]) {
        let possible_next = this.ngrams[current];
        let next = possible_next[Math.floor(Math.random() * possible_next.length)];
        output.push(next);
        current = output.slice(output.length - this.n, output.length).join(' ');
      } else {
        break;
      }
    }
    return output.join(' ');
  }
}
