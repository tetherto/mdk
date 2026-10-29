import type { GrantSummary } from './rbac.js';
import { theme } from './theme.js';

/** One line on what registering did to the app's Kernel access in spec.rbac. */
export function grantLine(grant: GrantSummary): string {
  const role = theme.key(`spec.rbac role ${grant.role}`);
  if (grant.action === 'conflict') {
    return (
      `  ${theme.warn('note')}: ${role} differs from what mdk-app.yaml requests and was left as it is; ` +
      `update it, or remove it and run ${theme.cmd('mdk rbac init')}\n`
    );
  }
  if (!grant.written) return `  ${theme.warn('note')}: could not record ${theme.value(grant.serviceAccount)} in mdk.yaml; check ${role}\n`;
  switch (grant.action) {
    case 'add':
      return `  ${theme.muted('mdk.yaml')} ${role} grants ${theme.value(grant.serviceAccount)} the Kernel access it requests\n`;
    case 'replace':
      return `  ${theme.muted('mdk.yaml')} ${role} replaced with what the app now requests\n`;
    case 'remove':
      return `  ${theme.muted('mdk.yaml')} ${role} removed: the app no longer requests Kernel access\n`;
    case 'keep':
      return `  ${theme.muted('mdk.yaml')} ${role} left as it is\n`;
    default:
      return `  ${theme.muted('mdk.yaml')} runs as ${theme.value(grant.serviceAccount)}${grant.action === 'none' ? ' (no Kernel access requested)' : ''}\n`;
  }
}
