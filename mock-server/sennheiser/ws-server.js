const WebSocket = require('ws');
const scenario = require('./scenario');

const wss = new WebSocket.Server({ port: 8080 });

const openSockets = [];
let socketCount = 1;

wss.on('connection', function (ws) {
  openSockets.push(ws);
  ws.id = socketCount++;
  console.log(`created new websocket with id: ${ws.id}`);

  ws.on('message', (message) => {
    console.log(`[websocket ${ws.id}] received: ${message}`);
    handleIncomingMessage(ws, message);
  });

  ws.on('error', (err) => {
    console.error(err);
  });

  ws.on('close', () => {
    console.log(`closing websocket with id: ${ws.id}`);
    let index = -1;
    for (let i = 0; i < openSockets.length; i++) {
      if (openSockets[i] === ws) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      console.error('failed to find websocket');
      return;
    }

    openSockets.splice(index, 1);
  });

  sendEvents([{
    Event: 'SocketConnected',
    EventType: 'Notification',
    ReturnCode: 0
  }]);
});

function handleIncomingMessage (ws, message) {
  const json = JSON.parse(message);

  if (json.Event === 'TerminateConnection') {
    sendEventsOnSocket([{ Event: 'TerminateConnection', EventType: 'Acknowledgement' }], ws);
    ws.close();
    return;
  }

  let eventsToTrigger = scenario.getResponseForEvent(json);
  if (!eventsToTrigger) {
    eventsToTrigger = [{Event: 'Unknown', message: `Unhandled event: ${json.Event}`, ReturnCode: 400}];
  }

  sendEventsOnSocket(eventsToTrigger, ws);
}

function sendEventsOnSocket (events, ws) {
  for (let event of events) {
    const stringified = JSON.stringify(event);
    console.log(`[websocket ${ws.id}] sending: ${stringified}`);
    ws.send(stringified);
  }
}

function sendEvents (events) {
  if (!openSockets.length) {
    console.error('Cannot send events because there\'s no websocket connection');
    return;
  }

  for (let ws of openSockets) {
    sendEventsOnSocket(events, ws);
  }
}

module.exports = {
  sendEvents
};
