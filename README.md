# systemdetails

A detailed privacy-friendly system information CLI and JavaScript library.

`systemdetails` is designed for tech support, GitHub issues, Discord troubleshooting, PC repair intake, and diagnostics. By default, it hides sensitive information so you can share specs without accidentally leaking hostnames, paths, IP addresses, MAC addresses, serial numbers, or shell paths.

## Install

```bash
npm install -g systemdetails
```

Or run instantly:

```bash
npx systemdetails
```

## Usage

```bash
systemdetails
```

## Output formats

```bash
systemdetails
systemdetails --markdown
systemdetails --json
systemdetails --compact
```

## More details

Full mode:

```bash
systemdetails --full
```

Network details:

```bash
systemdetails --network
systemdetails --full --network
```

Environment details:

```bash
systemdetails --full --env
```

## What it reports

`systemdetails` attempts to report:

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
systemdetails --public
```

Full mode includes more details:

```bash
systemdetails --full
```

Use full mode only when you trust where you are posting the output.

## JavaScript API

```js
import { getSystemInfo, formatMarkdown } from "systemdetails";

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
https://github.com/ethantphillips/systemdetails
```

## License

MIT
