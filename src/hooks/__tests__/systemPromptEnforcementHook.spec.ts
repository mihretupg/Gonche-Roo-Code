import fs from "fs/promises"
import os from "os"
import path from "path"
import { describe, expect, it } from "vitest"

import { enforceSystemPromptIntentHooks } from "../systemPromptEnforcementHook"

describe("systemPromptEnforcementHook", () => {
	it("injects select_active_intent guidance when prompt is missing it", async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "roo-prompt-"))
		try {
			const prompt = "You are a coding assistant."
			const result = await enforceSystemPromptIntentHooks(prompt, tempRoot)
			expect(result).toContain("select_active_intent")
			expect(result).toContain("Reasoning Loop Requirement")
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true })
		}
	})

	it("appends active intent catalog when active_intents.yaml exists", async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "roo-prompt-intents-"))
		try {
			const orchestrationDir = path.join(tempRoot, ".orchestration")
			await fs.mkdir(orchestrationDir, { recursive: true })
			await fs.writeFile(
				path.join(orchestrationDir, "active_intents.yaml"),
				`active_intents:
  - id: INT-100
    owned_scope:
      - src/hooks/**
`,
				"utf-8",
			)

			const prompt = "You must call select_active_intent when mutating."
			const result = await enforceSystemPromptIntentHooks(prompt, tempRoot)
			expect(result).toContain("<active_intents_spec>")
			expect(result).toContain("INT-100")
			expect(result).toContain("src/hooks/**")
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true })
		}
	})
})
