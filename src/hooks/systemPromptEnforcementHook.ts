import type { ActiveIntentSpec } from "./activeIntentsSpec"
import { loadActiveIntentsSpec } from "./activeIntentsSpec"

const INTENT_SELECTION_REQUIREMENT = [
	"Reasoning Loop Requirement:",
	"- If your plan may mutate workspace state, call `select_active_intent(intent_id)` as the first tool action.",
	"- Do not execute write/destructive tools before selecting a valid active intent.",
].join("\n")

function buildActiveIntentCatalog(intents: ActiveIntentSpec[]): string {
	const rows = intents.map((intent) => {
		const scope = intent.owned_scope.length > 0 ? intent.owned_scope.join(", ") : "(no owned_scope defined)"
		return `- ${intent.id}: ${scope}`
	})

	return ["<active_intents_spec>", ...rows, "</active_intents_spec>"].join("\n")
}

export async function enforceSystemPromptIntentHooks(prompt: string, cwd: string): Promise<string> {
	let enforcedPrompt = prompt

	if (!enforcedPrompt.includes("select_active_intent")) {
		enforcedPrompt = `${enforcedPrompt}\n\n${INTENT_SELECTION_REQUIREMENT}`
	}

	const intentsResult = await loadActiveIntentsSpec(cwd)
	if (intentsResult.ok && intentsResult.intents.length > 0 && !enforcedPrompt.includes("<active_intents_spec>")) {
		enforcedPrompt = `${enforcedPrompt}\n\n${buildActiveIntentCatalog(intentsResult.intents)}`
	}

	return enforcedPrompt
}
