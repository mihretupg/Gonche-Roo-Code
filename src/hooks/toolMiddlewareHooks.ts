import type { AskApproval, ToolResponse } from "../shared/tools"
import type { Task } from "../core/task/Task"
import {
	markOrchestrationTurnStart,
	runOrchestrationPostToolHook,
	runOrchestrationPreToolHook,
	type OrchestrationPreHookContext,
	type OrchestrationPreHookResult,
} from "../core/orchestration/ToolHookEngine"

export function startToolMiddlewareTurn(task: Task): void {
	markOrchestrationTurnStart(task)
}

export async function runToolMiddlewarePreHook(input: {
	task: Task
	toolName: string
	toolArgs?: Record<string, unknown>
	askApproval: AskApproval
}): Promise<OrchestrationPreHookResult> {
	return runOrchestrationPreToolHook(input)
}

export async function runToolMiddlewarePostHook(input: {
	task: Task
	context: OrchestrationPreHookContext
	toolResult?: ToolResponse
}): Promise<void> {
	await runOrchestrationPostToolHook(input)
}
