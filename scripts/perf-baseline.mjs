import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { launch as launchChrome } from "chrome-launcher";
import puppeteer from "puppeteer-core";
import lighthouse from "lighthouse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const nextDir = path.join(projectRoot, ".next");
const outputDir = path.join(projectRoot, "reports", "performance");
const artifactsDir = path.join(outputDir, "artifacts");
const defaultPort = 4173;
const storeKey = "x-insights-store-v1";

const targets = {
  performance: 90,
  accessibility: 95,
  cls: 0.1,
  inpMs: 200
};

const demoContentRows = [
  {
    id: "1",
    text: "Shipped a new onboarding flow in 48 hours. Here are the lessons.",
    createdAt: "2025-01-06T15:00:00.000Z",
    impressions: 12450,
    likes: 420,
    replies: 36,
    reposts: 58,
    bookmarks: 24,
    shares: 10,
    profileVisits: 310,
    newFollows: 64
  },
  {
    id: "2",
    text: "Stop chasing engagement. Optimize for distribution instead.",
    createdAt: "2025-01-07T19:00:00.000Z",
    impressions: 18200,
    likes: 530,
    replies: 44,
    reposts: 90,
    bookmarks: 40,
    shares: 18,
    profileVisits: 410,
    newFollows: 92
  },
  {
    id: "3",
    text: "3 pricing mistakes I see founders make every week:",
    createdAt: "2025-01-08T13:00:00.000Z",
    impressions: 7600,
    likes: 210,
    replies: 19,
    reposts: 28,
    bookmarks: 14,
    shares: 6,
    profileVisits: 150,
    newFollows: 27
  },
  {
    id: "4",
    text: "A 5-minute teardown of a viral landing page. (Thread)",
    createdAt: "2025-01-09T22:00:00.000Z",
    impressions: 24800,
    likes: 760,
    replies: 62,
    reposts: 140,
    bookmarks: 68,
    shares: 22,
    profileVisits: 540,
    newFollows: 128
  }
];

const demoOverviewRows = [
  { date: "2025-01-06", impressions: 26500, engagements: 930, profileVisits: 520, newFollows: 120 },
  { date: "2025-01-07", impressions: 31200, engagements: 1240, profileVisits: 610, newFollows: 165 },
  { date: "2025-01-08", impressions: 21800, engagements: 760, profileVisits: 430, newFollows: 98 },
  { date: "2025-01-09", impressions: 34800, engagements: 1520, profileVisits: 720, newFollows: 190 }
];

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function ensureBuildArtifacts() {
  await runCommand(npmCommand(), ["run", "build"]);
}

async function waitForServer(url, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 302 || response.status === 307) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

function startNextServer(port) {
  const child = spawn(npmCommand(), ["run", "start", "--", "-p", String(port)], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  return child;
}

async function stopProcess(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        shell: false
      });
      killer.once("exit", () => resolve());
      setTimeout(() => resolve(), 5000);
    });
    return;
  }

  await new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => resolve(), 5000);
  });
}

function parseRscManifestSource(source) {
  const jsonMatch = source.match(/=\s*(\{[\s\S]*\});?\s*$/);
  if (!jsonMatch) {
    throw new Error("Unable to parse RSC manifest source");
  }
  return JSON.parse(jsonMatch[1]);
}

function normalizeChunkPath(chunkPath) {
  if (chunkPath.startsWith("/_next/")) {
    return chunkPath.replace("/_next/", "");
  }
  return chunkPath;
}

async function readRouteRscManifest(routeFile, routeKey) {
  const fullPath = path.join(nextDir, "server", "app", ...routeFile.split("/"));
  const source = await fs.readFile(fullPath, "utf8");
  const parsed = parseRscManifestSource(source);
  if (parsed && typeof parsed === "object" && "clientModules" in parsed) {
    return parsed;
  }

  const entry = parsed[routeKey];
  if (!entry) {
    throw new Error(`Manifest entry "${routeKey}" was not found in ${routeFile}`);
  }
  return entry;
}

