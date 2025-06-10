$(document).ready(function () {

  /*global io*/
  let socket = io();

  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();
    socket.emit('chat message', messageToSend);
    $('#m').val('');
    return false; // prevent form submit from refreshing page
  });

  //listening to the event emited by server.js
  socket.on('user', data => {
    $('#num-users').text(data.currentUsers + ' users online');
    let message =
      data.username +
      (data.connected ? ' has joined the chat.' : ' has left the chat.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });

  //listening to the messages sent by the server
  socket.on('chat message', data => {
    $('#messages').append($('<li>').html('<b>' + data.username + ': ' + data.message + '<b>'));
  });

});
