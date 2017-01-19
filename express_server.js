const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

const cookieSession = require('cookie-session');
app.use(cookieSession( {
  name: 'session',
  keys: ['KEY'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000
}));

const bcrypt = require('bcrypt');

app.use(express.static('public'));


app.set('view engine', 'ejs');


const urlDatabase = {
  'b2xVn2': {
    longURL: 'http://www.lighthouselabs.ca',
    createdBy: 'TEST01'
  },
  '9sm5xK': {
    longURL: 'http://www.google.com',
    createdBy: 'TEST01'
  }
};

const test_user_pass = 'TESTING'
const testuser_hashed = bcrypt.hashSync(test_user_pass, 10);
const users = {
  'TEST01': {
    'id':'TEST01',
    'email':'testuser@test.com',
    'password': testuser_hashed
  }
};

function generateRandomString(length) {
  const possibleChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let outputStr = '';

  for (let i = 0; i < length; i++) {
    const character = possibleChars.charAt(Math.floor((Math.random() * 62)));
    outputStr += character;
  }

  return outputStr;
}

function isLoggedIn(req) {
  // check for existence of user because our database is not persistent
  if (users[req.session['user_id']]) {
    return true;
  }
  return false;
}

function filterDBbyCreator(req, database) {
  const filteredDB = {};

  for (let key in database) {
    if (database[key].createdBy === req.session['user_id']) {
      filteredDB[key] = database[key];
    }
  }
  return filteredDB;
}

// Routing info

app.get('/', (req, res) => {
  if (isLoggedIn(req)) {
    res.redirect('/urls');
    return;
  } else {
    res.redirect('/login');
  }
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/users.json', (req, res) => {
  res.json(users);
});

app.get('/login', (req, res) => {
  const templateVars = {};
  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  res.render('login', templateVars);
});

app.post('/login', (req, res) => {
  let user_id = '';

  for (let user in users) {
    if (users[user].email === req.body.email) {
      user_id = users[user].id;

      if (!bcrypt.compareSync(req.body.password, users[user_id].password)) {
        res.status(403).send('Incorrect password.');
        return;
      }
    }
  }

  if (!user_id) {
    res.status(403).send('User email not found.');
    return;
  }

  req.session.user_id = user_id;
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

app.get('/register', (req, res) => {
  const templateVars = {};
  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  res.render('register', templateVars);
});

app.post('/register', (req, res) => {
  // Validate registration options
  if (req.body.email === '' || req.body.password === '') {
    res.status(400).send('You cannot register with a blank email or password.');
    return;
  }
  for (let user in users) {
    if (users[user].email === req.body.email) {
      res.status(400).send('User already registered to that email address.');
      return;
    }
  }

  // Create new user
  const newUserId = generateRandomString(6);
  req.session.user_id = newUserId;
  users[newUserId] = {
    id: newUserId,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10)
  };
  res.redirect('/');
});

app.get('/urls', (req, res) => {
  if (!isLoggedIn(req)) {
    res.status(401).send('Please log in to view your links. <a href="/login">Login.</login>');
  }

  const templateVars = {
    urls: filterDBbyCreator(req, urlDatabase)
  };
  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  if (!isLoggedIn(req)) {
    res.redirect('/login');
    return;
  }

  const templateVars = {};
  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  res.render('urls_new', templateVars);
});

app.post('/urls/create', (req, res) => {

  const shortURL = generateRandomString(6);
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    createdBy: req.session['user_id']
  }

  res.redirect('/urls');
});

app.post('/urls/:id/delete', (req, res) => {
  // if current user created requested deletion
  if (urlDatabase[req.params.id].createdBy !== req.session['user_id']) {
    res.status(403).send('You may not delete that.');
    return;
  }

  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

app.post('/urls/:id', (req, res) => {
  // if current user created requested update
  if (urlDatabase[req.params.id].createdBy !== req.session['user_id']) {
    res.status(403).send('You may not update that.');
    return;
  }

  urlDatabase[req.params.id] = {
    longURL: req.body.newLongURL,
    createdBy: req.session['user_id']
  };
  res.redirect('/urls');
});

app.get('/urls/:id', (req, res) => {
  if (urlDatabase[req.params.id].createdBy !== req.session['user_id']) {
    res.status(403).send('You may not view that.');
    return;
  }

  const templateVars = {
    shortURL: req.params.id
  };

  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  if (urlDatabase.hasOwnProperty(req.params.id)) {
    templateVars.longURL = urlDatabase[req.params.id].longURL;
  } else {
    templateVars.longURL = 'Short URL not found in database';
  }
  res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  let redirURL = '';
  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {
    redirURL = urlDatabase[req.params.shortURL].longURL;
  } else {
    redirURL = `/urls/${req.params.shortURL}`;
  }
  res.redirect(redirURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});