async function getFileSizeBytes(relativePath) {
  const normalized = normalizeChunkPath(relativePath);
  const fullPath = path.join(nextDir, normalized);
  const content = await fs.readFile(fullPath);
  return {
    rawBytes: content.length,
    gzipBytes: gzipSync(content).length
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function computeBundleSizes() {
  const buildManifestPath = path.join(nextDir, "build-manifest.json");
  const buildManifest = JSON.parse(await fs.readFile(buildManifestPath, "utf8"));
  const sharedFiles = new Set(
    [...(buildManifest.rootMainFiles ?? []), ...(buildManifest.polyfillFiles ?? [])].map(
      normalizeChunkPath
    )
  );

  const homeManifest = await readRouteRscManifest("page_client-reference-manifest.js", "/page");
  const dashboardManifest = await readRouteRscManifest("dashboard/page_client-reference-manifest.js", "/dashboard/page");

  function collectRouteFiles(entryManifest, entryKeyHint) {
    const fromClientModules = Object.values(entryManifest.clientModules ?? {})
      .flatMap((item) => item.chunks ?? [])
      .filter((chunk) => chunk.endsWith(".js"))
      .map(normalizeChunkPath);
    const entryJsFiles = Object.entries(entryManifest.entryJSFiles ?? {})
      .filter(([key]) => key.includes(entryKeyHint) || key.includes("/app/layout"))
      .flatMap(([, files]) => files ?? [])
      .filter((chunk) => chunk.endsWith(".js"))
      .map(normalizeChunkPath);

    return new Set([...fromClientModules, ...entryJsFiles]);
  }

  const homeFiles = collectRouteFiles(homeManifest, "/app/page");
  const dashboardFiles = collectRouteFiles(dashboardManifest, "/app/dashboard/page");

  async function summarize(files) {
    const shared = [...sharedFiles];
    const routeSpecific = [...files].filter((file) => !sharedFiles.has(file));
    const all = Array.from(new Set([...shared, ...routeSpecific]));

    const sharedSizes = await Promise.all(shared.map(getFileSizeBytes));
    const routeSizes = await Promise.all(routeSpecific.map(getFileSizeBytes));
    const allSizes = await Promise.all(all.map(getFileSizeBytes));

    const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);

    return {
      files: all,
      sharedFiles: shared,
      routeFiles: routeSpecific,
      sharedRawBytes: sum(sharedSizes, "rawBytes"),
      sharedGzipBytes: sum(sharedSizes, "gzipBytes"),
      routeRawBytes: sum(routeSizes, "rawBytes"),
      routeGzipBytes: sum(routeSizes, "gzipBytes"),
      totalRawBytes: sum(allSizes, "rawBytes"),
      totalGzipBytes: sum(allSizes, "gzipBytes")
    };
  }

  return {
    "/": await summarize(homeFiles),
    "/dashboard": await summarize(dashboardFiles)
  };
}

async function seedDashboardData(browserWSEndpoint, baseUrl) {
  const browser = await puppeteer.connect({ browserWSEndpoint });
  try {
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const payload = {
      state: {
        contentRows: demoContentRows,
        overviewRows: demoOverviewRows,
        contentFileName: "baseline_demo_content.csv",
        overviewFileName: "baseline_demo_overview.csv",
        contentMissingOptional: [],
        overviewMissingOptional: []
      },
      version: 0
    };
    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: storeKey, value: payload }
    );
    await page.close();
  } finally {
    await browser.disconnect();
  }
}

function readAuditValue(audits, ...keys) {
  for (const key of keys) {
    const audit = audits[key];
    if (audit && typeof audit.numericValue === "number") {
      return { value: audit.numericValue, key };
    }
  }
  return { value: null, key: null };
}

function evaluateTargets(result) {
  const perfPass = result.performanceScore >= targets.performance;
  const a11yPass = result.accessibilityScore >= targets.accessibility;
  const clsPass = result.cls !== null ? result.cls < targets.cls : false;
  const inpPass = result.inpMs !== null ? result.inpMs < targets.inpMs : false;

  return {
    performance: perfPass,
    accessibility: a11yPass,
    cls: clsPass,
    inp: inpPass,
    overall: perfPass && a11yPass && clsPass && inpPass
  };
}

