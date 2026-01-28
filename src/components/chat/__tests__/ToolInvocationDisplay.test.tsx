import { test, expect, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ToolInvocation } from "ai";
import {
  ToolInvocationDisplay,
  formatToolMessage,
  isStrReplaceEditorArgs,
  isFileManagerArgs,
} from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

describe("formatToolMessage", () => {
  describe("str_replace_editor tool", () => {
    test("formats create command", () => {
      const result = formatToolMessage("str_replace_editor", {
        command: "create",
        path: "/App.jsx",
      });
      expect(result).toBe("Creating /App.jsx");
    });

    test("formats str_replace command", () => {
      const result = formatToolMessage("str_replace_editor", {
        command: "str_replace",
        path: "/Card.jsx",
      });
      expect(result).toBe("Editing /Card.jsx");
    });

    test("formats insert command", () => {
      const result = formatToolMessage("str_replace_editor", {
        command: "insert",
        path: "/utils.js",
      });
      expect(result).toBe("Editing /utils.js");
    });

    test("formats view command", () => {
      const result = formatToolMessage("str_replace_editor", {
        command: "view",
        path: "/index.jsx",
      });
      expect(result).toBe("Viewing /index.jsx");
    });

    test("formats undo_edit command", () => {
      const result = formatToolMessage("str_replace_editor", {
        command: "undo_edit",
        path: "/Button.jsx",
      });
      expect(result).toBe("Undoing changes to /Button.jsx");
    });
  });

  describe("file_manager tool", () => {
    test("formats rename command", () => {
      const result = formatToolMessage("file_manager", {
        command: "rename",
        path: "/old.jsx",
        new_path: "/new.jsx",
      });
      expect(result).toBe("Renaming /old.jsx → /new.jsx");
    });

    test("formats delete command", () => {
      const result = formatToolMessage("file_manager", {
        command: "delete",
        path: "/unused.jsx",
      });
      expect(result).toBe("Deleting /unused.jsx");
    });
  });

  describe("fallback behavior", () => {
    test("returns tool name for unknown tool", () => {
      const result = formatToolMessage("unknown_tool", { some: "args" });
      expect(result).toBe("unknown_tool");
    });

    test("returns tool name when args is null", () => {
      const result = formatToolMessage("str_replace_editor", null);
      expect(result).toBe("str_replace_editor");
    });

    test("returns tool name when args is empty object", () => {
      const result = formatToolMessage("str_replace_editor", {});
      expect(result).toBe("str_replace_editor");
    });

    test("returns tool name when command is missing", () => {
      const result = formatToolMessage("str_replace_editor", { path: "/App.jsx" });
      expect(result).toBe("str_replace_editor");
    });

    test("returns tool name when path is missing", () => {
      const result = formatToolMessage("str_replace_editor", { command: "create" });
      expect(result).toBe("str_replace_editor");
    });

    test("returns tool name for invalid command", () => {
      const result = formatToolMessage("str_replace_editor", {
        command: "invalid",
        path: "/App.jsx",
      });
      expect(result).toBe("str_replace_editor");
    });
  });
});

