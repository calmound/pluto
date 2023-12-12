import { info } from "./log.js";
import fetch from "node-fetch";
import pkg from "json5";
import path from "path";
import inquirer from "inquirer";
import fs from "fs";
import { __dirname } from "./utils.js";

import chalk from "chalk";

const url = "http://11.1.1.144:31590/swagger/doc.json";
async function fetchSwaggerJson() {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

function createDirectory(tag) {
  const directoryPath = path.join(process.cwd(), tag);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
    console.log(`Directory created: ${directoryPath}`);
  } else {
    console.log(`Directory already exists: ${directoryPath}`);
  }
}

async function main() {
  const swaggerJson = await fetchSwaggerJson(url);
  const tags = swaggerJson.tags.map((tag) => tag.name);
  tags.forEach((tag) => {
    createDirectory(tag);
  });
}

main();
