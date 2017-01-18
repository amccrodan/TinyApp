var express = require('express');
var app = express();
var PORT = process.env.PORT || 8080; // default port 8080

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs');


var urlDatabase = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
};

function generateRandomString(length) {
  const possibleChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let outputStr = '';

  for (let i = 0; i < length; i++) {
    const character = possibleChars.charAt(Math.floor((Math.random()*62)));
    outputStr += character;
  }

  return outputStr;
}

// Routing info

app.get('/', (req, res) => {
  res.end('Hello!');
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/hello', (req, res) => {
  res.end('<html><body>Hello <b>World</b></body></html>\n');
});

app.get('/urls', (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  res.render('urls_new');
});

app.post('/urls/create', (req, res) => {
  console.log(req.body);  // debug statement to see POST parameters
  const shortURL = generateRandomString(6);
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.post('/urls/:id/delete', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

app.get('/urls/:id', (req, res) => {
  let templateVars = {shortURL: req.params.id}
  if (urlDatabase.hasOwnProperty(req.params.id)) {
    templateVars.longURL = urlDatabase[req.params.id];
  } else {
    templateVars.longURL = 'Short URL not found in database';
  }
  res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  let redirURL = '';
  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {
    redirURL = urlDatabase[req.params.shortURL];
  } else {
    redirURL = `/urls/${req.params.shortURL}`;
  }
  res.redirect(redirURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});