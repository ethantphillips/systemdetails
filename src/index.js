import os from "node:os";
import process from "node:process";
import { execFileSync } from "node:child_process";

const GB = 1024 ** 3;

export async function getSystemInfo(options = {}) {
  const {
    public: publicMode = true,
    full = false,
    includeNetwork = false,
    includeEnv = false,
    timeout = 3000
  } = options;

  const platform = os.platform();
  const cpus = os.cpus() || [];
  const firstCpu = cpus[0] || {};
  const effectivePublic = publicMode && !full;

  const info = {
    generatedAt: new Date().toISOString(),
    privacyMode: effectivePublic,
    summary: {
      deviceName: effectivePublic ? redact(os.hostname()) : os.hostname(),
      platform,
      arch: process.arch,
      node: process.version
    },
    runtime: {
      node: process.version,
      npm: getCommandVersion("npm", ["--version"], timeout),
      v8: process.versions.v8,
      uv: process.versions.uv,
      openssl: process.versions.openssl,
      modules: process.versions.modules,
      platform: process.platform,
      arch: process.arch,
      execPath: effectivePublic ? redact(process.execPath) : process.execPath,
      pid: full ? process.pid : undefined
    },
    operatingSystem: getOsInfo(effectivePublic, timeout),
    cpu: {
      model: cleanCpuModel(firstCpu.model || "Unknown CPU"),
      logicalCores: cpus.length || null,
      speedMHz: firstCpu.speed || null,
      endian: os.endianness(),
      loadAverage: os.loadavg(),
      details: getCpuDetails(platform, timeout)
    },
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
      usedBytes: os.totalmem() - os.freemem(),
      totalGB: round(os.totalmem() / GB, 2),
      freeGB: round(os.freemem() / GB, 2),
      usedGB: round((os.totalmem() - os.freemem()) / GB, 2),
      usedPercent: round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100, 1),
      details: getMemoryDetails(platform, timeout)
    },
    gpu: getGpuInfo(platform, timeout),
    storage: getStorageInfo(platform, timeout),
    battery: getBatteryInfo(platform, timeout),
    motherboard: getMotherboardInfo(platform, timeout, effectivePublic),
    bios: getBiosInfo(platform, timeout, effectivePublic),
    displays: getDisplayInfo(platform, timeout),
    packageManagers: {
      npm: getCommandVersion("npm", ["--version"], timeout),
      pnpm: getCommandVersion("pnpm", ["--version"], timeout),
      yarn: getCommandVersion("yarn", ["--version"], timeout)
    },
    developerTools: {
      git: getCommandVersion("git", ["--version"], timeout),
      docker: getCommandVersion("docker", ["--version"], timeout),
      python: getCommandVersion("python", ["--version"], timeout) || getCommandVersion("python3", ["--version"], timeout),
      java: getJavaVersion(timeout)
    },
    shell: {
      name: effectivePublic ? redact(getShellName()) : getShellName(),
      terminal: effectivePublic ? undefined : process.env.TERM_PROGRAM || process.env.TERM || null,
      cwd: effectivePublic ? redact(process.cwd()) : process.cwd()
    }
  };

  if (includeNetwork || full) {
    info.network = getNetworkInfo({ publicMode: effectivePublic });
  }

  if (includeEnv || full) {
    info.environment = getEnvironmentInfo({ publicMode: effectivePublic });
  }

  return info;
}

