'use strict';
require('dotenv').config();
console.log('Environment variables loaded in auth.js');
console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('GITHUB')));
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const passport = require('passport');
const session = require('express-session');
const routes = require('./routes.js');
const auth = require('./auth.js');

const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//session handling (express)
app.use(session({
  cookie: { secure: false },
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  store: store,
  resave: true,
  saveUninitialized: true
}));

//initialising Passport for session login
app.use(passport.initialize(), passport.session());

//rendering page templates (pug)
app.set('view engine', 'pug');
app.set('views', './views/pug');



//handle MongoDB connection
myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  //call to the auth.js file
  auth(app, myDataBase);
  //call to the routes.js file
  routes(app, myDataBase);

  let currentUsers = 0;

  //block to run Passport for SocketIO
  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );

  function onAuthorizeSuccess(data, accept) {
    console.log('successful connection to socket.io');
  
    accept(null, true);
  }
  
  function onAuthorizeFail(data, message, error, accept) {
    if (error) throw new Error(message);
    console.log('failed connection to socket.io:', message);
    accept(null, false);
  }
  

  //block to listen to connections to SocketIO
  io.on('connection', socket => {
    console.log('user ' + socket.request.user.username + ' connected');
    ++currentUsers;
    //emiting an event with the user data so client.js captures it
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: true
    });

    //receive the message from one client and send it to the rest
    socket.on('chat message', message => {
      io.emit('chat message', { 
        username: socket.request.user.username,
        message: message
      });
    });
    
    socket.on('disconnect', () => {
      console.log('user ' + socket.request.user.username + ' disconnected');
      --currentUsers;
      io.emit('user count', currentUsers);  //emiting an event with the user count so client.js captures it
    });
  });


}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});


// run the code above
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
