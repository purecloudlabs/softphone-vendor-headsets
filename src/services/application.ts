// TODO: This is just a shell for now to make things work
class HostedContext {
  supportsJabra (): boolean {
    return true;
  }

  isHosted (): boolean {
    return true;
  }
}

export default class ApplicationService {
  static instance: ApplicationService;
  public hostedContext: HostedContext = new HostedContext();

  private constructor() {}

  static getInstance (): ApplicationService {
    if (!this.instance) {
      this.instance = new ApplicationService();
    }

    return this.instance;
  }
}