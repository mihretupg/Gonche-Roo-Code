import crypto from "crypto"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { describe, expect, it, vi } from "vitest"

import type { Task } from "../../task/Task"
import { runOrchestrationPostToolHook } from "../ToolHookEngine"

vi.mock("../../../services/tree-sitter", () => ({
	parseSourceCodeDefinitionsForFile: vi.fn(async () => "# demo.ts\n1--3 | function greet() {"),
}))

describe("ToolHookEngine trace ledger", () => {
	it("appends a trace entry with required metadata after successful write", async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "roo-trace-"))

		try {
			const targetRelPath = "src/demo.ts"
			const targetAbsPath = path.join(tempRoot, targetRelPath)
			await fs.mkdir(path.dirname(targetAbsPath), { recursive: true })

			const beforeContent = `function greet() {\n\treturn "hi"\n}\n`
			await fs.writeFile(targetAbsPath, beforeContent, "utf-8")

			const beforeHash = crypto.createHash("sha256").update(beforeContent).digest("hex")
			const task = { cwd: tempRoot } as Task

			const afterContent = `function greet() {\n\treturn "hello"\n}\n`
			await fs.writeFile(targetAbsPath, afterContent, "utf-8")

			await runOrchestrationPostToolHook({
				task,
				context: {
					toolName: "write_to_file",
					intentId: "INT-001",
					mutationClass: "AST_REFACTOR",
					relatedRequirementIds: ["REQ-TRACE-001"],
					targets: [
						{
							absolutePath: targetAbsPath,
							relativePath: targetRelPath,
							existed: true,
							beforeHash,
							beforeContent,
						},
					],
				},
			})

			const tracePath = path.join(tempRoot, ".orchestration", "agent_trace.jsonl")
			const raw = await fs.readFile(tracePath, "utf-8")
			const lines = raw
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter(Boolean)
			expect(lines.length).toBe(1)

			const entry = JSON.parse(lines[0]) as Record<string, any>
			expect(entry.intent_id).toBe("INT-001")
			expect(entry.mutation_class).toBe("AST_REFACTOR")
			expect(entry.tool_name).toBe("write_to_file")
			expect(entry.tool_origin).toBe("native")
			expect(entry.agent_action).toBe("WRITE_FILE")
			expect(Array.isArray(entry.related_requirements)).toBe(true)
			expect(Array.isArray(entry.modified_ranges)).toBe(true)
			expect(entry.modified_ranges.length).toBe(1)
			expect(entry.modified_ranges[0].content_hash).toBeTypeOf("string")
			expect(entry.modified_ranges[0].ast_status).toBe("ok")
			expect(Array.isArray(entry.modified_ranges[0].ast_nodes)).toBe(true)
			expect(entry.modified_ranges[0].ast_nodes.length).toBeGreaterThan(0)
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true })
		}
	})
})
