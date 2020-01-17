import HeadsetService from '../../src/services/headset';

describe('HeadsetService', () => {
  it('should be a singleton', () => {
    const ref1 = HeadsetService.getInstance();
    const ref2 = HeadsetService.getInstance();

    expect(ref1).not.toBeFalsy();
    expect(ref2).not.toBeFalsy();
    expect(ref1).toBe(ref2);
  });

  // describe('changeImplementation', () => {
  //   it('should trigger implementationChanged event for new implementation', () => {
  //     // TODO
  //     throw new Error('Test not implemented');
  //   });
  //   it('should trigger implementationChanged event after clearing implementation', () => {
  //     // TODO
  //     throw new Error('Test not implemented');
  //   });
  // });

  // describe('incomingCall', () => {
  //   it('should call incomingCall on the implService', () => {
  //     // TODO
  //     throw new Error('Test not implemented');
  //   });
  // });

  // describe('answerCall', () => {
  //   it('should call answerCall on the implService', () => {
  //     // TODO
  //     throw new Error('Test not implemented');
  //   });
  // });

  // describe('endCall', () => {
  //   it('should call endCall on the implService', () => {
  //     // TODO
  //     throw new Error('Test not implemented');
  //   });
  // });

  // describe('endAllCalls', () => {
  //   it('should call endAllCalls on the implService', () => {
  //     // TODO
  //     throw new Error('Test not implemented');
  //   });
  // });
});