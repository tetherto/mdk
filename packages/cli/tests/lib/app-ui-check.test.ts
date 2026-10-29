import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { APP_UI_SHARED_MODULES, checkAppUi, scanImports } from '../../src/lib/app-ui-check.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(() => cleanupTmpDirs());

const VALID_UI = [
  "import { jsx } from 'react/jsx-runtime'",
  "import { useState } from 'react'",
  "import { defineMdkApp, useMdkApp } from '@tetherto/mdk-react-adapter'",
  'const Page = () => { const [n] = useState(0); return jsx("p", { children: useMdkApp().name + n }) }',
  "export default defineMdkApp({ id: 'io.tether.demo', displayName: 'Demo', routes: [{ path: '', section: 'Ops', component: Page }], panels: [{ id: 'p', slot: 'home', component: Page }], sections: [{ label: 'Ops', icon: Page }] })",
].join('\n');

const appWithUi = (source: string, file = 'index.js'): string => {
  const dir = makeTmpDir();
  mkdirSync(join(dir, 'ui'), { recursive: true });
  writeFileSync(join(dir, 'ui', file), source);
  return dir;
};

const check = (dir: string) => checkAppUi(dir, { id: 'io.tether.demo', runContract: true });

describe('checkAppUi', () => {
  it('accepts a UI that imports only shared modules and meets the contract', () => {
    expect(check(appWithUi(VALID_UI))).toEqual({ errors: [], warnings: [] });
  });

  it('keeps MDK_APP_PANEL_SLOT real, so a panel declared with it passes', () => {
    const dir = appWithUi(
      VALID_UI.replace("import { defineMdkApp, useMdkApp }", "import { defineMdkApp, MDK_APP_PANEL_SLOT, useMdkApp }").replace(
        "slot: 'home'",
        'slot: MDK_APP_PANEL_SLOT.HOME',
      ),
    );
    expect(check(dir)).toEqual({ errors: [], warnings: [] });
  });

  it('accepts the placeholder `mdk create app` writes before the UI is built, warning it shows nothing', () => {
    const dir = appWithUi('export default { "id": "io.tether.demo", "displayName": "Demo", "routes": [], "panels": [] };\n');
    expect(check(dir)).toEqual({
      errors: [],
      warnings: [expect.stringMatching(/exports no pages and no panels, so the app will not show in the dashboard/)],
    });
  });

  it('rejects a module that does not parse, naming Node\'s error', () => {
    const { errors } = check(appWithUi('export default {'));
    expect(errors).toEqual([expect.stringMatching(/ui\/index\.js is not a valid JavaScript module: SyntaxError/)]);
  });

  it('rejects an import the dashboard does not provide, in any built file', () => {
    const dir = appWithUi(`import './chunk.js'\n${VALID_UI}`);
    writeFileSync(join(dir, 'ui', 'chunk.js'), "import dayjs from 'dayjs'\nexport const d = dayjs\n");
    expect(check(dir).errors).toEqual([expect.stringMatching(/ui\/chunk\.js imports "dayjs", which the dashboard does not provide/)]);
  });

  it('rejects a build that bundled its own React', () => {
    const dir = appWithUi(`const internals = { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {} }\n${VALID_UI}`);
    expect(check(dir).errors).toEqual([expect.stringMatching(/bundles its own copy of React/)]);
  });

  it("rejects a UI whose id is not the app's", () => {
    const { errors } = check(appWithUi(VALID_UI.replace("id: 'io.tether.demo'", "id: 'io.tether.other'")));
    expect(errors).toEqual([expect.stringMatching(/declares id "io\.tether\.other", but mdk-app\.yaml says "io\.tether\.demo"/)]);
  });

  it('rejects a missing default export and a malformed contract', () => {
    expect(check(appWithUi('export const x = 1\n')).errors).toEqual([expect.stringMatching(/must default-export the app UI object/)]);
    const { errors } = check(
      appWithUi("export default { id: 'io.tether.demo', displayName: '', routes: [{ path: 1 }, { path: 'x', section: 2, component: () => null }], panels: [{ id: 'a', slot: 'home' }, { id: 'a', slot: 'home', component: () => null }], sections: [{ label: 'Ops' }, { label: 'Ops', icon: 'svg' }] }\n"),
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/non-empty `displayName`/),
        expect.stringMatching(/routes\[0\] needs a string `path`/),
        expect.stringMatching(/routes\[1\] \("x"\) has a `section` that is not a non-empty string/),
        expect.stringMatching(/panel "a" needs a React `component`/),
        expect.stringMatching(/two panels with id "a"/),
        expect.stringMatching(/two sections labelled "Ops"/),
        expect.stringMatching(/section "Ops" has an `icon` that is not a React component/),
      ]),
    );
  });

  it('only warns when top-level code cannot run in Node — the dashboard still checks it', () => {
    const { errors, warnings } = check(appWithUi(`window.addEventListener('x', () => {})\n${VALID_UI}`));
    expect(errors).toEqual([]);
    expect(warnings).toEqual([expect.stringMatching(/could not check the UI contract in Node \(window is not defined\)/)]);
  });

  it('runs no app code without runContract', () => {
    const dir = appWithUi(VALID_UI.replace("id: 'io.tether.demo'", "id: 'io.tether.other'"));
    expect(checkAppUi(dir, { id: 'io.tether.demo' })).toEqual({ errors: [], warnings: [] });
  });

  it('warns when ui-src/ changed after the build', () => {
    const dir = appWithUi(VALID_UI);
    mkdirSync(join(dir, 'ui-src'));
    writeFileSync(join(dir, 'ui-src', 'index.tsx'), '');
    const old = new Date(Date.now() - 60_000);
    utimesSync(join(dir, 'ui', 'index.js'), old, old);
    expect(check(dir).warnings).toEqual([expect.stringMatching(/ui-src\/index\.tsx changed after ui\/ was built/)]);
  });

  it('reports a missing entry', () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, 'ui'));
    expect(check(dir).errors).toEqual(['ui/index.js: not found']);
  });
});

describe('scanImports', () => {
  it('finds static, re-export, side-effect and dynamic imports, with the names imported', () => {
    const found = scanImports(
      [
        'import React, { useState as s, useEffect } from "react";',
        'import * as Q from "@tanstack/react-query";',
        'export { Button } from "@tetherto/mdk-react-devkit";',
        'import "some-polyfill";',
        'const lazy = () => import("lodash");',
        'import { local } from "./chunk.js";',
      ].join('\n'),
    );
    expect(Object.fromEntries(found)).toEqual({
      react: ['useState', 'useEffect', 'default'],
      '@tanstack/react-query': [],
      '@tetherto/mdk-react-devkit': ['Button'],
      'some-polyfill': [],
      lodash: [],
    });
  });
});

describe('APP_UI_SHARED_MODULES', () => {
  // The CLI keeps its own copy of the list the dashboard provides; in an MDK
  // checkout, it must match ui-foundation's.
  const source = join(dirname(fileURLToPath(import.meta.url)), '../../../../ui/packages/ui-foundation/src/apps/shared-modules.ts');

  it.runIf(existsSync(source))("matches ui-foundation's MDK_APP_SHARED_MODULES", () => {
    const list = readFileSync(source, 'utf8').match(/MDK_APP_SHARED_MODULES = \[([\s\S]*?)\]/)![1]!;
    expect([...list.matchAll(/'([^']+)'/g)].map((m) => m[1])).toEqual([...APP_UI_SHARED_MODULES]);
  });
});
