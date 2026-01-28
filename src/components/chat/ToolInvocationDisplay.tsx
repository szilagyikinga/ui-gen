"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface StrReplaceEditorArgs {
  command: "create" | "str_replace" | "insert" | "view" | "undo_edit";
  path: string;
}

interface FileManagerRenameArgs {
  command: "rename";
  path: string;
  new_path: string;
}

interface FileManagerDeleteArgs {
  command: "delete";
  path: string;
}

type FileManagerArgs = FileManagerRenameArgs | FileManagerDeleteArgs;

export function isStrReplaceEditorArgs(args: unknown): args is StrReplaceEditorArgs {
  if (typeof args !== "object" || args === null) return false;
  const obj = args as Record<string, unknown>;
  const validCommands = ["create", "str_replace", "insert", "view", "undo_edit"];
  return (
    typeof obj.command === "string" &&
    validCommands.includes(obj.command) &&
    typeof obj.path === "string"
  );
}

export function isFileManagerArgs(args: unknown): args is FileManagerArgs {
  if (typeof args !== "object" || args === null) return false;
  const obj = args as Record<string, unknown>;

  if (obj.command === "rename") {
    return typeof obj.path === "string" && typeof obj.new_path === "string";
  }

  if (obj.command === "delete") {
    return typeof obj.path === "string";
  }

  return false;
}

export function formatToolMessage(toolName: string, args: unknown): string {
  if (toolName === "str_replace_editor" && isStrReplaceEditorArgs(args)) {
    switch (args.command) {
      case "create":
        return `Creating ${args.path}`;
      case "str_replace":
      case "insert":
        return `Editing ${args.path}`;
      case "view":
        return `Viewing ${args.path}`;
      case "undo_edit":
        return `Undoing changes to ${args.path}`;
    }
  }

  if (toolName === "file_manager" && isFileManagerArgs(args)) {
    if (args.command === "rename") {
      return `Renaming ${args.path} → ${args.new_path}`;
    }
    if (args.command === "delete") {
      return `Deleting ${args.path}`;
    }
  }

  return toolName;
}

interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationDisplay({ toolInvocation }: ToolInvocationDisplayProps) {
  const message = formatToolMessage(toolInvocation.toolName, toolInvocation.args);
  const isCompleted = toolInvocation.state === "result" && "result" in toolInvocation;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{message}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{message}</span>
        </>
      )}
    </div>
  );
}
