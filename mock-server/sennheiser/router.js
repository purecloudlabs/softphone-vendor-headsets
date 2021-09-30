const express = require('express');
const router = express.Router();
const scenario = require('./scenario');
const cors = require('cors');
const sennheiserWs = require('./ws-server');

// Custom endpoints for testing
router.get('/scenario', cors(), (req, res, next) => {
  res.json(scenario.getScenario());
});

router.post('/scenario', cors(), (req, res) => {
  try {
    scenario.setScenario(req.body);
    res.json({success: true});
  } catch (err) {
    console.error(err);
    res.status(400).send(err);
  }
});

router.delete('/scenario', cors(), (req, res) => {
  scenario.deleteScenario();
  res.json({success: true});
});

// Endpoint for manually triggering events from the sennheiser/server. This is the endpoint that will be used
// to simulate actions performed by the headset. Expects an array of responses/events to be sent serially to the client
router.put('/events', cors(), (req, res) => {
  sennheiserWs.sendEvents(req.body);
  res.json(null);
});

module.exports = router;
