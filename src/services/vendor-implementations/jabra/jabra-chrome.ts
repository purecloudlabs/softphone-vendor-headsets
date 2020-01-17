export default class JabraChromeService {
  private static instance: JabraChromeService;


  private constructor() { }

  static getInstance () {
    if (!JabraChromeService.instance) {
      JabraChromeService.instance = new JabraChromeService();
    }

    return JabraChromeService.instance;
  }
}