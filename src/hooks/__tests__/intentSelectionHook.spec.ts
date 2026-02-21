import { describe, expect, it, vi } from "vitest"

import type { Task } from "../../core/task/Task"

const { selectActiveIntentForTaskMock } = vi.hoisted(() => ({
	selectActiveIntentForTaskMock: vi.fn(),
}))

vi.mock("../../core/orchestration/ToolHookEngine", () => ({
	selectActiveIntentForTask: selectActiveIntentForTaskMock,
}))

import { runIntentSelectionHook } from "../intentSelectionHook"

describe("intentSelectionHook", () => {
	it("delegates to selectActiveIntentForTask", async () => {
		const expected = { ok: true as const, context: "<intent_context />" }
		selectActiveIntentForTaskMock.mockResolvedValueOnce(expected)

		const task = { cwd: "/tmp/project" } as Task
		const result = await runIntentSelectionHook(task, "INT-001")

		expect(selectActiveIntentForTaskMock).toHaveBeenCalledWith(task, "INT-001")
		expect(result).toEqual(expected)
	})
})
