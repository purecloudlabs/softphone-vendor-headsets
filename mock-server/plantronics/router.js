const express = require('express');
const router = express.Router();
const scenario = require('./scenario');
const cors = require('cors');

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

router.put('/callEvents', cors(), (req, res) => {
    pendingEvents.push(...req.body);
    res.json({currentList: pendingEvents});
});

router.delete('/callEvents', cors(), (req, res) => {
    clearEvents();
    res.json({success: true});
});

router.get('/CallServices/CallEvents', (req, res) => {
    const responseBody = {
        Description: 'CallEvents',
        Result: [],
        Type: 10,
        Type_Name: 'CallStateArray',
        isError: false
    };

    pendingEvents.forEach(eventCode => responseBody.Result.push(buildCallEventAction(eventCode)));
    clearEvents();
    res.jsonp(responseBody);
})

router.get('*', (req, res) => {
    const requestUrl = req.originalUrl.split(req.baseUrl)[1].split('&callback=')[0];
    console.info(`Attempting to handle request: ${requestUrl}`);

    let response;
    let status = 404;

    try {
        response = scenario.getResponseForEndpoint(requestUrl);
        if (!response) {
            response = `No more responses for endpoint`;
            res.status(status);
        } else {
            status = 200;

            if (response._triggerEvents) {
                pendingEvents.push(...response._triggerEvents);
            }
        }
    } catch (err) {
        response = err.message;
        res.status(status);
    }

    res.jsonp(response);
    console.info(`Response for ${requestUrl} : ${status} : ${JSON.stringify(response)}`);
});

module.exports = router;