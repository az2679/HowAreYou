// new p5((sketch) => {
//   let img;
//   sketch.preload = async () => {
//     img = sketch.loadImage('./assets/pixlr4.png');
//   };
//   sketch.setup = async () => {
//     sketch.createCanvas(600, 600);
//     sketch.background(220);
//     sketch.image(img, 0, 0, 600, 600);
//   };
//   sketch.draw = () => {
//   };
// });

// const userInput = document.getElementById('user-input');
// userInput.addEventListener('input', function () {
//   this.style.height = 'auto';
//   this.style.height = this.scrollHeight + 'px';
// });

function respondBox() {
  const respondInput = document.getElementById('respond-input');
  if (respondInput.style.display === 'none') {
    respondInput.style.display = 'block';
  } else {
    respondInput.style.display = 'none';
  }
}
function similarBox() {
  const similarInput = document.getElementById('similar-input');
  if (similarInput.style.display === 'none') {
    similarInput.style.display = 'block';
  } else {
    similarInput.style.display = 'none';
  }
}

let embeddingArr = [];
let responseArr = [];
let umapResults = [];

let conversationHistory = [
  // {
  //   role: 'doorman',
  //   content: 'How are you?',
  // },
];
appendMessage('Doorman', 'How are you?');

function appendMessage(who, message) {
  // const chatContainer = document.getElementById('chat-container');
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
  // chatContainer.appendChild(messageDiv);

  // chatContainer.scrollTop = chatContainer.scrollHeight;

  const msgContainer = document.getElementById('msg-container');
  msgContainer.appendChild(messageDiv);
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

async function sendMessage() {
  // const userInput = document.getElementById('user-input');
  // const message = userInput.value;
  // userInput.value = '';
  const respondInput = document.getElementById('respond-input');
  const message = respondInput.value;
  respondInput.value = '';

  appendMessage('you', message + ' How are you?');
  // conversationHistory.push({ role: 'user', content: message });
  conversationHistory[0] = { role: 'user', content: message };

  // const chatContainer = document.getElementById('chat-container');
  // chatContainer.scrollTop = chatContainer.scrollHeight;
  const msgContainer = document.getElementById('msg-container');
  msgContainer.scrollTop = msgContainer.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history: conversationHistory }),
    });

    const data = await response.json();
    appendMessage('Doorman', data.reply);
    // conversationHistory.push({ role: 'doorman', content: data.reply });
    console.log(JSON.stringify(conversationHistory, null, 2));
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function search() {
  // const userInput = document.getElementById('user-input');
  // const searchMessage = userInput.value;
  // userInput.value = '';

  const similarInput = document.getElementById('similar-input');
  const searchMessage = similarInput.value;
  similarInput.value = '';

  appendMessage('you', searchMessage + ' Does anyone else feels this way?');

  // const chatContainer = document.getElementById('chat-container');
  // chatContainer.scrollTop = chatContainer.scrollHeight;
  const msgContainer = document.getElementById('msg-container');
  msgContainer.scrollTop = msgContainer.scrollHeight;

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
    appendMessage('Doorman', `Yes! They said: "${results[0].text}"`);
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function cluster() {
  try {
    const response = await fetch('/api/cluster', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const results = await response.json();
    console.log(results);

    for (let i = 0; i < results.embeddings.length; i++) {
      embeddingArr.push(results.embeddings[i].embedding);
      responseArr.push(results.embeddings[i].text);
    }
    umapResults = results.umapResults;

    console.log(umapResults, embeddingArr, responseArr);
  } catch (error) {
    console.error('Error communicating with server:', error);
  }

  clusterMap();
}

async function clusterMap() {
  const clusterContainer = document.getElementById('cluster-container');
  // Instance mode in p5.js for encapsulating the sketch, enabling compatibility with external modules
  new p5((sketch) => {
    let dots = [];
    // Setup function to initialize the canvas and process data
    sketch.setup = async () => {
      let c = sketch.createCanvas(600, 600);
      c.parent(clusterContainer);
      // let umapResults = umap.fit(embeddingArr);
      // Mapping UMAP results to pixel space for visualization
      let [maxW, minW, maxH, minH] = mapUMAPToPixelSpace(umapResults, sketch);

      // Creating Dot objects from UMAP results and sentences
      for (let i = 0; i < umapResults.length; i++) {
        let x = sketch.map(umapResults[i][0], minW, maxW, 10, sketch.width - 10);
        let y = sketch.map(umapResults[i][1], minH, maxH, 10, sketch.height - 10);
        let dot = new Dot(x, y, responseArr[i], embeddingArr[i], sketch);
        dots.push(dot);
      }
    };

    // Draw function to render dots on canvas
    sketch.draw = () => {
      if (dots.length > 0) {
        sketch.background(160, 30, 42);
        dots.forEach((dot) => dot.show());
        dots.forEach((dot) => {
          if (dot.over(sketch.mouseX, sketch.mouseY)) {
            dot.showText();
            return;
          }
        });
      }
    };

    // Function to map UMAP results to pixel space for visualization
    function mapUMAPToPixelSpace(umapResults) {
      // Initialize variables to track the maximum and minimum values in width and height
      let maxW = 0;
      let minW = Infinity;
      let maxH = 0;
      let minH = Infinity;

      // Iterate over each UMAP result to find the extreme values
      for (let i = 0; i < umapResults.length; i++) {
        // Update maxW and minW with the maximum and minimum x-coordinates
        maxW = Math.max(maxW, umapResults[i][0]);
        minW = Math.min(minW, umapResults[i][0]);

        // Update maxH and minH with the maximum and minimum y-coordinates
        maxH = Math.max(maxH, umapResults[i][1]);
        minH = Math.min(minH, umapResults[i][1]);
      }

      // Return the extreme values which define the bounding box for UMAP results
      return [maxW, minW, maxH, minH];
    }
  });
}

// Dot class for representing and visualizing each data point
class Dot {
  constructor(x, y, response, embedding, sketch) {
    this.x = x;
    this.y = y;
    this.response = response;
    this.embedding = embedding;
    this.sketch = sketch;
    this.r = 4;
  }

  // Display the dot on canvas
  show() {
    this.sketch.fill(246, 229, 198);
    // this.sketch.stroke(29, 51, 73);
    this.sketch.stroke(246, 229, 198);
    this.sketch.strokeWeight(2);
    this.sketch.circle(this.x, this.y, this.r * 2);
  }

  // Display the associated text of the dot
  showText() {
    this.sketch.fill(246, 229, 198);
    this.sketch.noStroke();
    this.sketch.textSize(18);
    this.sketch.text(this.response, 10, this.sketch.height - 10);
    // this.sketch.textSize(14);
    // this.sketch.text(this.response, this.x + 5, this.y + 5);
  }

  // Check if a point (x, y) is over this dot
  over(x, y) {
    let d = this.sketch.dist(x, y, this.x, this.y);
    return d < this.r;
  }
}
