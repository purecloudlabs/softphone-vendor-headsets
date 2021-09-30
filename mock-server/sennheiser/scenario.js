/* a scenario look something like:

{
  '/SessionManager/Register?name="tinker"': {
    responses: [
      {
        Err: null,
        Result: {
          ...
        }
      },
      {
        Err: {
          ...
        },
        Result: {
          ...
        }
      }
    ]
  },
  '/CallServices/CallEvents': {
    ignore: true
  },
  '/Some/Other/Endpoint': {
    repeatResponse: {
      Err: null,
      Result: ...
    }
  },
  ...
}

You can also use wildcards in your endpoints
so you don't have to match params.

Valid scenario properties:
responses: Array<Object> =      Each time the endpoint is matched, it will remove the first response from
                                the responses array and return it.

repeatResponse: Object =        Response will be returned each time the endpoint matches. Will not be removed
                                on endpoint match

ignore: boolean =               Will return and simple "empty" response in the format { Result: {} }

_triggersEvents: Array<number>  If defined, these numbers which represent event codes will be added to the
                                pendingEvents array in the router
*/
const wildstring = require('wildstring');

let currentScenario = {};

function getScenario () {
  return currentScenario;
}

function setScenario (scenario) {
  for (const event of Object.keys(scenario)) {
    const definition = scenario[event];
    if (!definition.responses && !definition.repeatResponse && !definition.ignore) {
      throw new Error(`Invalid event response definition for ${event}`);
    }
  }

  currentScenario = scenario;
}

function deleteScenario () {
  currentScenario = {};
}

function getResponseForEvent (event) {
  let eventResponseInfo;
  const eventName = event.Event;
  for (const event of Object.keys(currentScenario)) {
    if (wildstring.match(event, eventName)) {
      eventResponseInfo = currentScenario[event];
      break;
    }
  }

  if (!eventResponseInfo) {
    return null;
  }

  if (eventResponseInfo.ignore) {
    return [];
  }

  if (eventResponseInfo.repeatResponse) {
    return eventResponseInfo.repeatResponse._triggersEvents;
  }

  if (!eventResponseInfo.responses.length) {
    return null;
  } else {
    const response = eventResponseInfo.responses.splice(0, 1)[0]._triggersEvents || [];
    return response;
  }
}

module.exports = {
  getScenario,
  setScenario,
  deleteScenario,
  getResponseForEvent
};
