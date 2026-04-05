---
description: Run automated security and stability maintenance on the repository.
---
// turbo-all
# Maintenance Workflow: CI/CD Agent

Experience the power of automated repository health checks. This workflow performs security audits, intelligent patching, and full-stack regression testing.

## Phase 1: Security Audit & Initial Scan
1. Run `npm audit --audit-level=high` to detect high-severity vulnerabilities.
2. If vulnerabilities are found, proceed to Phase 2. Otherwise, skip to Phase 3.

## Phase 2: Intelligent Remediation
1. Attempt a standard fix with `npm audit fix`.
2. Re-run `npm audit --audit-level=high`.
3. If issues persist, invoke the maintenance assistant to apply a safe `override` in `package.json` for the specific vulnerable package.
4. Run `npm install` to apply all changes.

## Phase 3: Deep Stability Verification
1. Clean the build directory: `rm -rf dist/`.
2. Run a full production build: `npm run build`.
3. Execute the unit and regression test suite: `npm test`.

## Phase 4: Final Status Report
1. Verify that `npm audit` reports 0 high/moderate vulnerabilities.
2. Confirm both Build and Tests are green.
3. Generate a `/maintenance` summary and suggest a commit if changes were made.
