export default class JabraNativeService {
  private static instance: JabraNativeService;


  private constructor() { }

  static getInstance () {
    if (!JabraNativeService.instance) {
      JabraNativeService.instance = new JabraNativeService();
    }

    return JabraNativeService.instance;
  }
}