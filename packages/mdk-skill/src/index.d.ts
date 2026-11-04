export type SkillClient = 'cursor' | 'claude' | 'all';

export interface InstalledEntry {
  client: string;
  dir: string;
  /** Stale MDK-shipped skill dirs removed from `dir` because the current suite no longer ships them. */
  removed: string[];
}

export interface SkippedEntry {
  client: string;
  skill: string;
  dir: string;
  reason: string;
}

export interface InstallResult {
  skills: string[];
  installed: InstalledEntry[];
  /** Existing skill dirs left untouched: symlinks, or not marked `metadata.suite: mdk-developer-skill`. */
  skipped: SkippedEntry[];
}

export interface InstallOptions {
  /** Target client(s). Defaults to `'all'`. */
  client?: SkillClient;
  /** Project root to install into. Defaults to `process.cwd()`. */
  target?: string;
  /** Assemble the suite first if `dist/skills/` is empty. Defaults to `true`. */
  assembleIfMissing?: boolean;
  /** Called once per skipped skill dir. Defaults to `console.warn`. */
  onWarn?: (message: string) => void;
}

export interface AssembleResult {
  files: number;
  version: string;
}

export declare const CLIENT_DIRS: Record<string, string[]>;

/** True when the source map and repo root are available to assemble from. */
export declare function canAssemble(): boolean;

/** True when `dist/skills/` already holds at least one assembled skill. */
export declare function isAssembled(): boolean;

/** Assemble the skill suite from source artifacts into `dist/skills/`. */
export declare function assemble(): AssembleResult;

/**
 * Install the assembled skills into a project's client skills directories.
 * Follows a client dir segment that is a symlink to a directory inside the
 * project, and throws if one leaves the project, dangles or points at a file; skips (and
 * warns about) existing same-named skill dirs that are not suite skills. Stale
 * MDK-shipped skills are swept; user-authored skills are left untouched.
 */
export declare function installSkills(options?: InstallOptions): InstallResult;
