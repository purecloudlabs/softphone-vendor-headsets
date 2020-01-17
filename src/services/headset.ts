
export default class HeadsetService {
  private static instance: HeadsetService;


  private constructor() { }

  static getInstance () {
    if (!HeadsetService.instance) {
      HeadsetService.instance = new HeadsetService();
    }

    return HeadsetService.instance;
  }
}