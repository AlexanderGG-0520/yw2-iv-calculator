import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

describe("GitOps deployment renderer", () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it("atomically renders the Node runtime contract with numeric non-root IDs", () => {
    const cwd = mkdtempSync(join(tmpdir(), "yw2-gitops-"));
    tempDirs.push(cwd);
    mkdirSync(join(cwd, "infra/kubernetes"), { recursive: true });

    const sha = "a".repeat(40);
    const script = join(process.cwd(), "scripts/render-kubernetes-deployment.mjs");

    execFileSync(process.execPath, [script, sha], { cwd });

    const manifest = readFileSync(join(cwd, "infra/kubernetes/app.yaml"), "utf8");
    expect(manifest).toContain(`yw2-iv-calculator:${sha}`);
    expect(manifest).toContain("containerPort: 8080");
    expect(manifest).toContain("path: /healthz");
    expect(manifest).toContain("targetPort: 8080");
    expect(manifest).toContain("runAsNonRoot: true");
    expect(manifest).toContain("runAsUser: 1000");
    expect(manifest).toContain("runAsGroup: 1000");
    expect(manifest).toContain("- ALL");
    expect(manifest).not.toContain("containerPort: 80\n");
  });

  it("rejects non-commit image identifiers", () => {
    const cwd = mkdtempSync(join(tmpdir(), "yw2-gitops-"));
    tempDirs.push(cwd);
    mkdirSync(join(cwd, "infra/kubernetes"), { recursive: true });

    const script = join(process.cwd(), "scripts/render-kubernetes-deployment.mjs");

    expect(() =>
      execFileSync(process.execPath, [script, "latest"], {
        cwd,
        stdio: "pipe",
      }),
    ).toThrow();
  });
});
