import Implementation from '../../Implementation';

export default class JabraNativeService extends Implementation {
  private static instance: JabraNativeService;

  private constructor() {
    super();
  }

  static getInstance() {
    if (!JabraNativeService.instance) {
      JabraNativeService.instance = new JabraNativeService();
    }

    return JabraNativeService.instance;
  }
}
