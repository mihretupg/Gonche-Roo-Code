import { describe, expect, it, vi } from "vitest"

import type { Task } from "../../core/task/Task"

const { markOrchestrationTurnStartMock, runOrchestrationPreToolHookMock, runOrchestrationPostToolHookMock } =
	vi.hoisted(() => ({
		markOrchestrationTurnStartMock: vi.fn(),
		runOrchestrationPreToolHookMock: vi.fn(),
		runOrchestrationPostToolHookMock: vi.fn(),
	}))

vi.mock("../../core/orchestration/ToolHookEngine", () => ({
	markOrchestrationTurnStart: markOrchestrationTurnStartMock,
	runOrchestrationPreToolHook: runOrchestrationPreToolHookMock,
	runOrchestrationPostToolHook: runOrchestrationPostToolHookMock,
}))

import { runToolMiddlewarePostHook, runToolMiddlewarePreHook, startToolMiddlewareTurn } from "../toolMiddlewareHooks"

describe("toolMiddlewareHooks", () => {
	it("forwards start turn to orchestration runtime", () => {
		const task = { cwd: "/tmp/project" } as Task
		startToolMiddlewareTurn(task)
		expect(markOrchestrationTurnStartMock).toHaveBeenCalledWith(task)
	})

	it("forwards pre-hook input and returns orchestration result", async () => {
		const preResult = { blocked: false, preApproved: true, context: { toolName: "write_to_file" } }
		runOrchestrationPreToolHookMock.mockResolvedValueOnce(preResult)

		const task = { cwd: "/tmp/project" } as Task
		const askApproval = vi.fn(async () => true)
		const input = {
			task,
			toolName: "write_to_file",
			toolArgs: { path: "src/a.ts" },
			askApproval,
		}

		const result = await runToolMiddlewarePreHook(input)
		expect(runOrchestrationPreToolHookMock).toHaveBeenCalledWith(input)
		expect(result).toEqual(preResult)
	})

	it("forwards post-hook input", async () => {
		const task = { cwd: "/tmp/project" } as Task
		const input = {
			task,
			context: {
				toolName: "write_to_file",
				relatedRequirementIds: ["REQ-TRACE-001"],
				targets: [],
			},
			toolResult: "ok",
		}

		await runToolMiddlewarePostHook(input)
		expect(runOrchestrationPostToolHookMock).toHaveBeenCalledWith(input)
	})
})
