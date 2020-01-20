import Implementation from '../Implementation';

export default class PlantronicsService extends Implementation {
  private static instance: PlantronicsService;

  private constructor() {
    super();
  }

  static getInstance () {
    if (!PlantronicsService.instance) {
      PlantronicsService.instance = new PlantronicsService();
    }

    return PlantronicsService.instance;
  }
}