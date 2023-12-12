#!/usr/bin/env node

import { execSync, spawn } from "child_process";
import { Command } from "commander";
import inquirer from "inquirer";
import fs from "fs";
import { resolve, join } from "path";
import ora from "ora";
import { __filename, __dirname } from "./utils.js";

import chalk from "chalk";

const program = new Command();

async function promptForName() {
  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "请输入项目名称：",
    },
  ]);
  return name;
}

async function downloadTemplate(projectName) {
  // const repoUrl = `https://github.com:${owner}/${repo}#${branch}`;
  const repoUrl = "https://gitee.com/calmound/pluto-template.git";
  const spinner = ora(`正在下载模板文件...`).start();

  try {
    var g = await spawn("git", ["clone", "-b", "master", repoUrl, projectName]);
    g.stdout.on("data", function (s) {
      console.log("g stdout: " + s);
    });
    g.stderr.on("data", async function (data) {
      spinner.succeed("模板项目下载成功！");

      const { convert } = await inquirer.prompt([
        {
          type: "confirm",
          name: "convert",
          message: "是否需要根据swagger.json生成services和model？",
          default: false,
        },
      ]);

      if (convert) {
        const { swaggerUrl } = await inquirer.prompt([
          {
            type: "input",
            name: "swaggerUrl",
            message:
              "请输入swagger.json的URL地址，将会替换src/tsg.config.ts的source字段：",
            validate: (input) => (input ? true : "URL不能为空"),
          },
        ]);
        // 更新 tsg.config.js 文件
        const configPath = join(projectName, "src", "tsg.config.ts");
        const configContent = fs.readFileSync(configPath, "utf-8");
        const updatedContent = configContent.replace(
          /(source\s*:\s*)'[^']+'/,
          `$1'${swaggerUrl}'`
        );
        fs.writeFileSync(configPath, updatedContent);

        // 执行模型转换
        console.log("执行11 Swagger 转换...");

        const projectDir = resolve(projectName);

        console.log(chalk.blue("依赖安装,正在执行命令：pnpm install..."));
        execSync("pnpm install", {
          stdio: "inherit",
          cwd: projectDir,
        });
        console.log(chalk.green("命令执行完成：pnpm install！"));

        console.log(
          chalk.blue("model文件生成，正在执行命令：pnpx @inspir/pluto -m...")
        );
        execSync("pnpx @inspir/pluto -m", {
          stdio: "inherit",
          cwd: projectDir,
        });
        console.log(chalk.green("命令执行完成，pnpx @inspir/pluto -m！"));

        console.log(chalk.blue("services文件生成，正在执行命令：pnpm tsg..."));
        execSync("pnpm tsg", { stdio: "inherit", cwd: projectDir });
        console.log(chalk.green("命令执行完成：pnpm tsg！"));
      } else {
        console.log(chalk.green("----------------------------"));
        console.log(chalk.green("项目下载完成，请继续执行以下命令："));
        console.log(chalk.green("进入项目：cd projectName"));
        console.log(
          chalk.green(
            "咨询后端swagger.json地址替换 src/tsg.config.ts的source url"
          )
        );
        console.log(chalk.green("安装依赖：pnpm install"));
      }
    });
  } catch (error) {}
}

program.option("-m, --model", "执行 Swagger 转换").action(async (options) => {
  if (options.model) {
    console.log(chalk.yellow("执行 Swagger 转换..."));
    execSync(`node ${resolve(__dirname, "model.js")}`, { stdio: "inherit" });
  } else {
    let projectName = process.argv[3];
    if (!projectName) {
      projectName = await promptForName();
    }
    await downloadTemplate(projectName);
  }
});

// program
//   .option("-d, --directory <type>", "创建page代码")
//   .action((options) => {
//     console.log(chalk.yellow("开始创建page代码..."));

//     if (options.directory) {
//       execSync(`node ${resolve(__dirname, "dir.js")}`, { stdio: "inherit" });
//     }
//   })
//   .parse(process.argv);

program.parse(process.argv);
