/**
 * The state of the call to be sent to the headset.
 */
declare enum CallState {
    IDLE = 0,
    INCOMING = 1,
    OUTGOING = 2,
    ACTIVE = 3,
    ACTIVE_AND_INCOMING = 4,
    ACTIVE_AND_HELD = 5,
    HELD = 6
}
/**
 * Events from the headset, such as commands from user interaction.
 */
declare enum SdkEvent {
    ANSWER = 0,
    TERMINATE = 1,
    REJECT = 2,
    HOLD = 3,
    RESUME = 4,
    REDIAL = 5,
    FLASH = 6,
    MUTE = 7,
    UNMUTE = 8,
    DISCONNECT = 9,
    CONNECT_SUCCESS = 10,
    CONNECT_FAILED = 11
}
/**
 * The default export from the module.
 * Making extra instances of this class is not useful,
 * all instances will talk to the same headset.
 */
declare class CallControlSdk {
    private static ccSdkModule;
    private static callbacks;
    private static load;
    private get module();
    /**
     * Must be called on a user thread so that this can present the
     * default browser UI for selecting a device from the menu. Note: The SDK
     * Event SdkEvent.CONNECT_SUCCESS or SdkEvent.CONNECT_FAILED will come after
     * to signal it is safe to start setting states, or that a retry is needed.
     *
     * @returns Promise<boolean> true on success.
     */
    connectHeadset(): Promise<boolean>;
    /**
     * Uses the already-requested HIDDevice for the connection.
     * The SDK does not trigger any browser prompts when using this method.
     * Note: The SDK Event SdkEvent.CONNECT_SUCCESS or SdkEvent.CONNECT_FAILED
     * will come after to signal it is safe to start setting states, or that a
     * retry is needed.
     *
     * @param headset The HIDDevice as received from `navigator.hid.requestDevice()` or `navigator.hid.getDevices()`.
     * @returns Promise<boolean> true on success.
     */
    connectHeadset(headset: HIDDevice): Promise<boolean>;
    /**
     * Disconnect the current headset and free SDK memory.
     *
     * @returns Promise<boolean> true on success
    */
    disconnectHeadset(): Promise<boolean>;
    /**
     * Register handler for SDK Events. This must be done before calling connect.
     *
     * @param event_handler A callback to receive the events from the headset.
     * @returns Promise<boolean> true on success.
     */
    registerEventHandler(handler: (sdkEvent: number) => void): Promise<boolean>;
    /**
     * Informs the headset of the client app's current call state. This needs to be set even if the new state is a result of a SDK Event.
     *
     * @param call_state current call state.
     * @returns Promise<boolean> true on success
    */
    setCallState(callState: CallState): Promise<boolean>;
    /**
    * Informs the headset of the client app's current mute state. This needs to be set even if the new state is a result of a SDK Event.
    *
    * @param mute_state current mute state.
    * @returns Promise<boolean> true on success
    */
    setMuteState(muteState: boolean): Promise<boolean>;
}

export { CallControlSdk, CallState, SdkEvent, CallControlSdk as default };
