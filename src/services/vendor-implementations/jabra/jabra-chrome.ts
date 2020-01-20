import Implementation from '../Implementation';

export default class JabraChromeService extends Implementation {
  private static instance: JabraChromeService;

  private constructor() {
    super();
  }

  static getInstance () {
    if (!JabraChromeService.instance) {
      JabraChromeService.instance = new JabraChromeService();
    }

    return JabraChromeService.instance;
  }
}