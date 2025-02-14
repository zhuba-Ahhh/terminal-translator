import { TranslationService, TranslationResult } from "../types";
import CryptoJS from "crypto-js";

export class DeepSeekTranslateService implements TranslationService {
  private appKey: string;
  private appSecret: string;
  public name = "deepseek";

  constructor(apiKey: { appKey: string; appSecret: string }) {
    this.appKey = apiKey.appKey;
    this.appSecret = apiKey.appSecret;
  }

  async translate(
    text: string,
    from: string,
    to: string
  ): Promise<TranslationResult> {
    const salt = Date.now().toString();
    const curtime = Math.round(Date.now() / 1000).toString();
    const str1 = this.appKey + salt + curtime + this.appSecret;
    const sign = CryptoJS.SHA256(str1).toString(CryptoJS.enc.Hex);

    const messages = [
      {
        role: "system",
        content: `You are a professional translator. Please translate the following text from ${from} to ${to}. Only provide the translation, no explanations.`,
      },
      {
        role: "user",
        content: text,
      },
    ];

    const requestBody = {
      appKey: this.appKey,
      salt,
      sign,
      signType: "v4",
      curtime,
      stream: false,
      model: "Deepseek-r1",
      messages,
    };

    const response = await fetch("https://openapi.youdao.com/ai_dialog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    console.log(
      "[48;2;255;0;255m [ response ]-47-「services/deepseek.ts」 [0m",
      response,
      requestBody
    );

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== "0") {
      throw new Error(`DeepSeek API error: ${data.msg}`);
    }

    return {
      originalText: text,
      translatedText: data.data.choices[0].message.content,
      from,
      to,
      service: this.name,
    };
  }

  async getSupportedLanguages(): Promise<
    Array<{ code: string; name: string }>
  > {
    return [
      { code: "zh-CHS", name: "中文" },
      { code: "en", name: "英语" },
      { code: "ja", name: "日语" },
      { code: "ko", name: "韩语" },
    ];
  }
}
