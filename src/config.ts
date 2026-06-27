import * as vscode from "vscode";
import { InsertFormat, formatFileRef } from "./core/patterns";

// Re-export para manter a superfície de import dos providers/comandos.
export { formatFileRef };
export type { InsertFormat };

/** Leitura tipada das settings `promptMark.*`. */
export interface PromptMarkConfig {
  fileGlob: string;
  excludeGlob: string;
  maxResults: number;
  insertFormat: InsertFormat;
  enableSkills: boolean;
  enableHover: boolean;
  hoverPreviewLines: number;
}

export function getConfig(): PromptMarkConfig {
  const c = vscode.workspace.getConfiguration("promptMark");
  return {
    fileGlob: c.get<string>("fileGlob", "**/*"),
    excludeGlob: c.get<string>(
      "excludeGlob",
      "**/{node_modules,.git,dist,.nuxt,.output}/**"
    ),
    maxResults: c.get<number>("maxResults", 500),
    insertFormat: c.get<InsertFormat>("insertFormat", "at"),
    enableSkills: c.get<boolean>("enableSkills", true),
    enableHover: c.get<boolean>("enableHover", true),
    hoverPreviewLines: c.get<number>("hoverPreviewLines", 20),
  };
}
