#!/usr/bin/env node

// 测试地址  http://11.1.1.144:31590/swagger/doc.json
import { info } from "./log.js";
import fetch from "node-fetch";
import pkg from "json5";
import path from "path";
import inquirer from "inquirer";
import fs from "fs";
import { __dirname } from "./utils.js";

import chalk from "chalk";

const { parse } = pkg;

// 假设 models 目录位于你的项目根目录下
const modelsDir = path.resolve("models");

// 确保 models 目录存在
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir);
}

function generateFunctionName(method, path) {
  // 将方法名和路径转换为camelCase
  const camelCasedMethod =
    method.charAt(0).toLowerCase() + method.slice(1).toLowerCase();

  const camelCasedPath = path
    .split("/")
    .filter((segment) => segment) // 移除空字符串
    .map((segment) =>
      // 将中划线转换为驼峰命名
      segment
        .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
        // 将首字母转换为大写
        .replace(/^([a-z])/, (match, letter) => letter.toUpperCase())
    )
    .join("");

  return camelCasedMethod + camelCasedPath;
}

function generateParameterType(method, path, parameters) {
  // 将方法名的首字母转换为大写
  const capitalizedMethod =
    method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();

  // 将路径分割为单词，并将每个单词的首字母转换为大写
  const capitalizedPath = path
    .split("/")
    .filter((segment) => segment) // 移除空字符串
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")
    )
    .join("");

  // 将方法名和路径拼接在一起，并在末尾添加“Option”
  if (!parameters?.length) {
    return null;
  }
  const type = parameters[0]?.in;
  if (type === "query" || type === "formData") {
    return `${capitalizedMethod}${capitalizedPath}Option['${type}']`;
  } else if (type === "body") {
    return `${capitalizedMethod}${capitalizedPath}Option['${type}']['request']`;
  }
}

function translate(swagger) {
  // 创建一个对象来按标签组织接口
  const tags = {};

  // 遍历Swagger路径，将接口按标签分类
  for (let path in swagger.paths) {
    for (let method in swagger.paths[path]) {
      const endpoint = swagger.paths[path][method];
      const tag = endpoint.tags[0]; // 假设每个接口只有一个标签
      if (!tags[tag]) {
        tags[tag] = [];
      }
      tags[tag].push({ path, method, endpoint });
    }
  }

  // 创建一个对象来存储每个标签的Umi model代码
  const models = {};

  // 遍历每个标签，为每个标签生成Umi model代码
  for (let tag in tags) {
    let modelCode = `
  import { useState } from 'react';
  import { DEFAULT_PAGE_SPLIT_DATA, RESULT_CODE } from '@/constant';
  import {customMessage} from '@/utils'
  import * as API from '../services/request'
  
  export default () => {
    const [loading, setLoading] = useState(false);
    const [pageSplitData, setPageSplitData] = useState(DEFAULT_PAGE_SPLIT_DATA);
    `;

    // 遍历该标签下的所有接口，为每个接口生成处理函数
    const funcNames = [];
    tags[tag].forEach(({ path, method, endpoint }) => {
      const functionName = generateFunctionName(method, path); // 使用generateFunctionName生成函数名
      const paramType = generateParameterType(
        method,
        path,
        endpoint.parameters
      );

      funcNames.push(functionName);

      const parameterIn = endpoint.parameters?.[0].in;

      modelCode += `
    // ${endpoint.tags}-${endpoint.summary}
    const ${functionName} = async (${
      paramType ? `params: API.${paramType}` : ""
    }) => {
      setLoading(true);
      const res = await API.${functionName}(${
        paramType
          ? parameterIn === "query"
            ? "{query: params}"
            : parameterIn === "formData"
            ? "{formData: params}"
            : "{body: {request: params}}"
          : ""
      });

      setLoading(false);
      if (res.code === RESULT_CODE.SUCCESS) {
        // Handle success
      }
      return customMessage({
        flag: res.code === RESULT_CODE.SUCCESS,
        msg: ''
      })
    };
    `;
    });
    const [...args] = funcNames;
    modelCode += `
    return {
      loading,
      setPageSplitData,
      ${args}
      // ...other exported properties and functions
    };
  };
      `;

    // 将生成的Umi model代码存储在models对象中，使用标签作为键
    models[tag] = modelCode;
  }
  const currentWorkingDirectory = process.cwd();

  for (let tag in models) {
    const filename = path.join(
      currentWorkingDirectory,
      "src/models",
      `${tag}.ts`
    );

    const code = models[tag];
    fs.writeFileSync(filename, code);
  }
  return models;
}

async function getSourceUrl() {
  const currentWorkingDirectory = process.cwd();

  const configPath = path.resolve(currentWorkingDirectory, "src/tsg.config.ts");
  const configContent = fs.readFileSync(configPath, "utf8");

  const regex = /source:\s*'([^']+)'/;
  const match = configContent.match(regex);

  if (match && match[1]) {
    return match[1];
  } else {
    throw new Error("Unable to extract source URL from ts.config.ts");
  }
}

async function fetchFunc() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  let url;

  // 检查是否提供了 URL 参数
  if (args.includes("-m") && args[args.indexOf("-m") + 1]) {
    url = args[args.indexOf("-m") + 1];
  } else {
    url = await getSourceUrl();
  }

  // 现在你可以使用 url 变量作为 URL
  const verbose = ` url: ${url}`;
  console.log(chalk.blue(`开始请求${verbose}`));

  info(`start fetching ${verbose}`);
  const res = await fetch(url);
  const swaggerSchema = parse(await res.text());
  translate(swaggerSchema);
  console.log(chalk.blue(`请求转换完成：${verbose}`));
}

fetchFunc();

// export default fetchFunc;
