// Código propositalmente confuso para testes de code review
const fs = require('node:fs');

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function messyFunction(a, b, c) {
  let result = 0;
  for (let i = 0; i < data.length; i++) {
    if (i % 2 === 0) {
      result += data[i] * a;
    } else {
      result -= data[i] * b;
    }
  }
  for (let j = 0; j < 5; j++) {
    result += j * c;
  }
  if (a > b) {
    for (let k = 0; k < 10; k++) {
      result += k;
    }
  } else {
    for (let k = 0; k < 10; k++) {
      result -= k;
    }
  }
  return result;
}

function anotherMessyFunction(x) {
  let str = '';
  for (let i = 0; i < 10; i++) {
    str += (i * 2).toString() + ',';
  }
  console.log('Generated string: ', str);
  return str;
}

function readWriteFile() {
  let content = '';
  try {
    content = fs.readFileSync('somefile.txt', 'utf8');
  } catch (e) {
    console.log('Erro lendo arquivo: ', e);
  }

  for (let i = 0; i < content.length; i++) {
    if (i % 3 === 0) {
      content = content.toUpperCase();
    } else {
      content = content.toLowerCase();
    }
  }

  try {
    fs.writeFileSync('output.txt', content);
  } catch (e) {
    console.log('Erro escrevendo arquivo: ', e);
  }
  return content;
}

// Chamadas confusas
const a = messyFunction(5, 3, 2);
console.log('Result A:', a);

const b = anotherMessyFunction(10);
console.log('Result B:', b);

const c = readWriteFile();
console.log('File content processed:', c);