async function runLighthouseAudit(url, chromePort, options = {}) {
  const runnerResult = await lighthouse(
    url,
    {
      port: chromePort,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      emulatedFormFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 2.625,
        disabled: false
      },
      disableStorageReset: options.disableStorageReset ?? false
    },
    null
  );

  if (!runnerResult?.lhr) {
    throw new Error(`Lighthouse did not return an LHR for ${url}`);
  }

  const lhr = runnerResult.lhr;
  const audits = lhr.audits;

  const fcp = readAuditValue(audits, "first-contentful-paint").value;
  const lcp = readAuditValue(audits, "largest-contentful-paint").value;
  const cls = readAuditValue(audits, "cumulative-layout-shift").value;
  const inpAudit = readAuditValue(
    audits,
    "interaction-to-next-paint",
    "experimental-interaction-to-next-paint",
    "max-potential-fid"
  );
  const tbt = readAuditValue(audits, "total-blocking-time").value;
  const tti = readAuditValue(audits, "interactive").value;

  const result = {
    requestedUrl: url,
    finalUrl: lhr.finalUrl,
    lighthouseVersion: lhr.lighthouseVersion,
    fetchTime: lhr.fetchTime,
    performanceScore: Math.round((lhr.categories.performance.score ?? 0) * 100),
    accessibilityScore: Math.round((lhr.categories.accessibility.score ?? 0) * 100),
    bestPracticesScore: Math.round((lhr.categories["best-practices"].score ?? 0) * 100),
    seoScore: Math.round((lhr.categories.seo.score ?? 0) * 100),
    fcpMs: fcp,
    lcpMs: lcp,
    cls,
    inpMs: inpAudit.value,
    inpAuditSource: inpAudit.key,
    tbtMs: tbt,
    ttiMs: tti
  };

  return {
    summary: result,
    rawLhr: lhr
  };
}

function renderMs(value) {
  if (value === null || value === undefined) return "n/a";
  return `${Math.round(value)} ms`;
}

function renderNumber(value, digits = 2) {
  if (value === null || value === undefined) return "n/a";
  return Number(value).toFixed(digits);
}

function buildMarkdownReport(timestamp, audits, bundles) {
  const routes = ["/", "/dashboard"];
  const lines = [];
  lines.push("# Performance Baseline");
  lines.push("");
  lines.push(`Generated: ${timestamp}`);
  lines.push("");
  lines.push("## Targets");
  lines.push("");
  lines.push(`- Mobile Lighthouse Performance >= ${targets.performance}`);
  lines.push(`- Mobile Lighthouse Accessibility >= ${targets.accessibility}`);
  lines.push(`- CLS < ${targets.cls}`);
  lines.push(`- INP < ${targets.inpMs} ms`);
  lines.push("");
  lines.push("## Route Scorecard");
  lines.push("");
  lines.push("| Route | Perf | A11y | CLS | INP | Overall |");
  lines.push("| --- | ---: | ---: | ---: | ---: | --- |");

  routes.forEach((route) => {
    const routeAudit = audits[route];
    const targetStatus = evaluateTargets(routeAudit);
    lines.push(
      `| ${route} | ${routeAudit.performanceScore} | ${routeAudit.accessibilityScore} | ${renderNumber(routeAudit.cls, 3)} | ${renderMs(routeAudit.inpMs)} | ${targetStatus.overall ? "PASS" : "FAIL"} |`
    );
  });

  lines.push("");
  lines.push("## Web Vitals + Interaction Timings");
  lines.push("");
  lines.push("| Route | FCP | LCP | CLS | INP | TBT | TTI |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");

  routes.forEach((route) => {
    const routeAudit = audits[route];
    lines.push(
      `| ${route} | ${renderMs(routeAudit.fcpMs)} | ${renderMs(routeAudit.lcpMs)} | ${renderNumber(routeAudit.cls, 3)} | ${renderMs(routeAudit.inpMs)} | ${renderMs(routeAudit.tbtMs)} | ${renderMs(routeAudit.ttiMs)} |`
    );
  });

  lines.push("");
  lines.push("## Bundle Size (Client JS)");
  lines.push("");
  lines.push("| Route | Shared JS (raw/gzip) | Route JS (raw/gzip) | Total JS (raw/gzip) |");
  lines.push("| --- | ---: | ---: | ---: |");

  routes.forEach((route) => {
    const bundle = bundles[route];
    lines.push(
      `| ${route} | ${formatBytes(bundle.sharedRawBytes)} / ${formatBytes(bundle.sharedGzipBytes)} | ${formatBytes(bundle.routeRawBytes)} / ${formatBytes(bundle.routeGzipBytes)} | ${formatBytes(bundle.totalRawBytes)} / ${formatBytes(bundle.totalGzipBytes)} |`
    );
  });

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- `/dashboard` is audited with seeded local storage demo data to avoid redirecting back to `/`.");
  lines.push("- INP uses Lighthouse audit `interaction-to-next-paint` when available, otherwise fallback audit is recorded in JSON.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function ensureDirectories() {
  await fs.mkdir(artifactsDir, { recursive: true });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort, maxAttempts = 40) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    const free = await isPortFree(candidate);
    if (free) {
      return candidate;
    }
  }
  throw new Error(`No available port found from ${startPort} within ${maxAttempts} attempts`);
}

