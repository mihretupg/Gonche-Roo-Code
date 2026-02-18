import type { Task } from "../core/task/Task"
import { selectActiveIntentForTask } from "../core/orchestration/ToolHookEngine"

export async function runIntentSelectionHook(
	task: Task,
	intentId: string,
): Promise<{ ok: true; context: string } | { ok: false; errorResult: string }> {
	return selectActiveIntentForTask(task, intentId)
}
