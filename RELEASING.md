# Release Process

This document describes the automated release process for MCP DadosBR.

## Overview

The project uses an automated release workflow that handles:
- Version validation
- Test execution
- Changelog generation
- GitHub Release creation
- NPM publication
- Cloudflare Workers deployment

## Release Types

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):
- **Major (X.0.0)**: Breaking changes
- **Minor (0.X.0)**: New features (backward compatible)
- **Patch (0.0.X)**: Bug fixes (backward compatible)

### Pre-releases

Pre-release versions can include tags like:
- `alpha` - Early development versions
- `beta` - Feature complete, testing phase
- `rc` (release candidate) - Final testing before stable
- `preview` - Preview/experimental features

Example: `v0.3.0-beta.1`

## Quick Start

### 1. Update Version in package.json

```bash
# Edit package.json and update the version field
# Example: "version": "0.3.0"
npm version 0.3.0 --no-git-tag-version
```

**Note**: The workflow automatically syncs versions to [`smithery.yaml`](smithery.yaml) during release.

Or use npm's built-in version commands:

```bash
# For a patch release (0.2.0 -> 0.2.1)
npm version patch --no-git-tag-version

# For a minor release (0.2.0 -> 0.3.0)
npm version minor --no-git-tag-version

# For a major release (0.2.0 -> 1.0.0)
npm version major --no-git-tag-version

# For a pre-release (0.2.0 -> 0.2.1-beta.0)
npm version prerelease --preid=beta --no-git-tag-version
```

### 2. Commit Changes

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to 0.3.0"
git push origin master
```

### 3. Create and Push Tag

```bash
# Create a git tag (must start with 'v')
git tag v0.3.0

# Push the tag to trigger the release workflow
git push origin v0.3.0
```

**Important**: The tag must match the version in package.json!

### 4. Monitor Release

Watch the GitHub Actions workflow:
- Go to: https://github.com/cristianoaredes/mcp-dadosbr/actions
- Click on the "Release & Publish" workflow
- Monitor the progress of all jobs

## Using Standard-Version (Alternative)

For a more automated approach, you can use standard-version locally:

```bash
# Install dependencies
npm install

# Dry run to see what would happen
npm run release:dry-run

# Create a patch release (0.2.0 -> 0.2.1)
npm run release:patch

# Create a minor release (0.2.0 -> 0.3.0)
npm run release:minor

# Create a major release (0.2.0 -> 1.0.0)
npm run release:major

# Auto-detect version bump based on commits
npm run release
```

Standard-version will:
1. Bump version in package.json
2. Update CHANGELOG.md
3. Create a git commit
4. Create a git tag

Then push:
```bash
git push --follow-tags origin master
```

## Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) for automatic changelog generation:

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature (triggers minor version bump)
- `fix`: Bug fix (triggers patch version bump)
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes

### Breaking Changes
Add `BREAKING CHANGE:` in the commit footer to trigger a major version bump:

```
feat: new authentication system

BREAKING CHANGE: The old auth API has been removed.
Users must migrate to the new OAuth-based system.
```

### Examples

```bash
# Feature (minor bump)
git commit -m "feat: add new search filter options"

# Bug fix (patch bump)
git commit -m "fix: resolve memory leak in cache system"

# Breaking change (major bump)
git commit -m "feat!: redesign API endpoints

BREAKING CHANGE: All endpoints now require authentication"

# Documentation
git commit -m "docs: update installation guide"

# With scope
git commit -m "feat(api): add pagination support"
```

## Release Workflow Details

### Jobs Executed

1. **Validate**
   - Extracts version from tag
   - Checks if it's a pre-release
   - Validates version matches package.json

2. **Test**
   - Runs on Node.js 18.x and 20.x
   - Executes unit tests
   - Builds Node.js and Worker targets
   - Runs integration tests

3. **Release**
   - Generates changelog using conventional-changelog
   - Updates CHANGELOG.md
   - Creates GitHub Release
   - Attaches CHANGELOG.md as asset

4. **Publish**
   - Publishes to NPM registry
   - Stable releases use `latest` tag
   - Pre-releases use `next` tag
   - Verifies publication

5. **Deploy Cloudflare**
   - Only for stable releases
   - Deploys to production environment
   - Verifies deployment health

6. **Summary**
   - Creates comprehensive release summary
   - Shows status of all jobs
   - Provides next steps

### Smithery Deployment

Smithery automatically deploys from git tags. When you push a version tag:

1. Smithery detects the new tag
2. Builds the MCP server from source
3. Deploys to Smithery registry
4. Makes it available for one-click installation

The workflow automatically updates [`smithery.yaml`](smithery.yaml) version to match package.json, ensuring consistency across all deployment platforms.

### Required Secrets

Ensure these secrets are configured in GitHub:
- `NPM_TOKEN`: NPM authentication token
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token (if using CF deployment)

## Testing Releases Locally

### Test Changelog Generation

```bash
# Install conventional-changelog-cli globally
npm install -g conventional-changelog-cli

