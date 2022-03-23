# Softphone Vendor Headsets

### Overview
This library's goal is to abstract all the different headset implementations behind a single interface.

This project has a [React](https://github.com/facebook/react/) test app bootstrapped with [create-react-app](https://reactjs.org/docs/create-a-new-react-app.html).

At this moment (12/10/2021) there are three supported vendors already handled with this library:
- Plantronics/Poly
- Sennheiser/EPOS
- Jabra

### Installation

``` sh
# npm
npm install --save softphone-headset-vendors
# yarn
yarn softphone-headset-vendors
```

### Documentation
#### Structure and flow
- The consuming app will first above anything else hit the HeadsetService (`headsets.ts`).
- From there, the service will determine what vendor is currently selected out of the supported vendors above.  This will also be a hub to call the proper functions that correspond with app to headset events (More on that later)
- Once the desired vendor has been determined, an instance of that vendor's adapter/service will be created. This adapter will interact with the service or sdk the vendor requires to communicate information to and from the headset.
- If an event is received from the headset itself, the vendor adapters will emit an event that `headset.ts` is listening for.  This event will then be passed to the consuming app to properly reflect the state on screen to match that of the headset

**Example 1 - User clicks mute in the consuming app**:
- From the consuming app, the user clicks on an on-screen mute button
- The consuming app calls headsetService.mute(...)
- Which is passed to the corresponding function of the vendor adapter that aligns with the selected device (for example, plantronics.ts -> setMute(true))
- This function will then send a message to the headset itself
- The user will then see the light on their device that represents the "muted" state light up.

**Example 2 - User presses the mute button from the headset**:
- From the headset, the user presses the button which corresponds to mute
- This is then received by the vendor instance (for example sennheiser.ts)
- This event is then sent to `headset.ts` which in turn lets the consuming app know so that the screen can properly reflect the state of the headset

#### WebHID
One of our supported vendors has began working with a technology known as [WebHID][1].  This is a relatively newer technology with a lot of promise but with its own caveats as well - https://wicg.github.io/webhid/
- At this moment, WebHID only works with Chromium browsers (Google Chrome/Microsoft Edge).  Keep this in mind when developing and using the vendors we currently support
- In order to use WebHID, you must grant permissions for the site you are currently on.  There is a function that must be called that causes a popup to show on screen where the user is then required to select their device and approve its use for WebHID purposes.  This function MUST be called with user action (i.e. clicking a button).  The solution we currently have in place is after the user changes and selects a new microphone, we check if it is the specific vendor that supports WebHID, then we emit an event that a consuming app should listen for. Once the consuming app receives that event, we will render an initial popup informing the user that additional permissions are required and prompting them to click either "Yes" or "No". Clicking "Yes" acts as the necessary `user action` and we render the necessary WebHID permission popup with the help of the passed in function.
### Contributing
This repo uses [Jest][3] for tests and code coverage

To get started in development:
```sh
npm install
cd react-app
yarn start
```
Then navigate to https://localhost:8443 to see the test app.  This way you can see the effects of the events from the headset on the app and vice versa.

### Testing
Run the tests using `npm run test:watch` or `npm run test:coverage`.  Both commands should be run in the folder.
- `test:watch` will rerun the tests after changes to the code or the test itself
- `test:coverage` will run the test suites and produce a report on coverage of the code

All linting and tests must pass 100% and coverage should remain at 100%

**Important Note**: Out of the box, the test scripts will not work on Windows machines.  A developer will more than likely need to make modifications to the scripts in the package.json as well as the shell scripts found in the `scripts` folder.  If you do not want to modify the scripts out of the box, using a Linux instance seemed to help.  The author of the library used an Ubuntu instance

[1]: https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API
[2]: https://wicg.github.io/webhid/
[3]: https://jestjs.io/en/