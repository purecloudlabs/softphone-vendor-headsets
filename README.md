# Softphone Vendor Headsets

## Overview
This library's goal is to abstract all the different headset implementations behind a single interface.

This project has a [React](https://github.com/facebook/react/) test app bootstrapped with [create-react-app](https://reactjs.org/docs/create-a-new-react-app.html).

At this moment (12/10/2021) there are three supported vendors already handled with this library:
- Plantronics/Poly
- Sennheiser/EPOS
- Jabra

As of 11/3/2022 we now support:
- Yealink

As of 2/12/24 we now support:
- VBeT
- CyberAcoustics

## Installation

``` sh
# npm
npm install --save softphone-vendor-headsets
# yarn
yarn add softphone-vendor-headsets
```

## Documentation


### Headset Service API
<br/><br/>
#### `getInstance`
This will create a new instance of the headset service if one doesn't already exist. It's important to note the original instance will *always* be returned, even if you pass in different config options
so make sure you get it right the first time. There's only one relevant option for the headset config, see below.
``` ts
static getInstance(config: ImplementationConfig);

interface ImplementationConfig {
  logger: any;
}
```
<br/><br/><br/>

#### `implementations`
This is a computed value that returns a list of selectable headset vendors based on browser/environment compatibility. It does not ensure the required 3rd party software is installed. That gets checked when a vendor is selected or changed.
<br/><br/><br/>
#### `activeMicChange`
The selected headset vendor is determined by the active mic. This method notifies headset service the active mic has changed and it should determine if the "new" mic has an associated vendor implementation.
``` ts
activeMicChange (newMicLabel: string): void;
```
Params:
* `newMicLabel: string` Required: This label should match the device label returned from navigator.getUserMedia()
<br/><br/><br/>

#### `changeImplementation`
Allows you to manually change the selected headset. This is an alternative to `activeMicChange(...)`.
``` ts
changeImplementation (implementation: VendorImplementation | null, deviceLabel: string): Promise<void>
```
params:
* `implementation: VendorImplementation | null` Required: The desired vendor implementation
* `deviceLabel: string` Required: This can be null if the `implementation` is null, otherwise this will be the device associated with the vendor implementation to which you'd like to connect.
<br/><br/><br/>

#### `incomingCall`
Notifies the headset you have an incoming call. In most cases this will result in the headset ringing.
``` ts
incomingCall (callInfo: CallInfo, hasOtherActiveCalls?: boolean): Promise<any>
```
params:
* `callInfo: CallInfo` Required: The desired vendor implementation
  * Basic interface
    ``` ts
    interface CallInfo {
      conversationId: string,
      contactName?: string
    }
  * `conversationId: string`: Required: Most of the vendors use conversation or call ids in order to help maintain proper state of the headset. This is the conversationId associated with the incoming call.
  * `contactName: string`: Optional: Some vendors will announce the caller through the headset if the `contactName` is provided.
* `hasOtherActiveCalls?: boolean` Required: This can be null if the `implementation` is null, otherwise this will be the device associated with the vendor implementation to which you'd like to connect.
<br/><br/><br/>

#### `outgoingCall`
Notifies the headset you are placing an outgoing call.
``` ts
outgoingCall (callInfo: CallInfo): Promise<any>
```
params:
* `callInfo: CallInfo` Required: The desired vendor implementation
  * Basic interface
    ``` ts
    interface CallInfo {
      conversationId: string,
      contactName?: string
    }
  * `conversationId: string`: Required: Most of the vendors use conversation or call ids in order to help maintain proper state of the headset. This is the conversationId associated with the incoming call.
  * `contactName: string`: Optional: Some vendors will announce the caller through the headset if the `contactName` is provided.
<br/><br/><br/>

#### `answerCall`
Notifies the headset you are answering an incoming call. This will end the ringing and enable headset controls.
``` ts
answerCall (conversationId: string): Promise<any>
```
params:
* `conversationId: string`: Required: Most of the vendors use conversation or call ids in order to help maintain proper state of the headset. This is the conversationId associated with the incoming call.
<br/><br/><br/>

#### `rejectCall`
Notifies the headset you are rejecting an incoming call. This will end the ringing.
``` ts
rejectCall (conversationId: string): Promise<any>
```
params:
* `conversationId: string`: Required: Most of the vendors use conversation or call ids in order to help maintain proper state of the headset. This is the conversationId associated with the incoming call.
<br/><br/>

#### `setMute`
Tells the headset to mute or unmute.
``` ts
setMute (value: boolean): Promise<any>
```
params:
* `value: boolean`: Required: If `true`, the headset will be muted. If `false`, the headset will be unmuted.
<br/><br/><br/>


#### `setHold`
Tells the headset you are holding or resuming a call.
``` ts
setHold (conversationId: string, value: boolean): Promise<any>
```
params:
* `conversationId: string`: Required: The id associated with the conversation you'd are holding or resuming.
* `value: boolean`: Required: If `true`, the headset will be held. If `false`, the headset will be resumed.
<br/><br/><br/>
#### `endCall`
Tells the headset a call is ending.
``` ts
endCall (conversationId: string, hasOtherActiveCalls?: boolean): Promise<any>
```
params:
* `conversationId: string`: Required: The id associated with the conversation you'd are holding or resuming.
* `hasOtherActiveCalls?: boolean`: Optional: Some vendors differ in how much state they manage across multiple calls and it has to be shimmed. This allows us to make better decisions in those cases.
<br/><br/><br/>
#### `endAllCalls`
Ends all calls and returns the headset to a vanilla state.
``` ts
endAllCalls (): Promise<void>
```
<br/><br/><br/>
#### `retryConnection`
There are cases where 3rd party software needs to be started in order for the headset to connect. The method allows you to retry the connection after spinning up 3rd party software.
``` ts
retryConnection (micLabel: string): Promise<void>
```
Params:
* `micLabel: string` Required: This label should match the device label returned from navigator.getUserMedia()
<br/><br/><br/>

#### `connectionStatus`
Returns the current connection state of the headset.
``` ts
connectionStatus (): DeviceConnectionStatus
```
Returns:
  ``` ts
  type DeviceConnectionStatus = 'checking' | 'running' | 'notRunning' | 'noVendor';
  ```
<br/><br/><br/>

### Headset Events
The Headset service does not explicitly emit events itself. It uses [RxJS observables](https://rxjs.dev/guide/observable) to emit the events which are then subscribed to within the consuming app.

#### `deviceAnsweredCall`
Event emitted when a user presses the answer call button during an incoming call on their selected device. The event includes the event `name` as it is interpretted by the headset and a collection of items that may help with logging (`event`). It can also potentially have a `code` that corresponds to the event.

Declaration:
``` ts
    headset.headsetEvents.subscribe(event: {
        event: 'deviceAnsweredCall',
        payload: {
            name: string,
            code?: string,
            event: { `containing various items mostly for logging purposes` }
        }
    } => {
        if (event.event === 'deviceAnsweredCall') {
            sdk.acceptPendingSession();
        }
    })
```
Value of event:
* `event: HeadsetEvents` - string value emitted by the headset library to determine what event had just occurred
* `payload:` - object containing
    * `name: string` - Name of the recent event as interpretted by the headset device
    * `event`: { containing various items mostly for logging purposes}
    * `code?: string` - Optional: A string value of a number that represents the action that was just taken. Not all vendors supply a code which is why it is only optional

<br/><br/>

#### `deviceEndedCall`
Event emitted when a user presses the answer call button while in an active call on their selected device. The event includes the event `name` as it is interpretted by the headset and a collection of items that may help with logging (`event`). It can also potentially have a `code` that corresponds to the event.

Declaration:
``` ts
    headset.headsetEvents.subscribe(event: {
        event: 'deviceEndedCall',
        payload: {
            name: string,
            event: { `containing various items mostly for logging purposes` },
            code?: string
        } => {
            if (event.event === 'deviceEndedCall') {
                sdk.endSession({ conversationId });
            }
        }
    })
```
Value of event:
* `event: HeadsetEvents` - string value emitted by the headset library to determine what event had just occurred
* `payload:` - object containing
    * `name: string` - Name of the recent event as interpretted by the headset device
    * `event`: { containing various items mostly for logging purposes}
    * `code?: string` - Optional: A string value of a number that represents the action that was just taken. Not all vendors supply a code which is why it is only optional
<br/><br/>

#### `deviceMuteStatusChanged`
Event emitted when a user presses the mute call button on their selected device. It doesn't matter if the device state is currently muted or unmuted,
this event will be emitted with the _OPPOSITE_ value. For example, if the headset is currently muted, it will emit the event with the corresponding
value to unmute the device. The event includes the event `name` as it is interpretted by the headset and a collection of items that may help with
logging (`event`). It also comes with a value known as `isMuted` which determines the event is trying to mute or unmute the call. It can also
potentially have a `code` that corresponds to the event.

Declaration:
``` ts
    headset.headsetEvents.subscribe(event: {
        event: 'deviceMuteStatusChanged',
        payload: {
            name: string,
            event: { `containing various items mostly for logging purposes` },
            isMuted: boolean,
            code?: string
        } => {
            if (event.event === 'deviceMuteStatusChanged') {
                sdk.setAudioMute(event.payload.isMuted);
            }
        }
    })
```
Value of event:
* `event: HeadsetEvents` - string value emitted by the headset library to determine what event had just occurred
* `payload:` - object containing
    * `name: string` - Name of the recent event as interpretted by the headset device
    * `event`: { containing various items mostly for logging purposes}
    * `isMuted: boolean` - the value determining if the event is to mute (`true`) or unmute (`false`) the device
    * `code?: string` - Optional: A string value of a number that represents the action that was just taken. Not all vendors supply a code which is why it is only optional
<br/><br/>

#### `deviceHoldStatusChanged`
Event emitted when a user presses the hold call button on their selected device. It doesn't matter if the device state is currently on hold or not,
this event will be emitted with the _OPPOSITE_ value. For example, if the headset is currently on hold, it will emit the event with the corresponding value to
resume the call. The event includes the event `name` as it is interpretted by the headset and a collection of items that may help with logging (`event`).
It also comes with a value known as `holdRequested` which determines the event is trying to hold or resume the call. It will also have an optional value for `toggle`.
It can also potentially have a `code` that corresponds to the event.

Declaration:
``` ts
    headset.headsetEvents.subscribe(event: {
        event: 'deviceHoldStatusChanged',
        payload: {
            name: string,
            event: { `containing various items mostly for logging purposes` },
            holdRequested: boolean,
            code?: string
        } => {
            if (event.event === 'deviceHoldStatusChanged') {
                sdk.setConversationHold(event.payload.holdRequested, event.payload.toggle);
            }
        }
    })
```
Value of event:
* `event: HeadsetEvents` - string value emitted by the headset library to determine what event had just occurred
* `payload:` - object containing
    * `name: string` - Name of the recent event as interpretted by the headset device
    * `event`: { containing various items mostly for logging purposes}
    * `holdRequested: boolean` - the value determining if the event is to hold (`true`) or resume (`false`) the call
    * `code?: string` - Optional: A string value of a number that represents the action that was just taken. Not all vendors supply a code which is why it is only optional
<br/><br/>

#### `webHidPermissionRequested`
This is a special event that is only necessary for specific devices. Certain devices (such as Jabra) support a technology known as
[WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API) that requires additional permissions in order to use the call controls.
This event is emitted when a WebHID enabled device is selected. The event includes a `callback` function that is required in order to
achieve additional permissions for WebHID

Declaration:
``` ts
    headset.headsetEvents.subscribe(event: {
        event: 'webHidPermissionRequested',
        payload: {
            callback: Function
        } => {
            if (event.event === 'webHidPermissionRequested') {
                event.payload.body.callback();
                /* Please note: The above example will not work as is. You can't trigger the WebHID callback by simply calling, it must be triggered through user interaction such as clicking a button */
            }
        }
    })
```
Value of event:
* `event: HeadsetEvents` - string value emitted by the headset library to determine what event had just occurred
* `payload:` - object containing
    * `callback: Function` - the passed in function that will help achieve additional permissions for WebHID devices
<br/><br/>
#### `deviceConnectionStatusChanged`
Event emitted when a device implementation's connection status changes in some way. This can be the flags of `isConnected` or `isConnecting` changing in any way.
These flags are also included with the events payload.

Declaration:
``` ts
    headset.headsetEvents.subscribe(event: {
        event: 'deviceConnectionStatusChanged',
        payload: {
            isConnected: boolean,
            isConnecting: boolean
        } => {
            if (event.event === 'deviceConnectionStatusChanged') {
                correspondingFunctionToHandleConnectionChange({event.payload.isConnected, event.payload.isConnecting});
            }
        }
    })
```
Value of event:
* `event: HeadsetEvents` - string value emitted by the headset library to determine what event had just occurred
* `payload:` - object containing
    * `isConnected: boolean` - if the vendor implementation is fully connected
    * `isConnecting: boolean` - if the vendor implementation is in the process of connecting
<br/><br/><br/>

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