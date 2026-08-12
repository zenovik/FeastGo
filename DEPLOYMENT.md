# Deploying FeastGo to Hostinger

Two separate pieces, deployed independently:

| Piece | Where | How |
|---|---|---|
| `client/` (Angular SPA) | `feastgo.zenovik.com` | GitHub Actions builds it and rsyncs the static output over SSH — Hostinger's own Git-build pipeline can't build it (see below) |
| `server/` (Express API) | `api.feastgo.zenovik.com` | Hostinger's Node.js App, deployed directly from the repo |

## Why the client doesn't use Hostinger's own build pipeline

Angular 22's CLI refuses to run on Node < v22.22.3 / v24.15.0 / v26.0.0. Hostinger's Git-deploy feature only offers major-version buckets (18/20/22/24) pinned to fixed patches that are older than that floor (confirmed: `22.x` → v22.18.0, `24.x` → v24.6.0), with no way to pick an exact patch. So the build fails there no matter what's selected — hence the GitHub Actions workaround.

---

## 1. Frontend: `client/` → `feastgo.zenovik.com`

Handled by `.github/workflows/deploy-client.yml`, which builds on Node 24 (GitHub's runner, not Hostinger's) and rsyncs `client/dist/client/browser/` to Hostinger over SSH. It triggers on every push to `main` that touches `client/**`, or manually via the Actions tab.

**One-time setup:**

1. Generate a deploy keypair:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/hostinger_deploy -N ""
   ```
2. hPanel → **Advanced → SSH Access** → add `hostinger_deploy.pub` as an authorized key. Note the SSH host, port (often `65002`, not `22`), and username shown there.
3. hPanel → **Files → File Manager** → find the exact document root for `feastgo.zenovik.com`.
4. Add these as GitHub repo secrets (**Settings → Secrets and variables → Actions**):
   - `HOSTINGER_SSH_KEY` — the private key file contents
   - `HOSTINGER_SSH_HOST`
   - `HOSTINGER_SSH_PORT`
   - `HOSTINGER_SSH_USER`
   - `HOSTINGER_REMOTE_PATH` — the document root from step 3
5. In hPanel's **Deployments** page for this site, disable/pause the auto-build-on-push — it'll otherwise keep failing on every push (harmlessly, since the real deploy happens via Actions, but it's noisy).

`client/src/app/core/config.ts` reads `API_URL` from `src/environments/environment.ts` (dev: `http://localhost:4000/api`) or `environment.prod.ts` (prod: `https://api.feastgo.zenovik.com/api`), swapped automatically by the `fileReplacements` entry in `angular.json`'s production config — no manual step needed, `npm run build` always produces the prod-pointing bundle.

`client/public/.htaccess` (copied into every build output) handles Angular's client-side routing so deep links/refreshes don't 404, plus static asset caching.

---

## 2. Backend: `server/` → `api.feastgo.zenovik.com`

Express doesn't hit the strict Node-version wall Angular does, so Hostinger's native **Node.js App** feature works fine here — no bypass needed.

**Setup in hPanel:**

1. **Websites → Add website → Node.js App** (or similar, depending on current hPanel layout), connect the same GitHub repo.
2. **Root directory:** `server`
3. **Startup file:** `src/server.js` (or set the start command to `npm start` — `package.json`'s `main` now correctly points at `src/server.js`)
4. **Node.js version:** any of 18.x/20.x/22.x/24.x — no floor requirement here.
5. **Environment variables** (set in hPanel, never commit a real `.env` — see `server/.env.example` for the full list with comments):
   - `PORT` — Hostinger usually injects this itself; leave unset unless told otherwise
   - `NODE_ENV=production`
   - `MONGO_URI` — a MongoDB Atlas connection string (Hostinger doesn't provide managed MongoDB)
   - `JWT_SECRET` — a long random value, different from any dev secret
   - `JWT_EXPIRES_IN=7d`
   - `CLIENT_ORIGIN=https://feastgo.zenovik.com` — must match the frontend's exact origin; used for both Express CORS (`server/src/app.js`) and the Socket.IO handshake (`server/src/realtime/socket.js`)
6. Point the `api.feastgo.zenovik.com` subdomain at this app (hPanel → Domains, or wherever the Node.js App's domain binding step is).

---

## 3. Verify after both are live

```bash
curl https://api.feastgo.zenovik.com/api/health
# → {"status":"ok","service":"feastgo-api"}
```

Then open `https://feastgo.zenovik.com`, confirm API calls succeed (no CORS errors in the browser console) and that a Socket.IO connection opens (e.g. a live notification/order-status update actually arrives).
