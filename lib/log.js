/* eslint-disable no-console */
import chalk from "chalk";

const { cyanBright, red, yellow } = chalk.bold;

/** log blue message in console */
export function info(...messages) {
  console.log(cyanBright(messages.join("")));
}

/** log red message in console */
export function error(...messages) {
  console.log(red(messages.join("")));
}

/** log yellow message in console */
export function warn(...messages) {
  console.log(yellow(messages.join("")));
}
