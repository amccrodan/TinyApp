const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Body-parser exposes the body of a request conveniently
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

// Cookie-session allows use of encrypted cookies
const cookieSession = require('cookie-session');
app.use(cookieSession( {
  name: 'session',
  keys: ['KEY'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000
}));

// Bcrypt allows hashing of passwords for encrypted storage
const bcrypt = require('bcrypt');

// Method override to allow PUT and DELETE routes
var methodOverride = require('method-override');
app.use(methodOverride('_method'));

// Static resources are served from the /public folder
app.use(express.static('public'));

app.set('view engine', 'ejs');

// Simulated database of URLs
const urlDatabase = {
  'b2xVn2': {
    longURL: 'http://www.lighthouselabs.ca',
    createdBy: 'TEST01',
    dateCreated: new Date(2017, 1, 20),
    visits: 0,
    uniqueVisits: 0
  },
  '9sm5xK': {
    longURL: 'http://www.google.com',
    createdBy: 'TEST01',
    dateCreated: new Date(2017, 1, 20),
    visits: 0,
    uniqueVisits: 0
  }
};


// Simulated database of users
const testUserPass = 'TESTING';
const testUserHashed = bcrypt.hashSync(testUserPass, 10);
const users = {
  'TEST01': {
    id: 'TEST01',
    email: 'testuser@test.com',
    password: testUserHashed
  }
};

// Generate a random string of length 'length' selected from the possibleChars array.
function generateRandomString(length) {
  const possibleChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let outputStr = '';

  for (let i = 0; i < length; i++) {
    const character = possibleChars.charAt(Math.floor((Math.random() * 62)));
    outputStr += character;
  }

  return outputStr;
}

// Check to see if a user is currently logged in
function isLoggedIn(req) {
  // check for existence of user because our database is not persistent
  if (users[req.session['user_id']]) {
    return true;
  }
  return false;
}

// Filters a given database to return items created by the logged-in user
function filterDBbyCreator(req, database) {
  const filteredDB = {};

  for (let key in database) {
    if (database[key].createdBy === req.session['user_id']) {
      filteredDB[key] = database[key];
    }
  }
  return filteredDB;
}

// Routing endpoints

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
  if (isLoggedIn(req)) {
    res.redirect('/');
    return;
  }

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
        res.status(401).send('Incorrect password.');
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
  req.session.user_id = null;
  res.redirect('/');
});


app.get('/register', (req, res) => {
  if (isLoggedIn(req)) {
    res.redirect('/');
    return;
  }

  const templateVars = {};
  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  res.render('register', templateVars);
});

app.post('/register', (req, res) => {
  // Validate registration options
  if (req.body.email === '' || req.body.password === '') {
    res.status(400).send('You cannot register with a blank email or password.\n');
    return;
  }
  for (let user in users) {
    if (users[user].email === req.body.email) {
      res.status(400).send('User already registered to that email address.\n');
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
    res.status(401).send('Please log in to view your links. <a href="/login">Login.</login>\n');
    return;
  }

  const templateVars = {
    urls: filterDBbyCreator(req, urlDatabase)
  };
  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  res.render('urls_index', templateVars);
});

app.post('/urls', (req, res) => {
  if (!isLoggedIn(req)) {
    res.status(401).send('Please log in to shorten a new link. <a href="/login">Login.</login>\n');
    return;
  }

  const shortURL = generateRandomString(6);
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    createdBy: req.session['user_id'],
    dateCreated: Date.now(),
    visits: 0,
    uniqueVisits: 0
  };

  res.redirect(`/urls/${shortURL}`);
});


app.get('/urls/new', (req, res) => {
  if (!isLoggedIn(req)) {
    res.status(401).send('Please log in to shorten a new link. <a href="/login">Login.</login>\n');
    return;
  }

  const templateVars = {};
  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  res.render('urls_new', templateVars);
});


app.delete('/urls/:id/delete', (req, res) => {
  // if current user created requested deletion
  if (urlDatabase[req.params.id].createdBy !== req.session['user_id']) {
    res.status(403).send('You may not delete that.\n');
    return;
  }

  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});


app.put('/urls/:id', (req, res) => {
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    res.status(404).send('Link not found.');
    return;
  }

  if (!isLoggedIn(req)) {
    res.status(401).send('Please log in to update this link. <a href="/login">Login.</login>\n');
    return;
  }

  // if current user created requested update
  if (urlDatabase[req.params.id].createdBy !== req.session['user_id']) {
    res.status(403).send('You may not update that.\n');
    return;
  }

  if (req.body.newLongURL === '') {
    res.status(400).send('You may not set the link to an empty string.\n');
    return;
  }

  urlDatabase[req.params.id].longURL = req.body.newLongURL;
  urlDatabase[req.params.id].visits = 0;
  urlDatabase[req.params.id].uniqueVisits = 0;

  res.redirect(`/urls/${req.params.id}`);
});

app.get('/urls/:id', (req, res) => {
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    res.status(404).send('Link not found.');
    return;
  }

  if (!isLoggedIn(req)) {
    res.status(401).send('Please log in to view this link. <a href="/login">Login.</login>\n');
    return;
  }

  if (urlDatabase[req.params.id].createdBy !== req.session['user_id']) {
    res.status(403).send('That link belongs to someone else. You may not view it.\n');
    return;
  }

  const templateVars = {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id].longURL
  };

  templateVars.username = isLoggedIn(req) ? users[req.session['user_id']].email : '';

  res.render('urls_show', templateVars);
});


app.get('/u/:shortURL', (req, res) => {

  if (!req.session.visited) {
    req.session.visited = [];
  }

  let redirURL = '';
  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {
    redirURL = urlDatabase[req.params.shortURL].longURL;
    urlDatabase[req.params.shortURL].visits += 1;

    if (req.session.visited.indexOf(req.params.shortURL) === -1) {
      urlDatabase[req.params.shortURL].uniqueVisits += 1;
      req.session.visited.push(req.params.shortURL);
    }
  } else {
    redirURL = `/urls/${req.params.shortURL}`;
  }

  res.redirect(redirURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});