async function main() {
  await ensureDirectories();
  await ensureBuildArtifacts();

  const port = await findAvailablePort(defaultPort);
  const baseUrl = `http://localhost:${port}`;
  const nextServer = startNextServer(port);
  let chrome;

  try {
    await waitForServer(baseUrl);

    chrome = await launchChrome({
      chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"]
    });

    const versionResponse = await fetch(`http://127.0.0.1:${chrome.port}/json/version`);
    if (!versionResponse.ok) {
      throw new Error("Unable to resolve Chrome websocket endpoint");
    }
    const versionJson = await versionResponse.json();
    const browserWSEndpoint = versionJson.webSocketDebuggerUrl;

    const homeAudit = await runLighthouseAudit(`${baseUrl}/`, chrome.port, {
      disableStorageReset: false
    });

    await seedDashboardData(browserWSEndpoint, baseUrl);

    const dashboardAudit = await runLighthouseAudit(`${baseUrl}/dashboard`, chrome.port, {
      disableStorageReset: true
    });

    const bundleSummary = await computeBundleSizes();
    const timestamp = new Date().toISOString();
    const stamp = timestamp.replace(/[:.]/g, "-");

    const summary = {
      generatedAt: timestamp,
      targets,
      routes: {
        "/": {
          ...homeAudit.summary,
          targetStatus: evaluateTargets(homeAudit.summary)
        },
        "/dashboard": {
          ...dashboardAudit.summary,
          targetStatus: evaluateTargets(dashboardAudit.summary)
        }
      },
      bundles: bundleSummary
    };

    await fs.writeFile(
      path.join(artifactsDir, `lighthouse-home-${stamp}.json`),
      JSON.stringify(homeAudit.rawLhr, null, 2),
      "utf8"
    );
    await fs.writeFile(
      path.join(artifactsDir, `lighthouse-dashboard-${stamp}.json`),
      JSON.stringify(dashboardAudit.rawLhr, null, 2),
      "utf8"
    );
    await fs.writeFile(
      path.join(outputDir, `baseline-summary-${stamp}.json`),
      JSON.stringify(summary, null, 2),
      "utf8"
    );
    await fs.writeFile(
      path.join(outputDir, `baseline-summary-${stamp}.md`),
      buildMarkdownReport(timestamp, summary.routes, summary.bundles),
      "utf8"
    );
    await fs.writeFile(path.join(outputDir, "baseline-latest.json"), JSON.stringify(summary, null, 2), "utf8");
    await fs.writeFile(
      path.join(outputDir, "baseline-latest.md"),
      buildMarkdownReport(timestamp, summary.routes, summary.bundles),
      "utf8"
    );

    process.stdout.write(
      `\nBaseline captured.\n- ${path.relative(projectRoot, path.join(outputDir, "baseline-latest.md"))}\n- ${path.relative(projectRoot, path.join(outputDir, "baseline-latest.json"))}\n`
    );
  } finally {
    if (chrome) {
      await chrome.kill();
    }
    await stopProcess(nextServer);
  }
}

main().catch((error) => {
  process.stderr.write(`\nperf:baseline failed: ${error.stack || error.message}\n`);
  process.exit(1);
});