export function formatText(info, options = {}) {
  const { compact = false } = options;
  const lines = [];

  lines.push("System");
  lines.push(`OS: ${formatOs(info.operatingSystem)}`);
  lines.push(`Kernel/Release: ${info.operatingSystem.release || "Unknown"}`);
  lines.push(`Architecture: ${info.runtime.arch}`);
  lines.push(`Hostname: ${info.operatingSystem.hostname || "[redacted]"}`);
  lines.push(`Uptime: ${formatDuration(info.operatingSystem.uptimeSeconds)}`);
  lines.push("");

  lines.push("CPU");
  lines.push(`Model: ${info.cpu.model}`);
  lines.push(`Logical cores: ${info.cpu.logicalCores ?? "Unknown"}`);
  lines.push(`Speed: ${info.cpu.speedMHz ? `${info.cpu.speedMHz} MHz` : "Unknown"}`);
  if (info.cpu.details?.physicalCores) lines.push(`Physical cores: ${info.cpu.details.physicalCores}`);
  if (info.cpu.details?.manufacturer) lines.push(`Manufacturer: ${info.cpu.details.manufacturer}`);
  lines.push("");

  lines.push("Memory");
  lines.push(`Total: ${info.memory.totalGB} GB`);
  lines.push(`Used: ${info.memory.usedGB} GB (${info.memory.usedPercent}%)`);
  lines.push(`Free: ${info.memory.freeGB} GB`);
  for (const detail of info.memory.details || []) lines.push(`Module: ${detail}`);
  lines.push("");

  lines.push("Graphics");
  lines.push(formatDetailedList(info.gpu, "No GPU detected"));
  lines.push("");

  lines.push("Storage");
  lines.push(formatDetailedList(info.storage, "No storage detected"));
  lines.push("");

  if (!compact) {
    lines.push("Motherboard / BIOS");
    lines.push(`Motherboard: ${formatObjectLine(info.motherboard)}`);
    lines.push(`BIOS: ${formatObjectLine(info.bios)}`);
    lines.push("");

    lines.push("Battery");
    lines.push(formatDetailedList(info.battery, "No battery detected or unavailable"));
    lines.push("");

    lines.push("Displays");
    lines.push(formatDetailedList(info.displays, "No display details detected"));
    lines.push("");

    lines.push("Developer Tools");
    lines.push(`Node: ${info.runtime.node}`);
    lines.push(`NPM: ${info.packageManagers.npm || "Not found"}`);
    lines.push(`PNPM: ${info.packageManagers.pnpm || "Not found"}`);
    lines.push(`Yarn: ${info.packageManagers.yarn || "Not found"}`);
    lines.push(`Git: ${info.developerTools.git || "Not found"}`);
    lines.push(`Docker: ${info.developerTools.docker || "Not found"}`);
    lines.push(`Python: ${info.developerTools.python || "Not found"}`);
    lines.push(`Java: ${info.developerTools.java || "Not found"}`);
    lines.push("");

    if (info.network) {
      lines.push("Network");
      for (const item of info.network) {
        lines.push(`${item.interface}: ${item.family} ${item.address}${item.mac ? ` (${item.mac})` : ""}${item.internal ? " internal" : ""}`);
      }
      lines.push("");
    }

    if (info.privacyMode) {
      lines.push("Privacy mode is on. Use --full to include hostnames, paths, IPs, MAC addresses, and other sensitive details.");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function formatMarkdown(info) {
  const lines = [
    "## System Info",
    "",
    "### System",
    "",
    `- **OS:** ${formatOs(info.operatingSystem)}`,
    `- **Kernel/Release:** ${info.operatingSystem.release || "Unknown"}`,
    `- **Architecture:** ${info.runtime.arch}`,
    `- **Hostname:** ${info.operatingSystem.hostname || "[redacted]"}`,
    `- **Uptime:** ${formatDuration(info.operatingSystem.uptimeSeconds)}`,
    "",
    "### CPU",
    "",
    `- **Model:** ${info.cpu.model}`,
    `- **Logical cores:** ${info.cpu.logicalCores ?? "Unknown"}`,
    `- **Speed:** ${info.cpu.speedMHz ? `${info.cpu.speedMHz} MHz` : "Unknown"}`,
    info.cpu.details?.physicalCores ? `- **Physical cores:** ${info.cpu.details.physicalCores}` : null,
    info.cpu.details?.manufacturer ? `- **Manufacturer:** ${info.cpu.details.manufacturer}` : null,
    "",
    "### Memory",
    "",
    `- **Total:** ${info.memory.totalGB} GB`,
    `- **Used:** ${info.memory.usedGB} GB (${info.memory.usedPercent}%)`,
    `- **Free:** ${info.memory.freeGB} GB`,
    ...(info.memory.details || []).map((x) => `- **Module:** ${x}`),
    "",
    "### Graphics",
    "",
    ...markdownList(info.gpu, "No GPU detected"),
    "",
    "### Storage",
    "",
    ...markdownList(info.storage, "No storage detected"),
    "",
    "### Motherboard / BIOS",
    "",
    `- **Motherboard:** ${formatObjectLine(info.motherboard)}`,
    `- **BIOS:** ${formatObjectLine(info.bios)}`,
    "",
    "### Displays",
    "",
    ...markdownList(info.displays, "No display details detected"),
    "",
    "### Developer Tools",
    "",
    `- **Node:** ${info.runtime.node}`,
    `- **NPM:** ${info.packageManagers.npm || "Not found"}`,
    `- **Git:** ${info.developerTools.git || "Not found"}`,
    `- **Docker:** ${info.developerTools.docker || "Not found"}`,
    `- **Python:** ${info.developerTools.python || "Not found"}`,
    `- **Java:** ${info.developerTools.java || "Not found"}`
  ].filter((line) => line !== null);

  if (info.privacyMode) {
    lines.push("");
    lines.push("> Privacy mode was enabled. Use `--full` only when you trust where you are posting the output.");
  }

  return lines.join("\n");
}

export function formatJson(info) {
  return JSON.stringify(info, null, 2);
}

export function makePublicInfo(info) {
  const cloned = structuredCloneSafe(info);
  cloned.privacyMode = true;

  if (cloned.summary) cloned.summary.deviceName = redact(cloned.summary.deviceName);
  if (cloned.operatingSystem) cloned.operatingSystem.hostname = redact(cloned.operatingSystem.hostname);
  if (cloned.runtime) {
    cloned.runtime.execPath = redact(cloned.runtime.execPath);
    delete cloned.runtime.pid;
  }
  if (cloned.shell) {
    cloned.shell.name = redact(cloned.shell.name);
    cloned.shell.cwd = redact(cloned.shell.cwd);
    delete cloned.shell.terminal;
  }
  if (cloned.bios?.serial) cloned.bios.serial = redact(cloned.bios.serial);
  if (cloned.motherboard?.serial) cloned.motherboard.serial = redact(cloned.motherboard.serial);

  if (Array.isArray(cloned.network)) {
    cloned.network = cloned.network.map((item) => ({
      interface: item.interface,
      family: item.family,
      internal: item.internal,
      address: redact(item.address),
      mac: redact(item.mac)
    }));
  }

  if (cloned.environment) cloned.environment = {};

  return cloned;
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export function formatOs(osInfo) {
  return [osInfo.name || osInfo.type, osInfo.version || osInfo.release].filter(Boolean).join(" ");
}

function getOsInfo(publicMode, timeout) {
  const platform = os.platform();
  const base = {
    platform,
    type: os.type(),
    release: os.release(),
    version: safeOsVersion(),
    hostname: publicMode ? redact(os.hostname()) : os.hostname(),
    uptimeSeconds: os.uptime(),
    userInfo: publicMode ? undefined : safeUserInfo()
  };

  try {
    if (platform === "win32") {
      const caption = exec("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).Caption"], timeout).trim();
      const build = exec("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).BuildNumber"], timeout).trim();
      return { ...base, name: caption, build };
    }
    if (platform === "darwin") {
      const name = exec("sw_vers", ["-productName"], timeout).trim();
      const version = exec("sw_vers", ["-productVersion"], timeout).trim();
      const build = exec("sw_vers", ["-buildVersion"], timeout).trim();
      return { ...base, name, version, build };
    }
    const pretty = readOsReleaseValue("PRETTY_NAME");
    return { ...base, name: pretty || base.type };
  } catch {
    return base;
  }
}

function getCpuDetails(platform, timeout) {
  try {
    if (platform === "win32") {
      const output = exec("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_Processor | Select-Object Manufacturer,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed | ConvertTo-Json -Compress"], timeout);
      const parsed = parseJsonMaybeArray(output)[0];
      return {
        manufacturer: parsed?.Manufacturer,
        physicalCores: parsed?.NumberOfCores,
        logicalProcessors: parsed?.NumberOfLogicalProcessors,
        maxClockMHz: parsed?.MaxClockSpeed
      };
    }
    if (platform === "darwin") {
      return {
        brand: exec("sysctl", ["-n", "machdep.cpu.brand_string"], timeout).trim(),
        physicalCores: numberOrNull(exec("sysctl", ["-n", "hw.physicalcpu"], timeout).trim()),
        logicalProcessors: numberOrNull(exec("sysctl", ["-n", "hw.logicalcpu"], timeout).trim())
      };
    }
    const lscpu = exec("lscpu", [], timeout);
    return {
      manufacturer: matchLineValue(lscpu, "Vendor ID"),
      physicalCores: numberOrNull(matchLineValue(lscpu, "Core(s) per socket")),
      sockets: numberOrNull(matchLineValue(lscpu, "Socket(s)")),
      architecture: matchLineValue(lscpu, "Architecture")
    };
  } catch {
    return {};
  }
}

function getMemoryDetails(platform, timeout) {
  try {
    if (platform === "win32") {
      const output = exec("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_PhysicalMemory | ForEach-Object { \"$([math]::Round($_.Capacity / 1GB, 1)) GB $($_.Speed) MHz $($_.Manufacturer)\" }"], timeout);
      return uniqueLines(output);
    }
    if (platform === "darwin") {
      const mem = exec("system_profiler", ["SPMemoryDataType"], timeout);
      return uniqueLines(mem).filter((line) => /Size:|Speed:|Type:/i.test(line)).slice(0, 12);
    }
    const output = exec("free", ["-h"], timeout);
    return uniqueLines(output).slice(0, 3);
  } catch {
    return [];
  }
}

