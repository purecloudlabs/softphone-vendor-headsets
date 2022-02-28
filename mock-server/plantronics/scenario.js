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
  for (const endpoint of Object.keys(scenario)) {
    const definition = scenario[endpoint];
    if (!definition.responses && !definition.repeatResponse && !definition.ignore) {
      throw new Error(`Invalid endpoint definition for ${endpoint}`);
    }
  }

  currentScenario = scenario;
}

function deleteScenario () {
  currentScenario = {};
}

function getResponseForEndpoint (requestedEndpoint) {
  let endpointScenario;

  for (const endpoint of Object.keys(currentScenario)) {
    if (wildstring.match(endpoint, requestedEndpoint)) {
      endpointScenario = currentScenario[endpoint];
      break;
    }
  }

  if (!endpointScenario) {
    throw new Error(`No matching scenario for "${requestedEndpoint}"`);
  }

  if (endpointScenario.ignore) {
    return { Result: {} };
  }

  if (endpointScenario.repeatResponse) {
    return endpointScenario.repeatResponse;
  }

  if (!endpointScenario.responses.length) {
    return null;
  } else {
    const response = endpointScenario.responses.splice(0, 1)[0];
    return response;
  }
}

module.exports = {
  getScenario,
  setScenario,
  deleteScenario,
  getResponseForEndpoint
};
