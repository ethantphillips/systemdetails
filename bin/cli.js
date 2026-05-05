#!/usr/bin/env node
import { getSystemInfo, formatText, formatMarkdown, formatJson, makePublicInfo } from "../src/index.js";
import fs from "node:fs";

main();

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printHelp();
      return;
    }

    if (args.version) {
      printVersion();
      return;
    }

    const info = await getSystemInfo({
      public: !args.full,
      full: args.full,
      includeNetwork: args.network,
      includeEnv: args.env,
      timeout: args.timeout
    });

    const finalInfo = args.full ? info : makePublicInfo(info);

    let output;
    if (args.json) output = formatJson(finalInfo);
    else if (args.markdown) output = formatMarkdown(finalInfo);
    else output = formatText(finalInfo, { compact: args.compact });

    console.log(output);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error("Run `mysystem --help` for usage.");
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const args = {
    full: false,
    json: false,
    markdown: false,
    compact: false,
    network: false,
    env: false,
    timeout: 3000
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--version":
      case "-v":
        args.version = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--markdown":
      case "--md":
        args.markdown = true;
        break;
      case "--public":
        args.full = false;
        break;
      case "--full":
        args.full = true;
        break;
      case "--compact":
        args.compact = true;
        break;
      case "--network":
        args.network = true;
        break;
      case "--env":
        args.env = true;
        break;
      case "--timeout":
        args.timeout = Number(requireValue(argv, ++i, arg));
        validateTimeout(args.timeout);
        break;
      default:
        if (arg.startsWith("--timeout=")) {
          args.timeout = Number(arg.split("=")[1]);
          validateTimeout(args.timeout);
        } else {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  if (args.json && args.markdown) throw new Error("Use either --json or --markdown, not both.");
  return args;
}

function validateTimeout(value) {
  if (!Number.isFinite(value) || value < 250) throw new Error("--timeout must be at least 250 milliseconds.");
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (value === undefined || value.startsWith("-")) throw new Error(`${flag} requires a value.`);
  return value;
}

function printVersion() {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  console.log(pkg.version);
}

function printHelp() {
  console.log(`mysystem

A detailed privacy-friendly system information CLI.

Usage:
  mysystem [options]

Examples:
  mysystem
  mysystem --markdown
  mysystem --json
  mysystem --full
  mysystem --network
  mysystem --full --network --env
  mysystem --compact

Options:
  --public          Hide sensitive details. Default.
  --full            Include fuller details such as hostname, shell, paths, IPs, MACs, and allowed environment info.
  --json            Output JSON.
  --markdown, --md  Output Markdown for support tickets, Discord, GitHub issues, etc.
  --compact         Shorter text output.
  --network         Include network interfaces. Redacted unless --full is used.
  --env             Include a small allowlist of environment details. Only shown with --full.
  --timeout <ms>    Timeout for platform-specific hardware checks. Default: 3000.
  --version, -v     Show version.
  --help, -h        Show help.

Details included:
  OS, kernel/build, uptime, CPU, RAM, GPU, storage, motherboard, BIOS,
  battery, displays, package managers, developer tools, Node runtime,
  optional network info, and optional environment info.

Privacy:
  By default, mysystem redacts hostnames, paths, IP addresses, MAC addresses,
  serial numbers, shell paths, and environment details. Use --full only when
  you trust where you are posting the output.
`);
}
