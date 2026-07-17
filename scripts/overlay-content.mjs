import {
  appendFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";

const mappings = [
  ["content/devotionals", "src/devotionals"],
  ["content/teachings", "src/teachings"],
  ["content/books", "src/books"],
  ["content/resources", "src/resources"],
  ["content