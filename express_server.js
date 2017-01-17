var express = require('express');
var app = express();
var PORT = process.env.PORT || 8080; // default port 8080

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs');


var urlDatabase = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
};

function generateRandomString() {
  const possibleChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let outputStr = '';

  for (let i = 0; i < 6; i++) {
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

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.post("/urls/create", (req, res) => {
  console.log(req.body);  // debug statement to see POST parameters
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
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

app.get("/u/:shortURL", (req, res) => {
  let longURL = '';
  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {
    longURL = urlDatabase[req.params.shortURL];
  } else {
    longURL = `/urls/${req.params.shortURL}`;
  }
  res.redirect(longURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});