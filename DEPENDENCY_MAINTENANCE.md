# Dependency Maintenance Guide

This guide explains how to properly maintain npm dependencies in your project, including handling security vulnerabilities and keeping packages up to date.

## Understanding npm Warnings

When you run `npm install`, you may see warnings about:
- **Moderate vulnerabilities**: Security issues that should be addressed but aren't critical
- **High vulnerabilities**: Security issues that should be addressed promptly
- **Outdated packages**: Packages with newer versions available

## Regular Maintenance Workflow

### 1. Check for Security Vulnerabilities

Run npm audit to see all security issues:

```bash
# Frontend
cd frontend
npm audit

# Backend
cd backend
npm audit
```

### 2. Fix Security Vulnerabilities

#### Option A: Automatic Fixes (Recommended First Step)
```bash
# Frontend
cd frontend
npm audit fix

# Backend
cd backend
npm audit fix
```

This automatically updates packages to versions that fix vulnerabilities, **without breaking changes**.

#### Option B: Force Fixes (More Aggressive)
```bash
# Frontend
cd frontend
npm audit fix --force

# Backend
cd backend
npm audit fix --force
```

⚠️ **Warning**: `--force` may introduce breaking changes. Test thoroughly after using this.

#### Option C: Manual Updates
If automatic fixes don't work, manually update specific packages:

```bash
# Example: Update axios to latest version
npm install axios@latest

# Or update to a specific version
npm install axios@^1.7.0
```

### 3. Check for Outdated Packages

```bash
# Frontend
cd frontend
npm outdated

# Backend
cd backend
npm outdated
```

This shows:
- **Current**: Version installed
- **Wanted**: Version matching your `package.json` range (e.g., `^1.6.2`)
- **Latest**: Latest available version

### 4. Update Packages Strategically

#### Minor/Patch Updates (Safe)
Update packages within their version range:

```bash
# Update all packages to latest within their semver range
npm update
```

#### Major Updates (Requires Testing)
For major version updates, update packages individually and test:

```bash
# Example: Update Vue from 3.3.x to 3.4.x (if available)
npm install vue@^3.4.0

# Then test your application thoroughly
npm run dev
```

#### Update All to Latest (Use with Caution)
```bash
# Install npm-check-updates globally
npm install -g npm-check-updates

# Check what would be updated
ncu

# Update package.json (but don't install yet)
ncu -u

# Review changes, then install
npm install
```

## Best Practices

### 1. Regular Maintenance Schedule

- **Weekly**: Run `npm audit` to check for new vulnerabilities
- **Monthly**: Review and update outdated packages
- **Quarterly**: Review major version updates

### 2. Version Pinning Strategy

Your `package.json` uses semantic versioning ranges:

- **`^1.6.2`** (caret): Allows minor and patch updates (1.6.2 → 1.7.0, but not 2.0.0)
- **`~1.6.2`** (tilde): Allows only patch updates (1.6.2 → 1.6.3, but not 1.7.0)
- **`1.6.2`** (exact): No updates allowed

**Recommendation**: Use `^` for most packages to get security patches automatically.

### 3. Security-First Approach

1. **Always fix high/critical vulnerabilities first**
2. **Test after each update** (especially major versions)
3. **Keep a changelog** of dependency updates
4. **Review breaking changes** before major updates

### 4. Production vs Development Dependencies

- **`dependencies`**: Required for production (e.g., `vue`, `axios`)
- **`devDependencies`**: Only needed for development (e.g., `eslint`, `typescript`)

Keep them separate and only update `devDependencies` when needed.

## Common Commands Reference

```bash
# Check vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check outdated packages
npm outdated

# Update packages within semver range
npm update

# Install specific version
npm install package-name@version

# Install latest version
npm install package-name@latest

# Remove unused packages
npm prune

# Clean install (remove node_modules and reinstall)
rm -rf node_modules package-lock.json
npm install
```

## Handling Specific Warnings

### "npm WARN deprecated"
A package you're using is deprecated. Steps:
1. Check the package's GitHub/npm page for migration guide
2. Find an alternative package if available
3. Plan migration timeline

### "npm WARN peer dependency"
A package expects another package to be installed. Steps:
1. Install the missing peer dependency
2. Or use `--legacy-peer-deps` flag (not recommended long-term)

### "npm WARN invalid package-lock.json"
The lock file is out of sync. Steps:
1. Delete `package-lock.json`
2. Run `npm install` to regenerate it

## Automated Maintenance

### Using GitHub Dependabot (Recommended)

Add `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

This automatically creates PRs for dependency updates.

## Testing After Updates

Always test after updating dependencies:

```bash
# Frontend
cd frontend
npm run build:check  # Type check and build
npm run lint         # Lint code
npm run dev          # Test locally

# Backend
cd backend
npm run build        # Build
npm run lint         # Lint code
npm run test         # Run tests (if you have them)
npm run start:dev    # Test locally
```

## When to Update

### Update Immediately:
- Critical security vulnerabilities
- High severity vulnerabilities affecting your code

### Update Soon:
- Moderate security vulnerabilities
- Bug fixes in packages you actively use

### Update When Convenient:
- Minor version updates
- Performance improvements
- New features you want to use

### Update Carefully:
- Major version updates (test thoroughly)
- Framework updates (Vue, NestJS, etc.)

## Troubleshooting

### "Cannot find module" after update
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Build errors after update
1. Check package changelog for breaking changes
2. Review migration guides
3. Consider rolling back: `npm install package-name@previous-version`

### Conflicting peer dependencies
```bash
# Check what's conflicting
npm ls package-name

# May need to update related packages together
npm install package-a@latest package-b@latest
```

## Current Project Status

To check your current dependency status:

```bash
# Frontend
cd frontend
npm audit
npm outdated

# Backend
cd backend
npm audit
npm outdated
```

## Summary

1. **Regular audits**: Run `npm audit` weekly
2. **Auto-fix first**: Try `npm audit fix` before manual updates
3. **Test thoroughly**: Always test after updates
4. **Document changes**: Note major updates in your commit messages
5. **Stay informed**: Subscribe to security advisories for critical packages

