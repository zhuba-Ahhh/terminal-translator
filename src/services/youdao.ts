import { TranslationService, TranslationResult, appKeyItem } from "../types";
import CryptoJS from "crypto-js";

export class YoudaoTranslateService implements TranslationService {
  private appKey: string;
  private appSecret: string;
  public name = "youdao";

  constructor(apiKey: appKeyItem) {
    const {
      appKey = "60e4479f20e0a4d4",
      appSecret = "UHN5hjnYK5QYWEyQhzBPDsukxnVeLJ6P",
    } = apiKey;
    this.appKey = appKey;
    this.appSecret = appSecret;
  }

  async translate(
    text: string,
    from: string,
    to: string
  ): Promise<TranslationResult> {
    const salt = Date.now();
    const curtime = Math.round(Date.now() / 1000);
    const str1 =
      this.appKey + this.truncate(text) + salt + curtime + this.appSecret;
    const sign = CryptoJS.SHA256(str1).toString(CryptoJS.enc.Hex);

    const params = new URLSearchParams({
      q: text,
      appKey: this.appKey,
      salt: salt.toString(),
      from,
      to,
      sign,
      signType: "v3",
      curtime: curtime.toString(),
    });

    const response = await fetch("https://openapi.youdao.com/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`Youdao API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.translation || data.translation.length === 0) {
      throw new Error("Translation result is empty");
    }

    // 将所有翻译结果合并为一个字符串
    const translatedText = data.translation.join(" ");

    return {
      originalText: text,
      translatedText,
      from,
      to,
      service: this.name,
    };
  }

  private truncate(text: string): string {
    const len = text.length;
    if (len <= 20) return text;
    return text.substring(0, 10) + len + text.substring(len - 10, len);
  }

  async getSupportedLanguages(): Promise<
    Array<{ code: string; name: string }>
  > {
    // 返回有道翻译支持的语言列表
    return [
      { code: "zh-CHS", name: "中文" },
      { code: "en", name: "英语" },
      { code: "ja", name: "日语" },
      { code: "ko", name: "韩语" },
      // 添加更多支持的语言
    ];
  }
}
