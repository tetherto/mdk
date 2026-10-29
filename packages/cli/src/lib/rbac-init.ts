import { validateApp } from './app-package.js';
import { CLI_ACCOUNT, GATEWAY_ACCOUNT, MCP_ACCOUNT } from './credentials.js';
import { applyStackRbac, type RbacApplyResult } from './rbac-kernel.js';
import { ADMIN_ROLE, GATEWAY_ROLE, bindSubject, grantApp, type BindResult, type GrantAction } from './rbac.js';
import { resolvePackageDir } from './runtime.js';
import { loadStackSpec } from './spec.js';

/**
 * `mdk rbac init`: makes a stack's policy usable without editing it by hand,
 * through ordinary roles and bindings written into mdk.yaml (nothing is
 * special to the evaluator):
 *   - binds the CLI's account (mdk-cli) to `admin`, writing ADMIN_ROLE if missing
 *   - binds the Gateway's and MCP server's accounts (mdk-gateway, mdk-mcp) to
 *     `gateway` (policy: read)
 *   - writes each app's grant from its mdk-app.yaml, as `mdk add app` would;
 *     a role the operator changed is left alone and reported
 * then hands the result to a running Kernel. A Kernel whose policy in force
 * does not let the CLI apply one picks mdk.yaml up when it next starts.
 */

export interface AppInitOutcome {
  app: string;
  action: GrantAction | 'error';
  message?: string;
}

export interface InitResult {
  cli: BindResult;
  gateway: BindResult;
  mcp: BindResult;
  apps: AppInitOutcome[];
  applied: RbacApplyResult;
}

export async function initPolicy(projectDir: string): Promise<InitResult> {
  const spec = loadStackSpec(projectDir);
  const cli = bindSubject(projectDir, ADMIN_ROLE.name, { kind: 'ServiceAccount', name: CLI_ACCOUNT });
  const gateway = bindSubject(projectDir, GATEWAY_ROLE.name, { kind: 'ServiceAccount', name: GATEWAY_ACCOUNT });
  const mcp = bindSubject(projectDir, GATEWAY_ROLE.name, { kind: 'ServiceAccount', name: MCP_ACCOUNT });

  const apps: AppInitOutcome[] = [];
  for (const app of spec.spec.apps) {
    try {
      const { manifest, errors } = validateApp(resolvePackageDir(projectDir, app.package));
      if (errors.length) {
        apps.push({ app: app.name, action: 'error', message: `${app.package} is not a valid app: ${errors[0]}` });
        continue;
      }
      const grant = grantApp(projectDir, app.name, manifest.permissions ?? []);
      apps.push({
        app: app.name,
        action: grant.action,
        ...(grant.action === 'conflict' ? { message: `role ${grant.role} differs from the request; resolve it with \`mdk add app ${app.package} --accept-permissions | --keep-permissions\`` } : {}),
      });
    } catch (error) {
      apps.push({ app: app.name, action: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }

  return { cli, gateway, mcp, apps, applied: await applyStackRbac(projectDir) };
}