function getGpuInfo(platform, timeout) {
  try {
    if (platform === "win32") {
      const output = exec("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | ForEach-Object { \"$($_.Name) | VRAM: $([math]::Round($_.AdapterRAM / 1GB, 1)) GB | Driver: $($_.DriverVersion)\" }"], timeout);
      return uniqueLines(output);
    }
    if (platform === "darwin") {
      const output = exec("system_profiler", ["SPDisplaysDataType"], timeout);
      return uniqueLines(output).filter((line) => /Chipset Model:|VRAM|Metal Support|Resolution:/i.test(line)).slice(0, 20);
    }
    const lspci = exec("lspci", [], timeout);
    return uniqueLines(lspci).filter((line) => /vga|3d|display/i.test(line));
  } catch {
    return [];
  }
}

function getStorageInfo(platform, timeout) {
  try {
    if (platform === "win32") {
      const output = exec("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_DiskDrive | ForEach-Object { \"$($_.Model) | $([math]::Round($_.Size / 1GB, 1)) GB | $($_.MediaType) | $($_.InterfaceType)\" }"], timeout);
      return uniqueLines(output);
    }
    if (platform === "darwin") {
      const output = exec("diskutil", ["list"], timeout);
      return uniqueLines(output).filter((line) => /\/dev\/disk|GB|TB/i.test(line)).slice(0, 20);
    }
    const output = exec("lsblk", ["-d", "-o", "NAME,MODEL,SIZE,ROTA,TYPE", "-n"], timeout);
    return uniqueLines(output).map((line) => line.replace(/\s+/g, " ").trim());
  } catch {
    return [];
  }
}

