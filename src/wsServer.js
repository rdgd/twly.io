const parseUserIdFromCookie = require('./serverHelpers').parseUserIdFromCookie;
const WebSocketServer = require('ws').Server;

var userWebsockets = {};

function init (server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    let userId = parseUserIdFromCookie(ws.upgradeReq.headers.cookie);
    console.log(`websocket connection made by user ${userId}`);
    userWebsockets[userId] = ws;
    ws.on('message', message => console.log('received: %s', message));

    sendWsMessage(userId, 'connected');
  });
}


function sendWsMessage (userId, title, payload = {}) {
  let ws = userWebsockets[userId];
  return ws.send(JSON.stringify({ title, payload }));
}

module.exports = { init, sendWsMessage };