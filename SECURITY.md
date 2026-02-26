# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

Only the latest version on `main` receives security fixes.

---

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Please report security issues via:

1. **GitHub Private Security Advisory** (preferred):
   Go to [Security → Advisories → New draft advisory](https://github.com/BardinConsulting/sudoku/security/advisories/new)

2. **Email**: contact@bardinconsulting.com
   Include `[SECURITY]` in the subject line.

Please include in your report:
- A description of the vulnerability
- Steps to reproduce
- Potential impact (data exposure, XSS, CSRF, etc.)
- A suggested fix if available

We aim to:
- Acknowledge receipt within **48 hours**
- Provide an initial assessment within **5 business days**
- Release a patch within **14 days** for critical issues

---

## Security Posture

This application is designed with security in mind:

### Client-side only
- **No server** processes user data — everything runs in the browser
- **No authentication** — no credentials, sessions, or tokens
- **No database** — no persistent storage beyond the user's own browser session
- **No user input transmitted** — grid count, difficulty, and generated grids never leave the device
- **PDF generated locally** — jsPDF runs in the browser; the file is never uploaded anywhere

### Dependency management
- Dependencies are kept minimal (Next.js, React, jsPDF, Tailwind)
- `npm audit` runs automatically every Monday via GitHub Actions
- Dependabot is configured to open PRs for dependency updates weekly

### Content Security
- No user-submitted content is rendered
- No `dangerouslySetInnerHTML` or `eval()` is used
- jsPDF is loaded dynamically (lazy import) to reduce the attack surface on initial page load

---

## Known Limitations

- The application has no Content Security Policy (CSP) header configured — this is planned as a future improvement (see TODO.md)
- No Subresource Integrity (SRI) hashes are configured for CDN assets (not applicable — no CDN is used)
