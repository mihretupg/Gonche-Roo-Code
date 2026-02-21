import { describe, expect, it, vi } from "vitest"

const { runIntentSelectionHookMock } = vi.hoisted(() => ({
	runIntentSelectionHookMock: vi.fn(),
}))

vi.mock("../../../hooks/intentSelectionHook", () => ({
	runIntentSelectionHook: runIntentSelectionHookMock,
}))

import { selectActiveIntentTool } from "../SelectActiveIntentTool"

describe("SelectActiveIntentTool", () => {
	const createTaskMock = () =>
		({
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			sayAndCreateMissingParamError: vi.fn(async () => '{"status":"error","type":"missing_param"}'),
			ask: vi.fn(async () => ({ response: "yesButtonClicked" })),
		}) as any

	const createCallbacks = () =>
		({
			askApproval: vi.fn(async () => true),
			handleError: vi.fn(async () => {}),
			pushToolResult: vi.fn(),
		}) as const

	it("returns missing-param tool result when intent_id is empty", async () => {
		const task = createTaskMock()
		const callbacks = createCallbacks()

		await selectActiveIntentTool.execute({ intent_id: "" }, task, callbacks)

		expect(task.recordToolError).toHaveBeenCalledWith("select_active_intent")
		expect(task.sayAndCreateMissingParamError).toHaveBeenCalledWith("select_active_intent", "intent_id")
		expect(callbacks.pushToolResult).toHaveBeenCalledWith('{"status":"error","type":"missing_param"}')
		expect(task.consecutiveMistakeCount).toBe(1)
	})

	it("returns hook error when intent selection fails", async () => {
		const task = createTaskMock()
		const callbacks = createCallbacks()
		runIntentSelectionHookMock.mockResolvedValueOnce({
			ok: false as const,
			errorResult: '{"status":"error","type":"invalid_intent"}',
		})

		await selectActiveIntentTool.execute({ intent_id: "INT-404" }, task, callbacks)

		expect(task.recordToolError).toHaveBeenCalledWith("select_active_intent")
		expect(callbacks.pushToolResult).toHaveBeenCalledWith('{"status":"error","type":"invalid_intent"}')
		expect(task.consecutiveMistakeCount).toBe(1)
	})

	it("returns context when intent selection succeeds", async () => {
		const task = createTaskMock()
		const callbacks = createCallbacks()
		runIntentSelectionHookMock.mockResolvedValueOnce({
			ok: true as const,
			context: "<intent_context></intent_context>",
		})
		task.consecutiveMistakeCount = 3

		await selectActiveIntentTool.execute({ intent_id: "INT-001" }, task, callbacks)

		expect(callbacks.pushToolResult).toHaveBeenCalledWith("<intent_context></intent_context>")
		expect(task.consecutiveMistakeCount).toBe(0)
	})

	it("emits partial status through task.ask", async () => {
		const task = createTaskMock()
		await selectActiveIntentTool.handlePartial(task, {
			type: "tool_use",
			name: "select_active_intent",
			params: { intent_id: "INT-002" },
			partial: true,
		} as any)

		expect(task.ask).toHaveBeenCalledWith(
			"tool",
			JSON.stringify({ tool: "selectActiveIntent", intent_id: "INT-002" }),
			true,
		)
	})
})
