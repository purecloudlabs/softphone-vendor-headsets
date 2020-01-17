export default class PlantronicsService {
  private static instance: PlantronicsService;


  private constructor() { }

  static getInstance () {
    if (!PlantronicsService.instance) {
      PlantronicsService.instance = new PlantronicsService();
    }

    return PlantronicsService.instance;
  }
}