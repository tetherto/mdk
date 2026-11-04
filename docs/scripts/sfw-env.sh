# Socket Firewall (SFW) allowlist for MDK's local tooling.
#
# If your shell wraps npm/npx through `sfw` (a local security proxy — see the
# `command -v sfw` block most shell profiles add), it blocks any outbound host not
# explicitly allowed. `npm run link-check` (linkinator, see
# docs/reference/maintainers/linters.md) is the command that hits these — first its
# own ephemeral local crawl server, then every external link it finds in the repo's
# Markdown.
#
# Each bypass entry below is a host linkinator legitimately needs to *check* (not
# skip — see linkinator.config.json's `skip` list for URLs that are never checked
# at all; that's a different concern from this file, see the note in that config).
#
# Keep it that way: this list is for hosts a *link checker* fetches, and nothing
# else. `bypass:` is the one sfw kind that tunnels straight through with no MITM
# and no scanning, so adding a host that *delivers packages* to it silently opts
# that supply chain out of Socket. A registry belongs on its own kind instead
# (`npm:`, `pypi:`, `cargo:`, …), which keeps it reachable and still scanned.
#
# Before adding anything, check sfw's own defaults — it already ships github.com,
# codeload.github.com, gitlab.com, bitbucket.org and most public registries. Custom
# entries merge on top of those rather than replacing them, so re-declaring a
# default does nothing.
#
#   localhost                 linkinator's own local crawl server (random port per run —
#                              sfw matches on hostname, so the port doesn't matter)
#   img.shields.io             README badges (CI status, release tag, license)
#   mdk.tether.io               project docs domain, referenced in README badges
#   docs.mdk.tether.io          same
#   discord.com                 community invite link (README, docs footer)
#   www.radix-ui.com            Radix UI primitives docs, linked from several
#                                ui/packages/react-devkit/.../USAGE.md files
#   react-hook-form.com          form library docs, linked from the form component's README
#   www.conventionalcommits.org  commit convention reference (ui/CLAUDE.md, ui/docs/CONTRIBUTING.md)
#   semver.org                   semver spec reference
#   www.f2pool.com               F2Pool worker docs (backend/workers/minerpools/f2pool)
#   ocean.xyz                    Ocean pool link (docs/reference/maintainers/integrations/pools.md)
#   telemetry.vercel.com         Vercel telemetry endpoint (reached by linkinator or related tooling)
#   turborepo.dev                hit by the turbo CLI itself (not a linkinator target)
#   nodejs.org                   Node.js docs/download links referenced in the repo's Markdown
#   git-scm.com                  Git docs referenced in the repo's Markdown
#   qvac.tether.io               QVAC product page, linked from docs/guides/agent/run-standalone.md
#
# Source this file from your shell profile rather than duplicating the policy there:
#   [ -f "/absolute/path/to/mdk/docs/scripts/sfw-env.sh" ] && source "/absolute/path/to/mdk/docs/scripts/sfw-env.sh"

# Merge additively: if another repo's sfw-env.sh already set SFW_CUSTOM_REGISTRIES
# in this shell, keep its entries rather than clobbering them.
export SFW_CUSTOM_REGISTRIES="${SFW_CUSTOM_REGISTRIES:+$SFW_CUSTOM_REGISTRIES,}bypass:localhost,bypass:img.shields.io,bypass:mdk.tether.io,bypass:docs.mdk.tether.io,bypass:discord.com,bypass:www.radix-ui.com,bypass:react-hook-form.com,bypass:www.conventionalcommits.org,bypass:semver.org,bypass:www.f2pool.com,bypass:ocean.xyz,bypass:telemetry.vercel.com,bypass:turborepo.dev,bypass:nodejs.org,bypass:git-scm.com,bypass:qvac.tether.io"
