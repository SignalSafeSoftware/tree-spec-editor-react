# Security Policy

## Supported versions

Node.js 18 or newer (see `package.json` `engines`). Only the latest published release line receives security fixes.

## Reporting a vulnerability

Please report suspected security vulnerabilities **privately**. Do **not** open a public GitHub issue for security reports.

Email: security@signalsafe.software

Include a description, reproduction steps, affected versions, and impact if known. We aim to acknowledge reports within five business days.


## Security boundaries

This package provides a **headless React Flow canvas shell** for TreeSpec editing. It does not include Bootstrap, routing, or API clients.

- It renders and edits authoring data supplied by the host application via props and callbacks.
- The host application is responsible for authentication, authorization, persistence, server-side validation, and sanitizing any user-generated labels or hints before display.
- React Flow node/edge content should be treated as trusted authoring data unless the host validates it.
