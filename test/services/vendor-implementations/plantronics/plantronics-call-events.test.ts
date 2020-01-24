import { CallEvents } from '../../../../src/services/vendor-implementations/plantronics/plantronics-call-events';

describe('CallEvents', () => {
  it('should return 0 for Unknown', () => {
    expect(CallEvents.Unknown).toEqual(0);
  });
  it('should return 1 for AcceptCall', () => {
    expect(CallEvents.AcceptCall).toEqual(1);
  });
  it('should return 2 for TerminateCall', () => {
    expect(CallEvents.TerminateCall).toEqual(2);
  });
  it('should return 3 for HoldCall', () => {
    expect(CallEvents.HoldCall).toEqual(3);
  });
  it('should return 4 for ResumeCall', () => {
    expect(CallEvents.ResumeCall).toEqual(4);
  });
  it('should return 5 for Flash', () => {
    expect(CallEvents.Flash).toEqual(5);
  });
  it('should return 6 for CallInProgress', () => {
    expect(CallEvents.CallInProgress).toEqual(6);
  });
  it('should return 7 for CallRinging', () => {
    expect(CallEvents.CallRinging).toEqual(7);
  });
  it('should return 8 for CallEnded', () => {
    expect(CallEvents.CallEnded).toEqual(8);
  });
  it('should return 9 for TransferToHeadset', () => {
    expect(CallEvents.TransferToHeadset).toEqual(9);
  });
  it('should return 10 for TransferToSpeaker', () => {
    expect(CallEvents.TransferToSpeaker).toEqual(10);
  });
  it('should return 11 for Mute', () => {
    expect(CallEvents.Mute).toEqual(11);
  });
  it('should return 12 for Unmute', () => {
    expect(CallEvents.Unmute).toEqual(12);
  });
  it('should return 13 for MobileCallRinging', () => {
    expect(CallEvents.MobileCallRinging).toEqual(13);
  });
  it('should return 14 for MobileCallInProgress', () => {
    expect(CallEvents.MobileCallInProgress).toEqual(14);
  });
  it('should return 15 for MobileCallEnded', () => {
    expect(CallEvents.MobileCallEnded).toEqual(15);
  });
  it('should return 16 for DOn', () => {
    expect(CallEvents.DOn).toEqual(16);
  });
  it('should return 17 for DOff', () => {
    expect(CallEvents.DOff).toEqual(17);
  });
  it('should return 18 for CallIdle', () => {
    expect(CallEvents.CallIdle).toEqual(18);
  });
  it('should return 19 for Play', () => {
    expect(CallEvents.Play).toEqual(19);
  });
  it('should return 20 for Pause', () => {
    expect(CallEvents.Pause).toEqual(20);
  });
  it('should return 21 for Stop', () => {
    expect(CallEvents.Stop).toEqual(21);
  });
  it('should return 22 for DTMLKey', () => {
    expect(CallEvents.DTMLKey).toEqual(22);
  });
  it('should return 23 for RejectCall', () => {
    expect(CallEvents.RejectCall).toEqual(23);
  });
  it('should return 24 for MakeCall', () => {
    expect(CallEvents.MakeCall).toEqual(24);
  });
  it('should return 25 for Hook', () => {
    expect(CallEvents.Hook).toEqual(25);
  });
  it('should return 26 for HookIdle', () => {
    expect(CallEvents.HookIdle).toEqual(26);
  });
  it('should return 27 for HookDocked', () => {
    expect(CallEvents.HookDocked).toEqual(27);
  });
  it('should return 28 for HookUndocked', () => {
    expect(CallEvents.HookUndocked).toEqual(28);
  });
  it('should return 29 for BaseEvent', () => {
    expect(CallEvents.BaseEvent).toEqual(29);
  });
  it('should return 30 for CallAnsweredAndEnded', () => {
    expect(CallEvents.CallAnsweredAndEnded).toEqual(30);
  });
  it('should return 31 for CallUnansweredAndEnded', () => {
    expect(CallEvents.CallUnansweredAndEnded).toEqual(31);
  });
  it('should return 32 for DeviceChange', () => {
    expect(CallEvents.DeviceChange).toEqual(32);
  });
  it('should return 33 for DeviceArrived', () => {
    expect(CallEvents.DeviceArrived).toEqual(33);
  });
  it('should return 3 for DeviceRemoved', () => {
    expect(CallEvents.DeviceRemoved).toEqual(3);
  });
});
