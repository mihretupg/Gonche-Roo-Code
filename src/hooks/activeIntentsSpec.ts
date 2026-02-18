import fs from "fs/promises"
import path from "path"
import * as yaml from "yaml"

export const ORCHESTRATION_DIR = ".orchestration"
export const ACTIVE_INTENTS_FILE = "active_intents.yaml"

export interface ActiveIntentSpec {
	id: string
	name?: string
	status?: string
	owned_scope: string[]
	constraints: string[]
	acceptance_criteria: string[]
}

interface ActiveIntentsDocument {
	active_intents?: Array<Partial<ActiveIntentSpec>>
}

function normalizeStringList(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return []
	}
	return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
}

export function parseActiveIntentsSpec(raw: string): ActiveIntentSpec[] {
	const parsed = (yaml.parse(raw) as ActiveIntentsDocument | null) ?? {}
	const intents = Array.isArray(parsed.active_intents) ? parsed.active_intents : []

	return intents
		.filter((intent): intent is Partial<ActiveIntentSpec> => typeof intent?.id === "string" && intent.id.trim().length > 0)
		.map((intent) => ({
			id: intent.id!,
			name: intent.name,
			status: intent.status,
			owned_scope: normalizeStringList(intent.owned_scope),
			constraints: normalizeStringList(intent.constraints),
			acceptance_criteria: normalizeStringList(intent.acceptance_criteria),
		}))
}

export type LoadActiveIntentsSpecResult =
	| { ok: true; intents: ActiveIntentSpec[] }
	| { ok: false; kind: "missing" | "parse_error"; message: string }

export async function loadActiveIntentsSpec(cwd: string): Promise<LoadActiveIntentsSpecResult> {
	const intentsPath = path.join(cwd, ORCHESTRATION_DIR, ACTIVE_INTENTS_FILE)
	try {
		const raw = await fs.readFile(intentsPath, "utf-8")
		return {
			ok: true,
			intents: parseActiveIntentsSpec(raw),
		}
	} catch (error: any) {
		if (error?.code === "ENOENT") {
			return {
				ok: false,
				kind: "missing",
				message: `Missing required .orchestration/${ACTIVE_INTENTS_FILE}. Define at least one intent before mutation.`,
			}
		}

		return {
			ok: false,
			kind: "parse_error",
			message: `Failed to parse .orchestration/${ACTIVE_INTENTS_FILE}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		}
	}
}
