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
  keys: ['KEY']
}));

// Bcrypt allows hashing of passwords for encrypted storage
const bcrypt = require('bcrypt');

// Method override to allow PUT and DELETE routes
var methodOverride = require('method-override');
app.use(methodOverride('_method'));

// Static resources are served from the /public folder
app.use(express.static('public'));

app.set('view engine', 'ejs');

const urlDatabase = {};
const users = {};

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

// Filters a given database to return items created by the logged-in user
function filterDBbyCreator(req, database) {
  const filteredDB = {};

  for (let key in database) {
    if (database[key].createdBy === req.session['userId']) {
      filteredDB[key] = database[key];
    }
  }
  return filteredDB;
}

// Format date to yyyy-mm-dd
function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return `${year}-${month}-${day}Z`;
}

// Routing endpoints
app.use(function(req, res, next){
  res.locals.user = users[req.session['userId']];
  next();
});

app.get('/', (req, res) => {
  if (res.locals.user) {
    res.redirect('/urls');
    return;
  }
  res.redirect('/login');
});

// Check all paths starting with urls/ to see if user has logged in
app.use('/urls', (req, res, next) => {
  if (!res.locals.user) {
    res.status(401).send('Please log in to view this. <a href="/login">Login.</login>\n');
    return;
  }
  next();
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/users.json', (req, res) => {
  res.json(users);
});


app.get('/login', (req, res) => {
  if (res.locals.user) {
    res.redirect('/');
    return;
  }
  res.render('login');
});

app.post('/login', (req, res) => {
  let userId = '';

  for (let user in users) {
    if (users[user].email === req.body.email) {
      userId = users[user].id;

      if (!bcrypt.compareSync(req.body.password, users[userId].password)) {
        res.status(401).send('Incorrect password.');
        return;
      }
    }
  }

  if (!userId) {
    res.status(403).send('User email not found.');
    return;
  }

  req.session.userId = userId;
  res.redirect('/');
});


app.post('/logout', (req, res) => {
  req.session.userId = null;
  res.redirect('/');
});


app.get('/register', (req, res) => {
  if (res.locals.user) {
    res.redirect('/');
    return;
  }
  res.render('register');
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
  req.session.userId = newUserId;
  users[newUserId] = {
    id: newUserId,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10)
  };
  res.redirect('/');
});


app.get('/urls', (req, res) => {

  const templateVars = {
    urls: filterDBbyCreator(req, urlDatabase)
  };

  res.render('urls_index', templateVars);
});

app.post('/urls', (req, res) => {

  const shortURL = generateRandomString(6);
  const dateNow = new Date();

  urlDatabase[shortURL] = {
    shortURL: shortURL,
    longURL: req.body.longURL,
    createdBy: req.session['userId'],
    dateCreated: formatDate(dateNow),
    visits: 0,
    uniqueVisits: 0
  };

  res.redirect(`/urls/${shortURL}`);
});


app.get('/urls/new', (req, res) => {
  res.render('urls_new');
});

// Applies to all /urls/:id/ checking existence and ownership
app.use('/urls/:id', (req, res, next) => {
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    res.status(404).send('Resource not found.');
    return;
  }

  if (urlDatabase[req.params.id].createdBy !== req.session['userId']) {
    res.status(403).send('This resource belongs to someone else.\n');
    return;
  }
  next();
});

// Delete a specific url
app.delete('/urls/:id/delete', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

// Update the long URL of a specific short URL
app.put('/urls/:id', (req, res) => {
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
  const templateVars = { url: urlDatabase[req.params.id] };
  res.render('urls_show', templateVars);
});


app.get('/u/:shortURL', (req, res) => {
  if (!urlDatabase.hasOwnProperty(req.params.shortURL)) {
    res.status(404).send('Resource not found.');
    return;
  }

  if (!req.session.visited) {
    req.session.visited = [];
  }

  urlDatabase[req.params.shortURL].visits += 1;

  if (req.session.visited.indexOf(req.params.shortURL) === -1) {
    urlDatabase[req.params.shortURL].uniqueVisits += 1;
    req.session.visited.push(req.params.shortURL);
  }

  res.redirect(urlDatabase[req.params.shortURL].longURL);
});

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});