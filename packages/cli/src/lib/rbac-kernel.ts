import { isRefusal, withKernelClient, type RbacRecord } from './kernel-client.js';
import { rbacVersion } from './rbac.js';
import { loadStackSpec } from './spec.js';

/**
 * `mdk rbac apply | show`: hands spec.rbac from mdk.yaml to the running Kernel,
 * and compares the two. mdk.yaml is validated first (loadStackSpec throws a
 * StackSpecError listing every problem), so an invalid policy never leaves the
 * machine; the Kernel validates it again and keeps the policy in force if it
 * refuses.
 */

const KERNEL_TIMEOUT_MS = 5000;

interface PolicySummary {
  version: string;
  roles: number;
  bindings: number;
}

export interface RbacApplyResult {
  ok: boolean;
  /** spec.rbac as mdk.yaml has it. */
  local: PolicySummary;
  kernel: 'up' | 'down';
  changed?: boolean;
  /** The version the Kernel replaced, when it changed. */
  previous?: string | null;
  appliedAt?: string;
  message?: string;
  /** The Kernel's validation problems, when it refused the policy. */
  errors?: string[];
}

export interface RbacShowResult {
  local: PolicySummary;
  kernel: 'up' | 'down';
  /** What the Kernel enforces; null when it never had a policy applied. */
  applied: RbacRecord | null;
  inSync: boolean;
  message?: string;
}

function summarize(rbac: { roles?: unknown[]; bindings?: unknown[] } | undefined): PolicySummary {
  return { version: rbacVersion(rbac ?? null), roles: rbac?.roles?.length ?? 0, bindings: rbac?.bindings?.length ?? 0 };
}

export async function applyStackRbac(projectDir: string): Promise<RbacApplyResult> {
  const rbac = loadStackSpec(projectDir).spec.rbac;
  const local = summarize(rbac);

  const res = await withKernelClient(projectDir, (client) => client.applyRbac(rbac ?? null, { timeout: KERNEL_TIMEOUT_MS }));
  if ('down' in res) {
    return { ok: false, local, kernel: 'down', message: `${res.down}. spec.rbac is valid; the Kernel applies it when it next starts.` };
  }
  const reply = res.value;
  if (isRefusal(reply)) {
    return { ok: false, local, kernel: 'up', message: `the Kernel refused the policy and kept the one in force: ${reply.error.split('\n')[0]}`, errors: reply.errors };
  }
  return {
    ok: true,
    local,
    kernel: 'up',
    changed: reply.changed,
    appliedAt: reply.appliedAt,
    ...(reply.changed ? { previous: reply.previous ?? null } : {}),
  };
}

export async function showStackRbac(projectDir: string): Promise<RbacShowResult> {
  const local = summarize(loadStackSpec(projectDir).spec.rbac);

  const res = await withKernelClient(projectDir, (client) => client.getRbac({ timeout: KERNEL_TIMEOUT_MS }));
  if ('down' in res) return { local, kernel: 'down', applied: null, inSync: false, message: res.down };
  if (isRefusal(res.value)) return { local, kernel: 'up', applied: null, inSync: false, message: res.value.error };

  const applied = res.value.record;
  return { local, kernel: 'up', applied, inSync: applied?.version === local.version };
}