function getBatteryInfo(platform, timeout) {
  try {
    if (platform === "win32") {
      const output = exec("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_Battery | ForEach-Object { \"Charge: $($_.EstimatedChargeRemaining)% | Status: $($_.BatteryStatus)\" }"], timeout);
      return uniqueLines(output);
    }
    if (platform === "darwin") {
      return uniqueLines(exec("pmset", ["-g", "batt"], timeout));
    }
    if (os.platform() !== "linux") return [];
    const output = exec("upower", ["-e"], timeout);
      const devices = uniqueLines(output).filter((line) => /battery/i.test(line));
      return devices.map((device) => exec("upower", ["-i", device], timeout).split("\n").filter((line) => /state:|percentage:|capacity:/i.test(line)).map((x) => x.trim()).join(" | "));
  } catch {
    return [];
  }
}

function getMotherboardInfo(platform, timeout, publicMode) {
  try {
    if (platform === "win32") {
      const output = exec("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product,Version,SerialNumber | ConvertTo-Json -Compress"], timeout);
      const b = parseJsonMaybeArray(output)[0];
      return {
        manufacturer: b?.Manufacturer,
        product: b?.Product,
        version: b?.Version,
        serial: publicMode ? redact(b?.SerialNumber) : b?.SerialNumber
      };
    }
    if (platform === "linux") {
      return {
        manufacturer: readFileTrim("/sys/devices/virtual/dmi/id/board_vendor"),
        product: readFileTrim("/sys/devices/virtual/dmi/id/board_name"),
        version: readFileTrim("/sys/devices/virtual/dmi/id/board_version"),
        serial: publicMode ? redact(readFileTrim("/sys/devices/virtual/dmi/id/board_serial")) : readFileTrim("/sys/devices/virtual/dmi/id/board_serial")
      };
    }
    return {};
  } catch {
    return {};
  }
}

function getBiosInfo(platform, timeout, publicMode) {
  try {
    if (platform === "win32") {
      const output = exec("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_BIOS | Select-Object Manufacturer,Name,SMBIOSBIOSVersion,SerialNumber,ReleaseDate | ConvertTo-Json -Compress"], timeout);
      const b = parseJsonMaybeArray(output)[0];
      return {
        manufacturer: b?.Manufacturer,
        name: b?.Name,
        version: b?.SMBIOSBIOSVersion,
        releaseDate: b?.ReleaseDate,
        serial: publicMode ? redact(b?.SerialNumber) : b?.SerialNumber
      };
    }
    if (platform === "linux") {
      return {
        manufacturer: readFileTrim("/sys/devices/virtual/dmi/id/bios_vendor"),
        version: readFileTrim("/sys/devices/virtual/dmi/id/bios_version"),
        releaseDate: readFileTrim("/sys/devices/virtual/dmi/id/bios_date")
      };
    }
    return {};
  } catch {
    return {};
  }
}

