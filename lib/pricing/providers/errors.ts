export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} integration not configured.`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderUnavailableError extends Error {
  constructor(provider: string, cause?: string) {
    super(cause ?? `This pricing source is currently unavailable.`);
    this.name = "ProviderUnavailableError";
  }
}
