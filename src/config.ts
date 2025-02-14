import Conf from "conf";
import { appKeyItem, ServiceName, TranslationConfig } from "./types";

export class ConfigManager {
  private config: Conf<TranslationConfig>;

  constructor() {
    this.config = new Conf<TranslationConfig>({
      projectName: "terminal-translator",
      defaults: {
        defaultService: "youdao",
        defaultSourceLang: "auto",
        defaultTargetLang: "en",
        apiKeys: {
          youdao: {
            appKey: "60e4479f20e0a4d4",
            appSecret: "UHN5hjnYK5QYWEyQhzBPDsukxnVeLJ6P",
          },
        },
      },
    });
  }

  public getConfig(): TranslationConfig {
    return this.config.store;
  }

  public setApiKey(service: ServiceName, apiKey: string): void {
    const apiKeys = this.config.get("apiKeys");
    this.config.set("apiKeys", { ...apiKeys, [service]: apiKey });
  }

  public getApiKey(service: ServiceName): appKeyItem | undefined {
    return this.config.get("apiKeys")?.[service];
  }

  public setDefaultService(service: ServiceName): void {
    this.config.set("defaultService", service);
  }

  public setDefaultLanguages(source: string, target: string): void {
    this.config.set("defaultSourceLang", source);
    this.config.set("defaultTargetLang", target);
  }

  public reset(): void {
    this.config.clear();
    // 重新初始化默认配置
    this.config.set({
      defaultService: "youdao",
      defaultSourceLang: "auto",
      defaultTargetLang: "en",
      apiKeys: {
        youdao: {
          appKey: "60e4479f20e0a4d4",
          appSecret: "UHN5hjnYK5QYWEyQhzBPDsukxnVeLJ6P",
        },
      },
    });
  }
}
