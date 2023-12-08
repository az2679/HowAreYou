import express from 'express';
import bodyParser from 'body-parser';
import Replicate from 'replicate';
import dotenv from 'dotenv';
import fs from 'fs';
import { UMAP } from 'umap-js';

dotenv.config();

const embeddings = JSON.parse(fs.readFileSync('embeddings.json', 'utf-8'));
// console.log('Embeddings loaded.');

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const chatModel = 'meta/llama-2-7b-chat';
const chatVersion = '8e6975e5ed6174911a6ff3d60540dfd4844201974602551e10e9e87ab143d81e';

const searchModel = 'nateraw/bge-large-en-v1.5';
const searchVersion = '9cf9f015a9cb9c61d1a2610659cdac4a4ca222f2d3707a68517b18c198a9add1';

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Function to generate query with LLaMA model
async function generate(history) {
  let formattedHistory = '';

  for (let i = 0; i < history.length; i++) {
    if (history[i].role === 'user') {
      formattedHistory += `[INST] ${history[i].content} How are you? [/INST]\n`;
    } else {
      formattedHistory += `${history[i].content}\n`;
    }
  }

  fs.appendFile('data.txt', `\n${history[history.length - 1].content}`, function (err) {
    if (err) {
      console.error(err);
    }
  });
  console.log(`Generating response to: ${history[history.length - 1].content}`);

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
  console.log(`Generated Markov: ${result}`);

  const input = {
    prompt: formattedHistory,
    temperature: 0.1,
    // system_prompt: `Someone asked you, “how are you?” This, "${result}", is how you feel. Respond based on how you feel but do not ask any questions in your response.`,
    system_prompt: `Someone asked you, “how are you?” Respond as if you feel like this: ${result}. Do not ask any questions in your response.`,
  };
  // console.log(`Sending to LLaMA: ${input} `);
  console.log(input);

  const output = await replicate.run(`${chatModel}:${chatVersion}`, { input });
  console.log(`Reformatting with LLaMA: ${output.join('').trim()}`);
  return output.join('').trim();
}

// Function to get embedding for a given text
async function getEmbedding(text) {
  console.log(`Generating embedding for: "${text}"`);
  const input = {
    texts: JSON.stringify([text]),
    batch_size: 32,
    convert_to_numpy: false,
    normalize_embeddings: true,
  };
  const output = await replicate.run(`${searchModel}:${searchVersion}`, { input });
  return output[0];
}
// Function to find similar texts based on cosine similarity
async function findSimilar(prompt) {
  // console.log('Finding similar responses to: ' + prompt);
  const inputEmbedding = await getEmbedding(prompt);
  // Calculate similarity of each embedding with the input
  let similarities = embeddings.map(({ text, embedding }) => ({
    text,
    similarity: cosineSimilarity(inputEmbedding, embedding),
  }));
  // Sort similarities in descending order
  similarities = similarities.sort((a, b) => b.similarity - a.similarity);
  console.log(
    `Similarities found: \n1: ${similarities[0].text}, Score: ${similarities[0].similarity.toFixed(3)}\n2: ${
      similarities[1].text
    }, Score: ${similarities[1].similarity.toFixed(3)}\n3: ${
      similarities[2].text
    }, Score: ${similarities[2].similarity.toFixed(3)}`
  );
  return similarities;
}

async function clustering() {
  let embeddingArr = [];
  for (let i = 0; i < embeddings.length; i++) {
    embeddingArr.push(embeddings[i].embedding);
  }
  // console.log(embeddingArr);
  let umap = new UMAP({ nNeighbors: 15, minDist: 0.1, nComponents: 2 });
  let umapResults = umap.fit(embeddingArr);
  // console.log(umapResults);
  return umapResults;
}

//Endpoint to converse with LLaMA
app.post('/api/chat', async (req, res) => {
  const conversationHistory = req.body.history;
  try {
    const modelReply = await generate(conversationHistory);
    res.json({ reply: modelReply });
  } catch (error) {
    console.error('[/api/chat] Error communicating with Replicate API:', error);
    res.status(500).send('Error generating response');
  }
});

// Endpoint to find similar texts based on embeddings
app.post('/api/similar', async (request, response) => {
  let prompt = request.body.prompt;
  console.log('Searching for similar responses to: ' + prompt);
  let n = request.body.n || 10;
  try {
    let similarities = await findSimilar(prompt);
    similarities = similarities.slice(0, n);
    response.json(similarities);
  } catch (error) {
    console.error('[/api/similar] Error communicating with Replicate API:', error);
    response.status(500).send('Error generating response');
  }
});

app.post('/api/cluster', async (request, response) => {
  // let prompt = request.body.prompt;
  // console.log('Sending Embeddings...');
  try {
    let umapResults = await clustering();
    let umapEmbeds = { umapResults, embeddings };
    response.json(umapEmbeds);
  } catch (error) {
    console.error('[/api/cluster] Error communicating with Replicate API:', error);
    response.status(500).send('Error generating response');
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

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
    let current = this.beginnings[Math.floor(Math.random() * this.beginnings.length)];
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

function dotProduct(vecA, vecB) {
  return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}

function magnitude(vec) {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

function cosineSimilarity(vecA, vecB) {
  return dotProduct(vecA, vecB) / (magnitude(vecA) * magnitude(vecB));
}
