# npm Publishing

This runbook describes how to publish the workspace packages to the public npm
registry under the `@my-mind-node` organization scope.

## Packages

The repository root is private and must not be published. Publish only the
workspace packages under `packages/*`:

- `@my-mind-node/core`
- `@my-mind-node/react`
- `@my-mind-node/importers`
- `@my-mind-node/exporters`

The apps under `apps/*` are examples and docs targets. They are marked
`private: true` and are not npm release artifacts.

## One-time npm setup

1. Create or confirm the npm organization scope:

   - Organization: `my-mind-node`
   - Scope used by packages: `@my-mind-node`
   - Owner account: `bldf`

2. Create a granular access token from npm:

   - Open `https://www.npmjs.com/settings/bldf/tokens/granular-access-tokens/new`.
   - Token name: `my-mind-node-publish-beta` or another clear release name.
   - Description: `Publish @my-mind-node packages from local pnpm workspace`.
   - Check `Bypass two-factor authentication (2FA)` when publishing from the CLI
     without entering an OTP for every publish.
   - In `Packages and scopes`, choose `Read and write`.
   - Select `All packages` if publishing a package that does not exist on npm
     yet. A token scoped to zero packages cannot publish the first version.
   - Keep `Organizations` at `No access` unless managing org users, teams, or
     settings. npm organization token access does not grant package publish
     rights by itself.
   - Choose an expiration period. Short-lived tokens, such as 30 days, are
     preferred for local publishing.
   - Generate the token and copy it immediately. npm only shows the full token
     once.

3. Configure the token on the local machine:

   ```bash
   npm config set //registry.npmjs.org/:_authToken=<npm_token>
   pnpm whoami --registry=https://registry.npmjs.org/
   ```

Never commit `.npmrc`, tokens, npm debug logs, screenshots, or terminal output
that contains secrets.

## Versioning

npm never allows the same `name@version` to be published twice, even if the old
version is unpublished. If a publish command fails before npm accepts the
package, keep the version. If the package appears on npm, bump the version
before publishing again.

Check the currently published versions:

```bash
npm view @my-mind-node/core version --registry=https://registry.npmjs.org/
npm view @my-mind-node/react version --registry=https://registry.npmjs.org/
npm view @my-mind-node/importers version --registry=https://registry.npmjs.org/
npm view @my-mind-node/exporters version --registry=https://registry.npmjs.org/
```

For the next beta after `0.1.0-beta.0`, update all publishable package versions
to `0.1.0-beta.3`:

```text
packages/core/package.json
packages/react/package.json
packages/importers/package.json
packages/exporters/package.json
```

Keep the four versions aligned unless intentionally releasing only a subset of
packages.

## Pre-publish checks

Run the normal verification matrix before publishing:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm lint
pnpm bundle
git diff --check
```

Then inspect what npm would publish:

```bash
pnpm -r --filter './packages/*' publish \
  --dry-run \
  --access public \
  --tag beta \
  --registry=https://registry.npmjs.org/
```

The tarball contents should include `LICENSE`, `package.json`, and `dist/*`.
They should not include source maps or files you do not intend to ship unless
the package configuration explicitly allows them.

## Publish

Publish the beta packages:

```bash
pnpm -r --filter './packages/*' publish \
  --access public \
  --tag beta \
  --registry=https://registry.npmjs.org/
```

Use `--access public` because the packages are scoped packages. Use `--tag beta`
for prereleases so consumers do not get a beta through the default `latest` tag.

If publishing with an authenticator code instead of a bypass-2FA token, add
`--otp=<six_digit_code>`:

```bash
pnpm -r --filter './packages/*' publish \
  --access public \
  --tag beta \
  --registry=https://registry.npmjs.org/ \
  --otp=<six_digit_code>
```

If the OTP expires while publishing multiple packages, publish one package at a
time with a fresh OTP.

## Post-publish verification

Confirm the version and dist tags:

```bash
npm view @my-mind-node/core version dist-tags --registry=https://registry.npmjs.org/
npm view @my-mind-node/react version dist-tags --registry=https://registry.npmjs.org/
npm view @my-mind-node/importers version dist-tags --registry=https://registry.npmjs.org/
npm view @my-mind-node/exporters version dist-tags --registry=https://registry.npmjs.org/
```

Smoke install the beta in a temporary directory:

```bash
tmpdir="$(mktemp -d)"
cd "$tmpdir"
pnpm init
pnpm add @my-mind-node/core@beta @my-mind-node/react@beta
node -e "import('@my-mind-node/core').then((m) => console.log(Object.keys(m).length))"
```

When a beta is ready to become the default install target, either publish a
stable version without `--tag beta` or move the `latest` dist-tag intentionally:

```bash
npm dist-tag add @my-mind-node/core@<version> latest
npm dist-tag add @my-mind-node/react@<version> latest
npm dist-tag add @my-mind-node/importers@<version> latest
npm dist-tag add @my-mind-node/exporters@<version> latest
```

## Troubleshooting

### `E403` requiring 2FA or bypass 2FA

Create a granular access token with:

- `Bypass two-factor authentication (2FA)` checked
- `Packages and scopes`: `Read and write`
- `Select packages`: `All packages`

Then configure it with:

```bash
npm config set //registry.npmjs.org/:_authToken=<npm_token>
pnpm whoami --registry=https://registry.npmjs.org/
```

### `E403` scope or organization permission denied

Confirm the npm user owns or belongs to the `my-mind-node` organization and has
permission to publish packages under `@my-mind-node`.

### `E403` version already exists

Bump the version. npm cannot overwrite a published `name@version`.

### `npm warn Unknown user config "home"`

This warning comes from local npm config and does not block publishing. Clean up
the unsupported npm config later if it becomes noisy.

## References

- [Creating and viewing access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens/)
- [Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [npm publish CLI documentation](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
