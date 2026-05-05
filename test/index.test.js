import test from "node:test";
import assert from "node:assert/strict";
import {
  getSystemInfo,
  formatDuration,
  formatMarkdown,
  formatText,
  makePublicInfo
} from "../src/index.js";

test("gets detailed system info", async () => {
  const info = await getSystemInfo({ public: true });
  assert.ok(info.operatingSystem);
  assert.ok(info.cpu);
  assert.ok(info.memory);
  assert.ok(info.gpu);
  assert.ok(info.storage);
  assert.ok(info.packageManagers);
  assert.ok(info.developerTools);
});

test("formats duration", () => {
  assert.equal(formatDuration(60), "1m");
  assert.equal(formatDuration(3600), "1h 0m");
  assert.equal(formatDuration(90000), "1d 1h 0m");
});

test("formats markdown", async () => {
  const info = await getSystemInfo({ public: true });
  const md = formatMarkdown(info);
  assert.ok(md.includes("## System Info"));
  assert.ok(md.includes("### CPU"));
  assert.ok(md.includes("### Storage"));
});

test("formats text", async () => {
  const info = await getSystemInfo({ public: true });
  const text = formatText(info);
  assert.ok(text.includes("System"));
  assert.ok(text.includes("Graphics"));
  assert.ok(text.includes("Developer Tools"));
});

test("redacts public info", () => {
  const redacted = makePublicInfo({
    privacyMode: false,
    summary: { deviceName: "secret-host" },
    operatingSystem: { hostname: "secret-host" },
    runtime: { execPath: "/secret/node", pid: 123 },
    shell: { name: "/Users/test/.zshrc", cwd: "/secret", terminal: "Terminal" },
    bios: { serial: "123" },
    motherboard: { serial: "456" },
    network: [{ interface: "eth0", family: "IPv4", address: "192.168.1.1", mac: "aa:bb:cc", internal: false }],
    environment: { SECRET: "value" }
  });

  assert.equal(redacted.privacyMode, true);
  assert.equal(redacted.operatingSystem.hostname, "[redacted]");
  assert.equal(redacted.runtime.execPath, "[redacted]");
  assert.equal(redacted.network[0].address, "[redacted]");
  assert.deepEqual(redacted.environment, {});
});
