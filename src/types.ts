export interface TranslationResult {
  originalText: string;
  translatedText: string;
  from: string;
  to: string;
  service: string;
}

export interface TranslationService {
  name: string;
  translate(text: string, from: string, to: string): Promise<TranslationResult>;
  getSupportedLanguages(): Promise<Array<{ code: string; name: string }>>;
}

export type ServiceName = "youdao" | "deepseek";

export type appKeyItem = {
  appKey: string;
  appSecret: string;
};

export interface TranslationConfig {
  defaultService: ServiceName;
  defaultSourceLang: string;
  defaultTargetLang: string;
  apiKeys: {
    [K in ServiceName]?: appKeyItem;
  };
}

export interface CommandOptions {
  from?: string;
  to?: string;
  service?: ServiceName;
  interactive?: boolean;
}
