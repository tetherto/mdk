import { type FormEvent, useState } from "react";

import { Button, CoreAlert, Card, CardBody, CardHeader, Input, MiningStatusIcon, Typography } from "@tetherto/mdk-react-devkit/primitives";

import { auth, errorMessage } from "./auth";

// The user types config/site.deploy.json.example ships under rbac.users, to try one after another.
// They share the example's demo password, DEMO_PASSWORD.
const DEMO_PASSWORD = "mdk-site-demo";
const DEMO_USERS: { name: string; can: string }[] = [
  { name: "admin", can: "everything, plus the Activity log" },
  { name: "operator", can: "power mode and pools on every miner" },
  { name: "tech-whatsminer", can: "power mode on Whatsminer miners only" },
  { name: "pool-manager", can: "pools on every miner, no power mode" },
  { name: "auditor", can: "read-only, plus the Activity log" },
  { name: "viewer", can: "read-only dashboards" },
  { name: "tenant-antminer", can: "sees and controls only the Antminer fleet" },
];

export function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.signInWithPassword({ username, password });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card style={{ width: "100%", maxWidth: 440 }}>
        <CardHeader style={{ padding: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#f7931a", display: "inline-flex" }}>
            <MiningStatusIcon />
          </span>
          <Typography variant="heading3">Sign in to MDK Site</Typography>
        </CardHeader>
        <CardBody style={{ padding: 20 }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Typography variant="caption">Username</Typography>
              <Input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="signin-username"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Typography variant="caption">Password</Typography>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="signin-password"
              />
            </label>
            {error && <CoreAlert type="error" title={error} showIcon />}
            <Button type="submit" disabled={busy || !username || !password} data-testid="signin-submit">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <Typography variant="caption" style={{ opacity: 0.7 }}>
              Demo users, all with the password <code>{DEMO_PASSWORD}</code>:
            </Typography>
            {DEMO_USERS.map((u) => (
              <button
                key={u.name}
                type="button"
                onClick={() => {
                  setUsername(u.name);
                  setPassword(DEMO_PASSWORD);
                }}
                style={{ all: "unset", cursor: "pointer", display: "flex", gap: 8, fontSize: 13 }}
              >
                <code style={{ minWidth: 130 }}>{u.name}</code>
                <span style={{ opacity: 0.7 }}>{u.can}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
