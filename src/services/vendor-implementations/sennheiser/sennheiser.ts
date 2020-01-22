import Implementation from '../Implementation';

export default class SennheiserService extends Implementation {
  private static instance: SennheiserService;

  vendorName = 'Sennheiser';

  private constructor() {
    super();
  }

  static getInstance() {
    if (!SennheiserService.instance) {
      SennheiserService.instance = new SennheiserService();
    }

    return SennheiserService.instance;
  }
}
