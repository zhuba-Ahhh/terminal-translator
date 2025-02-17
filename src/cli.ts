#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { TranslationFactory } from ".";
import { CommandOptions, ServiceName } from "./types";

program
  .name("translate")
  .description(
    "A command-line translation tool supporting multiple translation services"
  )
  .version("1.0.0")
  .argument("[text...]", "Text to translate")
  .option("-f, --from <lang>", "Source language (default: auto)")
  .option("-t, --to <lang>", "Target language (default: en)")
  .option("-s, --service <name>", "Translation service to use (youdao)")
  .option("-i, --interactive", "Interactive mode")
  .action(async (textArray: string[] | undefined, options: CommandOptions) => {
    try {
      const config = TranslationFactory.getConfig();
      let textToTranslate = textArray ? textArray.join(" ") : undefined;
      let fromLang = options.from || config.defaultSourceLang;
      let toLang = options.to || config.defaultTargetLang;
      let service = options.service || config.defaultService;

      const apiKeys = config.apiKeys || {};
      const needApiKey = !apiKeys[service];

      if (options.interactive || !textToTranslate || needApiKey) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "text",
            message: "请输入要翻译的文本:",
            when: !textToTranslate,
            validate: (input) => input.length > 0 || "请输入有效的文本",
          },

          {
            type: "input",
            name: "appKey",
            message: "请输入有道翻译AppKey:",
            when: (answers) => {
              const selectedService: ServiceName = answers.service || service;
              return selectedService === "youdao" && !apiKeys[selectedService];
            },
            validate: (input) => input.length > 0 || "AppKey不能为空",
          },
          {
            type: "input",
            name: "appSecret",
            message: "请输入有道翻译AppSecret:",
            when: (answers) => {
              const selectedService: ServiceName = answers.service || service;
              return selectedService === "youdao" && !apiKeys[selectedService];
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
            "youdao",
            JSON.stringify({
              appKey: answers.appKey,
              appSecret: answers.appSecret,
            })
          );
        }
      }

      // 智能检测语言
      if (fromLang === "auto") {
        // 修改正则表达式以更准确地检测英文文本
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
        console.log("\n" + "=".repeat(50));
        console.log("\n" + chalk.cyan.bold("[ 翻译信息 ]"));
        console.log(chalk.dim("─".repeat(50)));
        console.log(chalk.cyan.bold("源语言:"), chalk.yellow(result.from));
        console.log(chalk.cyan.bold("目标语言:"), chalk.yellow(result.to));
        console.log(chalk.cyan.bold("翻译服务:"), chalk.yellow(result.service));
        console.log(chalk.dim("─".repeat(50)));
        console.log("\n" + chalk.cyan.bold("[ 翻译内容 ]"));
        console.log(chalk.dim("─".repeat(50)));
        console.log(
          chalk.magenta.bold("原文:"),
          chalk.gray(result.originalText)
        );
        console.log(
          chalk.magenta.bold("译文:"),
          chalk.green.bold(result.translatedText)
        );
        console.log(chalk.dim("─".repeat(50)) + "\n");
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
