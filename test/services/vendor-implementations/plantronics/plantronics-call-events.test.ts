import { PlantronicsCallEvents } from '../../../../src/library/services/vendor-implementations/plantronics/plantronics-call-events';

describe('CallEvents', () => {
  it('should return 0 for Unknown', () => {
    expect(PlantronicsCallEvents.Unknown).toEqual(0);
  });
  it('should return 1 for AcceptCall', () => {
    expect(PlantronicsCallEvents.AcceptCall).toEqual(1);
  });
  it('should return 2 for TerminateCall', () => {
    expect(PlantronicsCallEvents.TerminateCall).toEqual(2);
  });
  it('should return 3 for HoldCall', () => {
    expect(PlantronicsCallEvents.HoldCall).toEqual(3);
  });
  it('should return 4 for ResumeCall', () => {
    expect(PlantronicsCallEvents.ResumeCall).toEqual(4);
  });
  it('should return 5 for Flash', () => {
    expect(PlantronicsCallEvents.Flash).toEqual(5);
  });
  it('should return 6 for CallInProgress', () => {
    expect(PlantronicsCallEvents.CallInProgress).toEqual(6);
  });
  it('should return 7 for CallRinging', () => {
    expect(PlantronicsCallEvents.CallRinging).toEqual(7);
  });
  it('should return 8 for CallEnded', () => {
    expect(PlantronicsCallEvents.CallEnded).toEqual(8);
  });
  it('should return 9 for TransferToHeadset', () => {
    expect(PlantronicsCallEvents.TransferToHeadset).toEqual(9);
  });
  it('should return 10 for TransferToSpeaker', () => {
    expect(PlantronicsCallEvents.TransferToSpeaker).toEqual(10);
  });
  it('should return 11 for Mute', () => {
    expect(PlantronicsCallEvents.Mute).toEqual(11);
  });
  it('should return 12 for Unmute', () => {
    expect(PlantronicsCallEvents.Unmute).toEqual(12);
  });
  it('should return 13 for MobileCallRinging', () => {
    expect(PlantronicsCallEvents.MobileCallRinging).toEqual(13);
  });
  it('should return 14 for MobileCallInProgress', () => {
    expect(PlantronicsCallEvents.MobileCallInProgress).toEqual(14);
  });
  it('should return 15 for MobileCallEnded', () => {
    expect(PlantronicsCallEvents.MobileCallEnded).toEqual(15);
  });
  it('should return 16 for DOn', () => {
    expect(PlantronicsCallEvents.DOn).toEqual(16);
  });
  it('should return 17 for DOff', () => {
    expect(PlantronicsCallEvents.DOff).toEqual(17);
  });
  it('should return 18 for CallIdle', () => {
    expect(PlantronicsCallEvents.CallIdle).toEqual(18);
  });
  it('should return 19 for Play', () => {
    expect(PlantronicsCallEvents.Play).toEqual(19);
  });
  it('should return 20 for Pause', () => {
    expect(PlantronicsCallEvents.Pause).toEqual(20);
  });
  it('should return 21 for Stop', () => {
    expect(PlantronicsCallEvents.Stop).toEqual(21);
  });
  it('should return 22 for DTMLKey', () => {
    expect(PlantronicsCallEvents.DTMLKey).toEqual(22);
  });
  it('should return 23 for RejectCall', () => {
    expect(PlantronicsCallEvents.RejectCall).toEqual(23);
  });
  it('should return 24 for MakeCall', () => {
    expect(PlantronicsCallEvents.MakeCall).toEqual(24);
  });
  it('should return 25 for Hook', () => {
    expect(PlantronicsCallEvents.Hook).toEqual(25);
  });
  it('should return 26 for HookIdle', () => {
    expect(PlantronicsCallEvents.HookIdle).toEqual(26);
  });
  it('should return 27 for HookDocked', () => {
    expect(PlantronicsCallEvents.HookDocked).toEqual(27);
  });
  it('should return 28 for HookUndocked', () => {
    expect(PlantronicsCallEvents.HookUndocked).toEqual(28);
  });
  it('should return 29 for BaseEvent', () => {
    expect(PlantronicsCallEvents.BaseEvent).toEqual(29);
  });
  it('should return 30 for CallAnsweredAndEnded', () => {
    expect(PlantronicsCallEvents.CallAnsweredAndEnded).toEqual(30);
  });
  it('should return 31 for CallUnansweredAndEnded', () => {
    expect(PlantronicsCallEvents.CallUnansweredAndEnded).toEqual(31);
  });
  it('should return 32 for DeviceChange', () => {
    expect(PlantronicsCallEvents.DeviceChange).toEqual(32);
  });
  it('should return 33 for DeviceArrived', () => {
    expect(PlantronicsCallEvents.DeviceArrived).toEqual(33);
  });
  it('should return 3 for DeviceRemoved', () => {
    expect(PlantronicsCallEvents.DeviceRemoved).toEqual(3);
  });
});
