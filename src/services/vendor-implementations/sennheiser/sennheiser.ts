export default class SennheiserService {
  private static instance: SennheiserService;


  private constructor() { }

  static getInstance () {
    if (!SennheiserService.instance) {
      SennheiserService.instance = new SennheiserService();
    }

    return SennheiserService.instance;
  }
}