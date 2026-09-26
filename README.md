# Cursor_Projects

A minimal [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
starter used to bootstrap this repository and its Cloud Agent development
environment.

## Prerequisites

- Node.js 22+ and npm (the Cloud Agent base image already provides these)

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

## Available scripts

| Script            | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server (host `0.0.0.0`, port `5173`) |
| `npm run build`   | Type-check with `tsc -b` and build for production        |
| `npm run preview` | Preview the production build (port `4173`)              |
| `npm run lint`    | Lint the codebase with [oxlint](https://oxc.rs/)        |

## Cloud Agent environment

The environment is defined in [`.cursor/environment.json`](.cursor/environment.json):

- `install`: runs `npm install` after the repository is checked out.
- `terminals`: runs `npm run dev` as a persistent, inspectable dev server.

The dev server binds to `0.0.0.0:5173` (see [`vite.config.ts`](vite.config.ts))
so it is reachable for previews and testing.
