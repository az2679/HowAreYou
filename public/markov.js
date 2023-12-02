// A2Z F23
// Daniel Shiffman
// https://github.com/Programming-from-A-to-Z/A2Z-F23

// This is based on Allison Parrish's great RWET examples
// https://github.com/aparrish/rwet-examples

// let lines;
// let markov;
// let output;
// function preload() {
//   lines = loadStrings('data.txt');
// }
// function setup() {
//   // N-gram length and maximum length
//   markov = new MarkovGeneratorWord(1, 280);
//   // Feed one line at a time
//   for (let i = 0; i < lines.length; i++) {
//     markov.feed(lines[i]);
//   }
//   // Make the button
//   let button = createButton('generate');
//   button.mousePressed(generate);
//   // noCanvas();
// }
// function generate() {
//   let result = markov.generate();
//   console.log(result);
//   result = result.replace('\n', '<br/><br/>');
//   createP(result);
// }

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
