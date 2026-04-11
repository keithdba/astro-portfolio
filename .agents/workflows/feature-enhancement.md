---
description: Document a feature enhancement in this workspace's /docs folder.
globs:
---
// turbo-all
# Feature Enhancement Workflow

> **Shared Agent:** This workflow delegates to the Antigravity-level Feature Enhancement Agent.
> Canonical definition: `/.agents/shared/FeatureEnhancementAgent.js`
> Canonical workflow: `/.agents/workflows/feature-enhancement.md`

## Trigger

Activated when a prompt begins with:
> **Feature Enhancement**

## Behavior

1. Parse the feature name and scoped requirements from the prompt.
2. Capture the Implementation Plan details (architectural changes, component additions, configuration updates).
3. Generate or update a markdown file at `astro-portfolio/docs/feature-<kebab-case-name>.md`.
4. Use the **Antigravity Feature Enhancement Agent** identity and template conventions.

## Workspace-Specific Notes

- Documentation output targets: `astro-portfolio/docs/`
- Author line: `Antigravity Feature Enhancement Agent (astro-portfolio)`
- Relevant architectural context: Astro framework, SSR/SSG pages, Astro components, content collections, API endpoints.

## Constraints

- Do NOT execute technical implementations or write execution code.
- Do NOT place documentation outside `astro-portfolio/docs/`.
- All outputs must be human-readable Markdown.
- File names must follow `feature-<kebab-case-name>.md`.
