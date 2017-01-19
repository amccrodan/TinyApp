const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(express.static('public'));


app.set('view engine', 'ejs');


const urlDatabase = {
  'b2xVn2': {
    longUrl: 'http://www.lighthouselabs.ca',
    createdBy: 'TEST01'
  },
  '9sm5xK': {
    longURL: 'http://www.google.com',
    createdBy: 'TEST01'
  }
};

const users = {
  'TEST01': {
    'id':'TEST01',
    'email':'testuser@test.com',
    'password':'TESTING'
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
  if (users[req.cookies['user_id']]) {
    return true;
  }
  return false;
}

function filterDBbyCreator(req, database) {
  const filteredDB = {};

  for (let key in database) {
    console.log(database[key].createdBy, req.cookies['user_id']);
    if (database[key].createdBy === req.cookies['user_id']) {
      filteredDB[key] = database[key];
    }
  }
  console.log(filteredDB);
  return filteredDB;
}

// Routing info

app.get('/', (req, res) => {
  res.redirect('/urls');
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/users.json', (req, res) => {
  res.json(users);
});

app.get('/login', (req, res) => {
  let templateVars = {};
  templateVars.username = isLoggedIn(req) ? users[req.cookies['user_id']].email : '';

  res.render('login', templateVars);
});

app.post('/login', (req, res) => {
  let user_id = '';

  for (let user in users) {
    if (users[user].email === req.body.email) {
      user_id = users[user].id;
      if (req.body.password !== users[user_id].password) {
        res.status(403).send('Incorrect password.');
        return;
      }
    }
  }

  if (!user_id) {
    res.status(403).send('User email not found.');
    return;
  }


  res.cookie('user_id', user_id);
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/');
});

app.get('/register', (req, res) => {
  let templateVars = {};
  templateVars.username = isLoggedIn(req) ? users[req.cookies['user_id']].email : '';

  res.render('register', templateVars);
});

app.post('/register', (req, res) => {
  // Validate registration options
  if (req.body.email === '' || req.body.password === '') {
    res.status(400).send('You cannot register with a blank email or password.');
  }
  for (let user in users) {
    if (users[user].email === req.body.email) {
      res.status(400).send('User already registered to that email address.');
    }
  }

  // Create new user
  let newUserId = generateRandomString(6);
  res.cookie('user_id', newUserId);
  users[newUserId] = {
    id: newUserId,
    email: req.body.email,
    password: req.body.password
  };
  res.redirect('/');
});

app.get('/urls', (req, res) => {
  let templateVars = {
    urls: filterDBbyCreator(req, urlDatabase)
  };
  templateVars.username = isLoggedIn(req) ? users[req.cookies['user_id']].email : '';

  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  if (!isLoggedIn(req)) {
    res.redirect('/login');
    return;
  }

  let templateVars = {};
  templateVars.username = isLoggedIn(req) ? users[req.cookies['user_id']].email : '';

  res.render('urls_new', templateVars);
});

app.post('/urls/create', (req, res) => {
  // debug statement to see POST parameters
  console.log(req.body);

  const shortURL = generateRandomString(6);
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    createdBy: req.cookies['user_id']
  }

  res.redirect('/urls');
});

app.post('/urls/:id/delete', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

app.post('/urls/:id', (req, res) => {
  urlDatabase[req.params.id] = req.body.newLongURL;
  res.redirect('/urls');
});

app.get('/urls/:id', (req, res) => {
  let templateVars = {
    shortURL: req.params.id
  };

  templateVars.username = isLoggedIn(req) ? users[req.cookies['user_id']].email : '';

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