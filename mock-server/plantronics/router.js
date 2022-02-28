const express = require('express');
const router = express.Router();
const scenario = require('./scenario');

let pendingEvents = [];
function buildCallEventAction (eventCode) {
  return {
    Action: eventCode,
    CallId: {
      ConferenceId: 0,
      Id: 0,
      InConference: false
    },
    CallSource: 'genesys-cloud-headset-library',
    DeviceEvent: 4,
    DialedKey: 0
  };
}

function clearEvents () {
  pendingEvents = [];
}

// Custom endpoints for testing
router.get('/scenario', (req, res, next) => {
  res.json(scenario.getScenario());
});

router.post('/scenario', (req, res) => {
  try {
    scenario.setScenario(req.body);
    res.json({success: true});
  } catch (err) {
    console.error(err);
    res.status(400).send(err);
  }
});

router.delete('/scenario', (req, res) => {
  scenario.deleteScenario();
  res.json({success: true});
});

// Endpoint for manually adding events to the queue. This is the endpoint that will be used
// to simulate actions performed by the headset. Expects an array of event codes (integers).
router.put('/callEvents', (req, res) => {
  pendingEvents.push(...req.body);
  res.json({currentList: pendingEvents});
});

router.delete('/callEvents', (req, res) => {
  clearEvents();
  res.json({success: true});
});

// Mocked plantronics endpoints
router.get('/CallServices/CallEvents', (req, res) => {
  const responseBody = {
    Description: 'Call Events',
    Result: [],
    Type: 10,
    Type_Name: 'CallStateArray',
    isError: false
  };

  pendingEvents.forEach(eventCode => responseBody.Result.push(buildCallEventAction(eventCode)));
  clearEvents();
  res.send(responseBody);
});

// This route will catch all requests directed to the plantronics api and will respond with the requested data
router.get('*', (req, res) => {
  const requestUrl = req.originalUrl.split(req.baseUrl)[1].split('&callback=')[0];
  console.info(`Attempting to handle request: ${requestUrl}`);

  let response;
  let status = 200;

  try {
    response = scenario.getResponseForEndpoint(requestUrl);
    if (!response) {
      response = `No more responses for endpoint`;
      res.status(status);
    } else {
      status = 200;

      if (response._triggersEvents) {
        pendingEvents.push(...response._triggersEvents);
      }
    }
  } catch (err) {
    response = err.message;
    status = 404;
  }

  res.status(status).json(response);
  console.info(`Response for ${requestUrl} : ${status} : ${JSON.stringify(response)}`);
});

module.exports = router;
