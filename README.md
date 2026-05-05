# mysystem

A detailed privacy-friendly system information CLI and JavaScript library.

`mysystem` is designed for tech support, GitHub issues, Discord troubleshooting, PC repair intake, and diagnostics. By default, it hides sensitive information so you can share specs without accidentally leaking hostnames, paths, IP addresses, MAC addresses, serial numbers, or shell paths.

## Install

```bash
npm install -g mysystem
```

Or run instantly:

```bash
npx mysystem
```

## Usage

```bash
mysystem
```

## Output formats

```bash
mysystem
mysystem --markdown
mysystem --json
mysystem --compact
```

## More details

Full mode:

```bash
mysystem --full
```

Network details:

```bash
mysystem --network
mysystem --full --network
```

Environment details:

```bash
mysystem --full --env
```

## What it reports

`mysystem` attempts to report:

- OS name, version, kernel/release, build, uptime
- CPU model, logical cores, speed, manufacturer, physical core details when available
- RAM total, used, free, usage percentage, and module details when available
- GPU name, VRAM, and driver where available
- Storage model, size, media type, and interface where available
- Motherboard and BIOS information
- Battery information
- Display information
- Node, npm, pnpm, yarn
- Git, Docker, Python, Java
- Optional network interfaces
- Optional environment details

Some details depend on your operating system and installed system tools.

## Privacy

Public mode is the default:

```bash
mysystem --public
```

Full mode includes more details:

```bash
mysystem --full
```

Use full mode only when you trust where you are posting the output.

## JavaScript API

```js
import { getSystemInfo, formatMarkdown } from "mysystem";

const info = await getSystemInfo({
  public: true
});

console.log(formatMarkdown(info));
```

## Publish checklist

```bash
npm test
npm pack --dry-run
npm login
npm publish --access public
```

For updates:

```bash
npm version patch
npm publish
```

## Repository

```txt
https://github.com/ethantphillips/mysystem
```

## License

MIT