# Generate changelog for current version
conventional-changelog -p angular -r 2

# Preview changelog update
conventional-changelog -p angular -i CHANGELOG.md -s --dry-run
```

### Test Build and Package

```bash
# Clean build
rm -rf build/ dist/

# Build both targets
npm run build
npm run build:worker

# Test package creation
npm pack

# Test installation from tarball
npm install -g ./aredes.me-mcp-dadosbr-0.3.0.tgz
```

### Test Integration

```bash
# Run full test suite
npm test

# Run integration tests
npm run test:integration

# Test stdio transport
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm start

# Test HTTP transport
MCP_TRANSPORT=http npm start &
sleep 3
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

## Rollback Procedures

### Rollback NPM Release

If you need to deprecate a bad release:

```bash
# Deprecate a version
npm deprecate @aredes.me/mcp-dadosbr@0.3.0 "This version has critical bugs, use 0.3.1 instead"

# Unpublish (only within 72 hours)
npm unpublish @aredes.me/mcp-dadosbr@0.3.0
```

### Rollback GitHub Release

1. Go to: https://github.com/cristianoaredes/mcp-dadosbr/releases
2. Find the release
3. Click "Edit release"
4. Mark as "Pre-release" or delete it

### Rollback Cloudflare Deployment

```bash
# List recent deployments
wrangler deployments list

# Rollback to previous deployment
wrangler rollback <deployment-id>
```

### Rollback Git Tag

```bash
# Delete local tag
git tag -d v0.3.0

# Delete remote tag
git push --delete origin v0.3.0
```

## Troubleshooting

### Version Mismatch Error

**Problem**: "Version mismatch between package.json and git tag"

**Solution**: Ensure the version in package.json matches the tag:
```bash
# If tag is v0.3.0, package.json must have "version": "0.3.0"
npm version 0.3.0 --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: fix version mismatch"
git push
```

### Tests Failing

**Problem**: Release workflow fails during test job

**Solution**: Run tests locally before creating tag:
```bash
npm test
npm run test:integration
npm run build
npm run build:worker
```

### NPM Publication Failed

**Problem**: "Failed to publish to NPM"

**Solutions**:
1. Check NPM_TOKEN secret is valid
2. Verify package name is available
3. Check if version already exists on NPM
4. Ensure you have publish permissions

### Cloudflare Deployment Failed

**Problem**: "Cloudflare Workers deployment failed"

**Solutions**:
1. Check CLOUDFLARE_API_TOKEN is valid
2. Verify wrangler.toml configuration
3. Check Cloudflare account has available Workers
4. Review deployment logs in GitHub Actions

### Changelog Not Updating

**Problem**: CHANGELOG.md not being updated

**Solutions**:
1. Ensure commits follow conventional commit format
2. Check for commits between current and previous tag
3. Verify .versionrc.json configuration
4. Review conventional-changelog-cli output

## Best Practices

### Pre-Release Checklist

- [ ] All tests passing locally
- [ ] Documentation updated
- [ ] CHANGELOG.md previewed
- [ ] Breaking changes documented
- [ ] Version number follows semver
- [ ] Commit messages follow conventional commits

### Release Day Checklist

- [ ] Create version bump commit
- [ ] Push commit to master
- [ ] Create and push git tag
- [ ] Monitor GitHub Actions workflow
- [ ] Verify NPM publication
- [ ] Test installation from NPM
- [ ] Check Cloudflare deployment
- [ ] Verify live endpoints
- [ ] Update documentation if needed
- [ ] Announce release (if major/minor)

### Post-Release Checklist

- [ ] Test package installation
- [ ] Verify live endpoints working
- [ ] Check for user-reported issues
- [ ] Monitor error rates
- [ ] Update marketing materials (if needed)

## Support

- **Issues**: https://github.com/cristianoaredes/mcp-dadosbr/issues
- **Discussions**: https://github.com/cristianoaredes/mcp-dadosbr/discussions
- **Email**: cristiano@aredes.me

## Additional Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Workers Deploy](https://developers.cloudflare.com/workers/platform/deployments/)