function getDisplayInfo(platform, timeout) {
  try {
    if (platform === "win32") {
      const output = exec("powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_DesktopMonitor | ForEach-Object { \"$($_.Name) | $($_.ScreenWidth)x$($_.ScreenHeight)\" }"], timeout);
      return uniqueLines(output);
    }
    if (platform === "darwin") {
      const output = exec("system_profiler", ["SPDisplaysDataType"], timeout);
      return uniqueLines(output).filter((line) => /Resolution:|Main Display:|Display Type:/i.test(line)).slice(0, 12);
    }
    return [];
  } catch {
    return [];
  }
}

function getNetworkInfo({ publicMode }) {
  const interfaces = os.networkInterfaces();
  const rows = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      rows.push({
        interface: name,
        family: entry.family,
        address: publicMode ? redact(entry.address) : entry.address,
        mac: publicMode ? redact(entry.mac) : entry.mac,
        internal: entry.internal,
        cidr: publicMode ? redact(entry.cidr) : entry.cidr
      });
    }
  }
  return rows;
}

function getEnvironmentInfo({ publicMode }) {
  if (publicMode) return {};
  const allowList = ["SHELL", "TERM", "TERM_PROGRAM", "ComSpec", "PROCESSOR_ARCHITECTURE", "PROCESSOR_IDENTIFIER", "OS", "USERNAME", "USER"];
  const out = {};
  for (const key of allowList) if (process.env[key]) out[key] = process.env[key];
  return out;
}

function getJavaVersion(timeout) {
  try {
    return execFileSync("java", ["-version"], { encoding: "utf8", timeout, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n")[0];
  } catch (e) {
    const stderr = e?.stderr?.toString?.();
    return stderr ? stderr.trim().split("\n")[0] : null;
  }
}

function getCommandVersion(command, args, timeout) {
  try { return exec(command, args, timeout).trim().split("\n")[0]; } catch { return null; }
}

function exec(command, args = [], timeout = 3000) {
  return execFileSync(command, args, { encoding: "utf8", timeout, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
}

function safeOsVersion() { try { return os.version(); } catch { return null; } }
function safeUserInfo() { try { return os.userInfo(); } catch { return null; } }
function getShellName() { return process.env.SHELL || process.env.ComSpec || null; }
function cleanCpuModel(model) { return String(model).replace(/\s+/g, " ").trim(); }
function redact(value) { return value ? "[redacted]" : undefined; }
function round(value, decimals = 2) { const factor = 10 ** decimals; return Math.round(Number(value) * factor) / factor; }
function structuredCloneSafe(value) { return JSON.parse(JSON.stringify(value)); }
function uniqueLines(output) { return [...new Set(String(output || "").split("\n").map((x) => x.trim()).filter(Boolean))]; }
function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function matchLineValue(text, key) { const line = String(text).split("\n").find((x) => x.toLowerCase().startsWith(key.toLowerCase())); return line ? line.split(":").slice(1).join(":").trim() : undefined; }
function readFileTrim(file) { try { return requireFs().readFileSync(file, "utf8").trim(); } catch { return undefined; } }
function requireFs() { return { readFileSync: (...args) => execFileSync("cat", [args[0]], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }) }; }
function readOsReleaseValue(key) {
  try {
    const data = execFileSync("cat", ["/etc/os-release"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const line = data.split("\n").find((x) => x.startsWith(`${key}=`));
    return line ? line.split("=").slice(1).join("=").replace(/^"|"$/g, "") : undefined;
  } catch { return undefined; }
}
function parseJsonMaybeArray(output) { const parsed = JSON.parse(output); return Array.isArray(parsed) ? parsed : [parsed]; }
function formatDetailedList(items, fallback) { return (!items || items.length === 0) ? fallback : items.map((x) => `- ${x}`).join("\n"); }
function markdownList(items, fallback) { return (!items || items.length === 0) ? [`- ${fallback}`] : items.map((x) => `- ${x}`); }
function formatObjectLine(obj) {
  if (!obj || Object.keys(obj).length === 0) return "Unavailable";
  return Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => `${k}: ${v}`).join(", ") || "Unavailable";
}