describe("isStrReplaceEditorArgs", () => {
  test("returns true for valid create args", () => {
    expect(isStrReplaceEditorArgs({ command: "create", path: "/App.jsx" })).toBe(true);
  });

  test("returns true for valid str_replace args", () => {
    expect(isStrReplaceEditorArgs({ command: "str_replace", path: "/App.jsx" })).toBe(true);
  });

  test("returns true for valid insert args", () => {
    expect(isStrReplaceEditorArgs({ command: "insert", path: "/App.jsx" })).toBe(true);
  });

  test("returns true for valid view args", () => {
    expect(isStrReplaceEditorArgs({ command: "view", path: "/App.jsx" })).toBe(true);
  });

  test("returns true for valid undo_edit args", () => {
    expect(isStrReplaceEditorArgs({ command: "undo_edit", path: "/App.jsx" })).toBe(true);
  });

  test("returns false for null", () => {
    expect(isStrReplaceEditorArgs(null)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isStrReplaceEditorArgs(undefined)).toBe(false);
  });

  test("returns false for non-object", () => {
    expect(isStrReplaceEditorArgs("string")).toBe(false);
  });

  test("returns false for missing command", () => {
    expect(isStrReplaceEditorArgs({ path: "/App.jsx" })).toBe(false);
  });

  test("returns false for missing path", () => {
    expect(isStrReplaceEditorArgs({ command: "create" })).toBe(false);
  });

  test("returns false for invalid command", () => {
    expect(isStrReplaceEditorArgs({ command: "invalid", path: "/App.jsx" })).toBe(false);
  });

  test("returns false for non-string path", () => {
    expect(isStrReplaceEditorArgs({ command: "create", path: 123 })).toBe(false);
  });
});

describe("isFileManagerArgs", () => {
  test("returns true for valid rename args", () => {
    expect(isFileManagerArgs({ command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe(
      true
    );
  });

  test("returns true for valid delete args", () => {
    expect(isFileManagerArgs({ command: "delete", path: "/App.jsx" })).toBe(true);
  });

  test("returns false for null", () => {
    expect(isFileManagerArgs(null)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isFileManagerArgs(undefined)).toBe(false);
  });

  test("returns false for rename without new_path", () => {
    expect(isFileManagerArgs({ command: "rename", path: "/old.jsx" })).toBe(false);
  });

  test("returns false for invalid command", () => {
    expect(isFileManagerArgs({ command: "invalid", path: "/App.jsx" })).toBe(false);
  });

  test("returns false for non-string path", () => {
    expect(isFileManagerArgs({ command: "delete", path: 123 })).toBe(false);
  });
});

describe("ToolInvocationDisplay component", () => {
  test("renders completed state with green dot", () => {
    const toolInvocation: ToolInvocation = {
      toolCallId: "test-id",
      toolName: "str_replace_editor",
      args: { command: "create", path: "/App.jsx" },
      state: "result",
      result: "Success",
    };

    const { container } = render(<ToolInvocationDisplay toolInvocation={toolInvocation} />);

    expect(screen.getByText("Creating /App.jsx")).toBeDefined();
    expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  });

  test("renders pending state with spinner", () => {
    const toolInvocation: ToolInvocation = {
      toolCallId: "test-id",
      toolName: "str_replace_editor",
      args: { command: "create", path: "/App.jsx" },
      state: "call",
    };

    const { container } = render(<ToolInvocationDisplay toolInvocation={toolInvocation} />);

    expect(screen.getByText("Creating /App.jsx")).toBeDefined();
    expect(container.querySelector(".animate-spin")).toBeDefined();
  });

  test("renders formatted message for file_manager rename", () => {
    const toolInvocation: ToolInvocation = {
      toolCallId: "test-id",
      toolName: "file_manager",
      args: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
      state: "result",
      result: "Success",
    };

    render(<ToolInvocationDisplay toolInvocation={toolInvocation} />);

    expect(screen.getByText("Renaming /old.jsx → /new.jsx")).toBeDefined();
  });

  test("falls back to tool name when args are invalid", () => {
    const toolInvocation: ToolInvocation = {
      toolCallId: "test-id",
      toolName: "str_replace_editor",
      args: {},
      state: "result",
      result: "Success",
    };

    render(<ToolInvocationDisplay toolInvocation={toolInvocation} />);

    expect(screen.getByText("str_replace_editor")).toBeDefined();
  });

  test("falls back to tool name for unknown tool", () => {
    const toolInvocation: ToolInvocation = {
      toolCallId: "test-id",
      toolName: "unknown_tool",
      args: { some: "args" },
      state: "result",
      result: "Success",
    };

    render(<ToolInvocationDisplay toolInvocation={toolInvocation} />);

    expect(screen.getByText("unknown_tool")).toBeDefined();
  });
});
