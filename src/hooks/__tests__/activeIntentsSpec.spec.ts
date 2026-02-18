import fs from "fs/promises"
import os from "os"
import path from "path"
import { describe, expect, it } from "vitest"

import { loadActiveIntentsSpec, parseActiveIntentsSpec } from "../activeIntentsSpec"

describe("activeIntentsSpec", () => {
	it("parses active_intents yaml and normalizes optional arrays", () => {
		const raw = `
active_intents:
  - id: INT-001
    name: Core
    status: active
    owned_scope:
      - src/core/**
    constraints:
      - Must be deterministic
    acceptance_criteria:
      - Hook runs before mutation
  - id: INT-002
    name: UI
`

		const intents = parseActiveIntentsSpec(raw)
		expect(intents).toEqual([
			{
				id: "INT-001",
				name: "Core",
				status: "active",
				owned_scope: ["src/core/**"],
				constraints: ["Must be deterministic"],
				acceptance_criteria: ["Hook runs before mutation"],
			},
			{
				id: "INT-002",
				name: "UI",
				status: undefined,
				owned_scope: [],
				constraints: [],
				acceptance_criteria: [],
			},
		])
	})

	it("returns missing result when .orchestration/active_intents.yaml is absent", async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "roo-hooks-"))
		try {
			const result = await loadActiveIntentsSpec(tempRoot)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.kind).toBe("missing")
			}
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true })
		}
	})
})
