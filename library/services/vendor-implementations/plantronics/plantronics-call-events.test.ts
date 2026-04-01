import { PlantronicsCallEventCodes } from './plantronics-call-events';

describe('CallEvents', () => {
  it('should return 0 for Unknown', () => {
    expect(PlantronicsCallEventCodes.Unknown).toEqual(0);
  });

  it('should return 1 for AcceptCall', () => {
    expect(PlantronicsCallEventCodes.AcceptCall).toEqual(1);
  });

  it('should return 2 for TerminateCall', () => {
    expect(PlantronicsCallEventCodes.TerminateCall).toEqual(2);
  });

  it('should return 3 for HoldCall', () => {
    expect(PlantronicsCallEventCodes.HoldCall).toEqual(3);
  });

  it('should return 4 for ResumeCall', () => {
    expect(PlantronicsCallEventCodes.ResumeCall).toEqual(4);
  });

  it('should return 5 for Flash', () => {
    expect(PlantronicsCallEventCodes.Flash).toEqual(5);
  });

  it('should return 6 for CallInProgress', () => {
    expect(PlantronicsCallEventCodes.CallInProgress).toEqual(6);
  });

  it('should return 7 for CallRinging', () => {
    expect(PlantronicsCallEventCodes.CallRinging).toEqual(7);
  });

  it('should return 8 for CallEnded', () => {
    expect(PlantronicsCallEventCodes.CallEnded).toEqual(8);
  });

  it('should return 9 for TransferToHeadset', () => {
    expect(PlantronicsCallEventCodes.TransferToHeadset).toEqual(9);
  });

  it('should return 10 for TransferToSpeaker', () => {
    expect(PlantronicsCallEventCodes.TransferToSpeaker).toEqual(10);
  });

  it('should return 11 for Mute', () => {
    expect(PlantronicsCallEventCodes.Mute).toEqual(11);
  });

  it('should return 12 for Unmute', () => {
    expect(PlantronicsCallEventCodes.Unmute).toEqual(12);
  });

  it('should return 13 for MobileCallRinging', () => {
    expect(PlantronicsCallEventCodes.MobileCallRinging).toEqual(13);
  });

  it('should return 14 for MobileCallInProgress', () => {
    expect(PlantronicsCallEventCodes.MobileCallInProgress).toEqual(14);
  });

  it('should return 15 for MobileCallEnded', () => {
    expect(PlantronicsCallEventCodes.MobileCallEnded).toEqual(15);
  });

  it('should return 16 for DOn', () => {
    expect(PlantronicsCallEventCodes.DOn).toEqual(16);
  });

  it('should return 17 for DOff', () => {
    expect(PlantronicsCallEventCodes.DOff).toEqual(17);
  });

  it('should return 18 for CallIdle', () => {
    expect(PlantronicsCallEventCodes.CallIdle).toEqual(18);
  });

  it('should return 19 for Play', () => {
    expect(PlantronicsCallEventCodes.Play).toEqual(19);
  });

  it('should return 20 for Pause', () => {
    expect(PlantronicsCallEventCodes.Pause).toEqual(20);
  });

  it('should return 21 for Stop', () => {
    expect(PlantronicsCallEventCodes.Stop).toEqual(21);
  });

  it('should return 22 for DTMLKey', () => {
    expect(PlantronicsCallEventCodes.DTMLKey).toEqual(22);
  });

  it('should return 23 for RejectCall', () => {
    expect(PlantronicsCallEventCodes.RejectCall).toEqual(23);
  });

  it('should return 24 for MakeCall', () => {
    expect(PlantronicsCallEventCodes.MakeCall).toEqual(24);
  });

  it('should return 25 for Hook', () => {
    expect(PlantronicsCallEventCodes.Hook).toEqual(25);
  });

  it('should return 26 for HookIdle', () => {
    expect(PlantronicsCallEventCodes.HookIdle).toEqual(26);
  });

  it('should return 27 for HookDocked', () => {
    expect(PlantronicsCallEventCodes.HookDocked).toEqual(27);
  });

  it('should return 28 for HookUndocked', () => {
    expect(PlantronicsCallEventCodes.HookUndocked).toEqual(28);
  });

  it('should return 29 for BaseEvent', () => {
    expect(PlantronicsCallEventCodes.BaseEvent).toEqual(29);
  });

  it('should return 30 for CallAnsweredAndEnded', () => {
    expect(PlantronicsCallEventCodes.CallAnsweredAndEnded).toEqual(30);
  });

  it('should return 31 for CallUnansweredAndEnded', () => {
    expect(PlantronicsCallEventCodes.CallUnansweredAndEnded).toEqual(31);
  });

  it('should return 32 for DeviceChange', () => {
    expect(PlantronicsCallEventCodes.DeviceChange).toEqual(32);
  });

  it('should return 33 for DeviceArrived', () => {
    expect(PlantronicsCallEventCodes.DeviceArrived).toEqual(33);
  });
  
  it('should return 34 for DeviceRemoved', () => {
    expect(PlantronicsCallEventCodes.DeviceRemoved).toEqual(34);
  });
});
