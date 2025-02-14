import { TranslationService, TranslationConfig, ServiceName } from "./types";
import { YoudaoTranslateService } from "./services/youdao";
import { DeepSeekTranslateService } from "./services/deepseek";
import { ConfigManager } from "./config";

export class TranslationFactory {
  private static services: Map<ServiceName, TranslationService> = new Map();
  private static configManager = new ConfigManager();

  public static getService(serviceName?: ServiceName): TranslationService {
    this.configManager.reset();
    const config = this.configManager.getConfig();
    const service =
      serviceName || (config.defaultService as ServiceName) || "youdao";

    if (this.services.has(service)) {
      return this.services.get(service)!;
    }

    const apiKey = this.configManager.getApiKey(service);
    if (!apiKey) {
      throw new Error(`API key not found for service: ${service}`);
    }

    let translationService: TranslationService;

    switch (service.toLowerCase()) {
      case "youdao":
        translationService = new YoudaoTranslateService(apiKey);
        break;
      case "deepseek":
        translationService = new DeepSeekTranslateService(apiKey);
        break;
      default:
        throw new Error(`Unsupported translation service: ${service}`);
    }

    this.services.set(service, translationService);
    return translationService;
  }

  public static getConfig(): TranslationConfig {
    return this.configManager.getConfig();
  }

  public static setApiKey(service: ServiceName, apiKey: string): void {
    this.configManager.setApiKey(service, apiKey);
    // Clear the cached service instance to ensure it's recreated with the new API key
    this.services.delete(service);
  }

  public static setDefaultService(service: ServiceName): void {
    this.configManager.setDefaultService(service);
  }

  public static setDefaultLanguages(source: string, target: string): void {
    this.configManager.setDefaultLanguages(source, target);
  }

  public static reset(): void {
    this.configManager.reset();
    this.services.clear();
  }
}

export {
  TranslationService,
  TranslationResult,
  TranslationConfig,
  CommandOptions,
} from "./types";
export { YoudaoTranslateService } from "./services/youdao";
export { DeepSeekTranslateService } from "./services/deepseek";
