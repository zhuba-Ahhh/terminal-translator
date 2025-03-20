#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { TranslationFactory } from ".";
import { CommandOptions, ServiceName } from "./types";

const SUPPORTED_LANGUAGES = [
  { name: "自动检测", value: "auto" },
  { name: "中文", value: "zh-CHS" },
  { name: "英语", value: "en" },
  { name: "日语", value: "ja" },
  { name: "韩语", value: "ko" },
  { name: "法语", value: "fr" },
  { name: "德语", value: "de" },
  { name: "西班牙语", value: "es" },
];

const SUPPORTED_SERVICES = [{ name: "有道翻译", value: "youdao" }];

program
  .name("translate")
  .description("一个支持多翻译服务的命令行翻译工具")
  .version("1.0.0")
  .argument("[text...]", "要翻译的文本")
  .option("-f, --from <lang>", "源语言 (默认: auto)")
  .option("-t, --to <lang>", "目标语言 (默认: en)")
  .option("-s, --service <name>", "翻译服务 (youdao/baidu/google)")
  .option("-i, --interactive", "交互模式")
  .action(async (textArray: string[] | undefined, options: CommandOptions) => {
    try {
      const config = TranslationFactory.getConfig();
      let textToTranslate = textArray ? textArray.join("\n") : undefined;
      let fromLang = options.from || config.defaultSourceLang;
      let toLang = options.to || config.defaultTargetLang;
      let service = options.service || config.defaultService;

      const apiKeys = config.apiKeys || {};
      const needApiKey = !apiKeys[service];

      if (options.interactive || !textToTranslate || needApiKey) {
        const answers = await inquirer.prompt([
          {
            type: "editor",
            name: "text",
            message: "请输入要翻译的文本 (按 Ctrl+D 或 Ctrl+X 保存并退出):",
            when: !textToTranslate,
            validate: (input) => input.length > 0 || "请输入有效的文本",
          },
          {
            type: "list",
            name: "service",
            message: "请选择翻译服务:",
            choices: SUPPORTED_SERVICES,
            when: !service,
          },
          {
            type: "list",
            name: "from",
            message: "请选择源语言:",
            choices: SUPPORTED_LANGUAGES,
            when: !fromLang || fromLang === "auto",
          },
          {
            type: "list",
            name: "to",
            message: "请选择目标语言:",
            choices: SUPPORTED_LANGUAGES.filter(
              (lang) => lang.value !== "auto"
            ),
            when: !toLang,
          },
          {
            type: "input",
            name: "appKey",
            message: "请输入翻译服务AppKey:",
            when: (answers) => {
              const selectedService: ServiceName = answers.service || service;
              return !apiKeys[selectedService];
            },
            validate: (input) => input.length > 0 || "AppKey不能为空",
          },
          {
            type: "input",
            name: "appSecret",
            message: "请输入翻译服务AppSecret:",
            when: (answers) => {
              const selectedService: ServiceName = answers.service || service;
              return !apiKeys[selectedService];
            },
            validate: (input) => input.length > 0 || "AppSecret不能为空",
          },
        ]);

        textToTranslate = answers.text || textToTranslate;
        service = answers.service || service;
        fromLang = answers.from || fromLang;
        toLang = answers.to || toLang;

        if (answers.appKey && answers.appSecret) {
          TranslationFactory.setApiKey(
            service,
            JSON.stringify({
              appKey: answers.appKey,
              appSecret: answers.appSecret,
            })
          );
        }
      }

      // 智能检测语言
      if (fromLang === "auto") {
        const isEnglish = /^[a-zA-Z\s\.,!\?"']+$/.test(textToTranslate!);
        fromLang = isEnglish ? "en" : "zh-CHS";
        toLang = isEnglish ? "zh-CHS" : "en";
      }

      const spinner = ora("正在翻译...").start();

      try {
        const translationService = TranslationFactory.getService(service);
        const result = await translationService.translate(
          textToTranslate!,
          fromLang,
          toLang
        );

        spinner.succeed("翻译完成");

        // 使用 chalk 美化输出
        const title = chalk.hex("#FF6B6B").bold("✨ 翻译结果 ✨");
        const infoItems = [
          { label: "源语言", value: result.from },
          { label: "目标语言", value: result.to },
          { label: "翻译服务", value: result.service },
        ];

        // 构建信息部分
        const infoSection = infoItems
          .map(
            (item) =>
              `${chalk.hex("#4ECDC4")(item.label + ":")} ${chalk.hex("#45B7D1")(
                item.value
              )}`
          )
          .join("\n");

        // 构建翻译内容部分
        const originalLines = result.originalText.split("\n");
        const translatedLines = result.translatedText.split("\n");
        const contentSection = originalLines
          .map((line, index) => {
            const parts = [
              `${chalk.hex("#4ECDC4")("原文:")} ${chalk.hex("#96CEB4")(line)}`,
            ];
            if (translatedLines[index]) {
              parts.push(
                `${chalk.hex("#4ECDC4")("译文:")} ${chalk
                  .hex("#FFEEAD")
                  .bold(translatedLines[index])}`
              );
            }
            return parts.join("\n");
          })
          .join("\n");

        // 组合所有内容
        const content = [title, "", infoSection, "", contentSection].join("\n");

        // 创建框线
        const boxWidth = 70;
        const boxPadding = 4;

        // 分隔线
        console.log(chalk.hex("#4ECDC4").bold("─".repeat(boxWidth)));

        // 内容
        content.split("\n").forEach((line) => {
          if (line.trim()) {
            console.log(" ".repeat(boxPadding) + line);
          } else {
            console.log("");
          }
        });

        // 底部边框
        console.log(chalk.hex("#4ECDC4").bold("─".repeat(boxWidth)) + "\n");

        // 添加提示信息
        console.log(
          chalk
            .hex("#96CEB4")
            .dim(
              "提示: 使用 translate -i 进入交互模式，或使用 translate <文本> 直接翻译\n"
            )
        );
      } catch (error) {
        spinner.fail("翻译失败");
        throw error;
      }
    } catch (error) {
      console.error(
        chalk.red("错误:"),
        error instanceof Error ? error.message : "发生未知错误"
      );
      process.exit(1);
    }
  });

program
  .command("config")
  .description("配置翻译设置")
  .option("-s, --service <name>", "设置默认翻译服务")
  .option("-k, --key <apiKey>", "设置服务的API密钥")
  .option("-f, --from <lang>", "设置默认源语言")
  .option("-t, --to <lang>", "设置默认目标语言")
  .option("-r, --reset", "重置所有配置")
  .action(async (options) => {
    try {
      if (options.reset) {
        TranslationFactory.reset();
        console.log(chalk.green("配置已成功重置"));
        return;
      }

      if (!options.service && !options.key && !options.from && !options.to) {
        const answers = await inquirer.prompt([
          {
            type: "list",
            name: "service",
            message: "请选择默认翻译服务:",
            choices: ["youdao"],
          },
          {
            type: "input",
            name: "appKey",
            message: "请输入有道翻译AppKey:",
            validate: (input) => input.length > 0 || "AppKey不能为空",
          },
          {
            type: "input",
            name: "appSecret",
            message: "请输入有道翻译AppSecret:",
            validate: (input) => input.length > 0 || "AppSecret不能为空",
          },
          {
            type: "input",
            name: "from",
            message: "请输入默认源语言:",
            default: "auto",
          },
          {
            type: "input",
            name: "to",
            message: "请输入默认目标语言:",
            default: "en",
          },
        ]);

        TranslationFactory.setApiKey(
          answers.service,
          JSON.stringify({
            appKey: answers.appKey,
            appSecret: answers.appSecret,
          })
        );
        TranslationFactory.setDefaultService(answers.service);
        TranslationFactory.setDefaultLanguages(answers.from, answers.to);
      } else {
        if (options.service && options.key) {
          try {
            const apiKey = JSON.parse(options.key);
            if (!apiKey.appKey || !apiKey.appSecret) {
              throw new Error("API密钥格式无效");
            }
            TranslationFactory.setApiKey(options.service, options.key);
            TranslationFactory.setDefaultService(options.service);
          } catch (error) {
            throw new Error(
              "API密钥必须是有效的JSON格式，包含appKey和appSecret字段"
            );
          }
        }
        if (options.from && options.to) {
          TranslationFactory.setDefaultLanguages(options.from, options.to);
        }
      }

      console.log(chalk.green("配置已成功更新"));
    } catch (error) {
      console.error(
        chalk.red("错误:"),
        error instanceof Error ? error.message : "发生未知错误"
      );
      process.exit(1);
    }
  });

program.parse();
