/*
Replicate/LLM API 
Daniel Shiffman, A2Z F23 llama-chatbot-replicate - https://github.com/Programming-from-A-to-Z/llama-chatbot-replicate
*/

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
  let formattedHistory = '';

  for (let i = 0; i < history.length; i++) {
    if (history[i].role === 'user') {
      formattedHistory += `[INST] ${history[i].content} [/INST]\n`;
      fs.appendFile('data.txt', `\n${history[i].content}`, function (err) {
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

  let raw = fs.readFileSync('data.txt', 'utf8');
  let lines = raw.split(/[\n\r]+/);

  let markov = new MarkovGeneratorWord(1, 280);
  for (let i = 0; i < lines.length; i++) {
    markov.feed(lines[i]);
  }

  let result = markov.generateMarkov();
  result = result.replace('\n', '<br/><br/>');
  console.log(result);

  const input = {
    prompt: formattedHistory,
    temperature: 0.5,
    system_prompt: `Someone asked you, “how are you?” ${result} is how you feel. Respond based on how you feel. Do not ask them how they are.`,
  };

  const output = await replicate.run(`${model}:${version}`, { input });
  return output.join('').trim();
}

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

/*
Markov

Daniel Shiffman, A2Z F23 -https://github.com/Programming-from-A-to-Z/A2Z-F23
Based on Allison Parrish, RWET Ex - https://github.com/aparrish/rwet-examples
*/

String.prototype.tokenize = function () {
  return this.split(/\s+/);
};

class MarkovGeneratorWord {
  constructor(n, max) {
    this.n = n;
    this.max = max;
    this.ngrams = {};
    this.beginnings = [];
  }

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
    }
  }

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
