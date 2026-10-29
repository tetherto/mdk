import { describe, expect, it } from 'vitest';
import {
  APP_CATALOG,
  WORKER_CATALOG,
  findCatalogApp,
  findCatalogWorker,
  resolveCatalogPackage,
  type CatalogWorker,
} from '../../src/lib/catalog.js';

describe('findCatalogWorker', () => {
  it('finds a catalog worker by its package value', () => {
    const [first] = WORKER_CATALOG;
    if (!first) return; // the shipped worker catalog may be empty
    expect(findCatalogWorker(first.value)).toBe(first);
  });

  it('returns undefined for an unknown package', () => {
    expect(findCatalogWorker('@nope/not-a-worker')).toBeUndefined();
  });
});

describe('resolveCatalogPackage', () => {
  it('resolves a plain (non-bundled) entry with no repoPath as not bundled', () => {
    const entry: CatalogWorker = {
      value: '@org/mdk-worker-stub',
      label: 'mdk-worker-stub',
      hint: 'stub — not published',
    };
    const resolved = resolveCatalogPackage(entry);
    expect(resolved.bundled).toBe(false);
    expect(resolved.unavailable).toBeUndefined();
    expect(resolved.packageName).toBe(entry.value);
  });

  it('resolves the shipped apps from the registry', () => {
    for (const pkg of ['@tetherto/mdk-app-agent', '@tetherto/mdk-app-demo']) {
      const entry = findCatalogApp(pkg);
      expect(entry).toBeDefined();
      expect(resolveCatalogPackage(entry!)).toEqual({ packageName: pkg, bundled: false });
    }
  });

  it('findCatalogApp returns undefined for an unknown package', () => {
    expect(findCatalogApp('@nope/not-a-plugin')).toBeUndefined();
  });

  it('marks an entry unavailable when its repoPath does not exist in the checkout', () => {
    const entry: CatalogWorker = {
      value: '@tetherto/mdk-worker-nonexistent',
      label: 'mdk-worker-nonexistent',
      hint: 'test fixture',
      repoPath: 'does/not/exist/anywhere',
    };
    const resolved = resolveCatalogPackage(entry);
    expect(resolved.bundled).toBe(false);
    expect(resolved.unavailable).toBe(true);
    expect(resolved.packageName).toBe(entry.value);
  });
});

describe('catalog contents', () => {
  it('exposes a non-empty app catalog, and well-formed worker entries if any', () => {
    expect(APP_CATALOG.length).toBeGreaterThan(0);
    for (const entry of [...WORKER_CATALOG, ...APP_CATALOG]) {
      expect(entry.value).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.hint).toBeTruthy();
    }
  });
});
