import { fileURLToPath } from "url";
import { dirname } from "path";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const getTagObject = () => {
  const tags = {};
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
};
