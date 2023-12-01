// A2Z F23
// Daniel Shiffman
// https://github.com/Programming-from-A-to-Z/A2Z-F23

// This is based on Allison Parrish's great RWET examples
// https://github.com/aparrish/rwet-examples

let lines;
let markov;
let output;

// Preload some seed data
function preload() {
  lines = loadStrings('data.txt');
}

function setup() {
  // N-gram length and maximum length
  markov = new MarkovGeneratorWord(1, 280);

  // Feed one line at a time
  for (let i = 0; i < lines.length; i++) {
    markov.feed(lines[i]);
  }

  // Make the button
  let button = createButton('generate');
  button.mousePressed(generate);

  noCanvas();
}

function generate() {
  let result = markov.generate();
  console.log(result);
  result = result.replace('\n', '<br/><br/>');
  createP(result);
}
