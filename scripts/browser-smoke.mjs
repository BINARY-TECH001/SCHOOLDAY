/**
 * Browser smoke review of the Expo mobile target using Chrome DevTools Protocol.
 * Run with Expo web on :8085 and a disposable Chrome debugger on :9223.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const targets = await (await fetch("http://127.0.0.1:9223/json")).json();
const page = targets.find(
  (t) => t.type === "page" && !t.url.startsWith("chrome://"),
);
if (!page)
  throw new Error("Start headless Chrome with --remote-debugging-port=9223");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) =>
  ws.addEventListener("open", resolve, { once: true }),
);
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.method === "Runtime.exceptionThrown")
    console.error("Browser exception:", JSON.stringify(data.params));
  const job = pending.get(data.id);
  if (job) {
    pending.delete(data.id);
    data.error
      ? job.reject(new Error(data.error.message))
      : job.resolve(data.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const wait = async (text) => {
  const until = Date.now() + 240000;
  while (Date.now() < until) {
    try {
      if (
        await evaluate(
          "document.body?.innerText.includes(" + JSON.stringify(text) + ")",
        )
      )
        return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    "Missing expected text: " +
      text +
      "\n" +
      (await evaluate("document.body?.innerText")),
  );
};
const click = async (label) => {
  await evaluate(
    `(() => { const el = [...document.querySelectorAll('[role="button"],[role="tab"]')].find(x => x.getAttribute('aria-label') === ${JSON.stringify(label)}); if(!el)throw new Error('Button missing: '+${JSON.stringify(label)}); el.click(); })()`,
  );
};
const navigate = async (path) => {
  await send("Page.navigate", {
    url: (process.env.SCHOOLDAY_URL ?? "http://localhost:8085") + path,
  });
};
const input = async (label, value) =>
  evaluate(
    `(() => { const el = document.querySelector('input[aria-label='+${JSON.stringify(JSON.stringify(label))}+'],textarea[aria-label='+${JSON.stringify(JSON.stringify(label))}+']'); if(!el)throw new Error('Input missing'); const setter = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set; setter.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`,
  );

const shot = async (name) => {
  await mkdir("docs/screenshots", { recursive: true });
  const result = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(
    "docs/screenshots/" + name + ".png",
    Buffer.from(result.data, "base64"),
  );
};
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Storage.clearDataForOrigin", {
  origin: process.env.SCHOOLDAY_URL ?? "http://localhost:8085",
  storageTypes: "local_storage",
});
await navigate("/");
await wait("A brighter");
await shot("onboarding-redesign");
const cta = await evaluate(
  `(() => { const r=document.querySelector('[aria-label="Get started"]').getBoundingClientRect(); return {bottom:r.bottom,top:r.top,height:innerHeight}; })()`,
);
assert(
  cta.bottom <= cta.height && cta.top > cta.height * 0.7,
  "Onboarding CTA should stay near the bottom",
);
await wait("Make room");
console.log("PASS full-screen onboarding, anchored CTA, automatic carousel");
await click("Pause slideshow");
await click("Go to slide 3");
await wait("Crystal clear");
await click("Get started");
await wait("Good to have");
await shot("login-redesign");
await click("Switch to create account");
await wait("Your name");
await input("Your name", "Review User");
await input("Email address", "review@example.invalid");
await input("Password", "not-a-real-password");
await click("Create account");
await wait("Your place");
await click("Parent");
await click("Continue");
await wait("Find your school");
await click("Cedar Grove School");
await wait("Your children");
assert(
  !(await evaluate("JSON.stringify(localStorage)")).includes(
    "not-a-real-password",
  ),
  "Password must never be persisted",
);
await shot("parent-home-redesign");
const nav = await evaluate(`document.querySelectorAll('[role="tab"]').length`);
assert.equal(nav, 4, "Four destinations plus the central action button");
await click("Quick actions");
await wait("A little shortcut");
await shot("quick-actions-parent");
await click("Pay school fees");
await wait("Choose your invoices");
await evaluate(
  `document.querySelector('[aria-label="Select cedar-INV-100"]').click()`,
);
await input("Amount in naira", "10000");
await click("Review payment");
await wait("Everything look right");
await click("Confirm preview payment");
await wait("Payment complete");
await shot("receipt-redesign");
console.log(
  "PASS account creation preview, five-slot navigation, quick actions and payment receipt",
);
const switchRole = async (role) => {
  await navigate("/account");
  await wait("Your place");
  await click(role);
  await click("Continue");
  await wait("Find your school");
  await click("Cedar Grove School");
  await wait("Hello,");
};
await navigate("/more");
await wait("Your space");
await click("Cedar Grove School");
await click("Horizon Academy");
await wait("Chinonso Balogun");
assert(
  !(await evaluate("document.body.innerText")).includes("Chinonso Okafor"),
);
console.log("PASS tenant switching");
await switchRole("Teacher");
await wait("Open attendance");
await shot("teacher-home-redesign");
await click("Quick actions");
await wait("Clock in");
await shot("quick-actions-staff");
await click("Clock in");
await wait("verification pending");
await click("Close quick actions");
await navigate("/more");
await wait("Preview settings");
await click("Preview settings");
await click("Offline simulation: OFF");
await wait("Offline simulation: ON");
await navigate("/home");
await wait("Open attendance");
await click("Quick actions");
await wait("Clock out");
await click("Clock out");
await wait("awaiting sync");
await click("Close quick actions");
await navigate("/attendance");
await wait("Waiting to sync");
await shot("attendance-redesign");
await navigate("/home");
await wait("Open attendance");
await click("Quick actions");
await click("Prepare a lesson");
await wait("Save draft on device");
await input("Subject", "Mathematics");
await input("Class", "Primary 4");
await input("Topic", "Fractions, made simple");
await input("Learning objectives", "Identify equivalent fractions.");
await input(
  "Lesson content",
  "Fold paper into halves and quarters, then compare the pieces.",
);
await click("Save draft on device");
await wait("Fractions, made simple");
await navigate("/lessons");
await wait("Fractions, made simple");
console.log(
  "PASS direct clock actions, offline state, new lesson shortcut and persistence",
);
await navigate("/home");
await wait("Open attendance");
await click("Quick actions");
await click("Request time off");
await wait("Submit leave request");
await input("Start date · YYYY-MM-DD", "2026-11-02");
await input("End date · YYYY-MM-DD", "2026-11-03");
await input("Reason (at least 10 characters)", "Family appointment scheduled");
await click("Submit leave request");
await wait("Waiting to sync");
await navigate("/more");
await wait("Preview settings");
await click("Preview settings");
await click("Offline simulation: ON");
await wait("Offline simulation: OFF");
await click("Sync preview records");
await wait("Local sync simulation complete");
await switchRole("HR manager");
await click("Quick actions");
await click("Review requests");
await wait("Approve request");
await click("Approve request");
await wait("Approved");
console.log("PASS leave quick action and HR approval");
await switchRole("Parent");
await navigate("/payroll");
await wait("Access unavailable");
for (const [role, expected] of [
  ["Staff", "My payslip"],
  ["Finance", "View finances"],
  ["Administrator", "Approvals"],
  ["School owner", "Approvals"],
]) {
  await switchRole(role);
  await wait(expected);
  await click("Quick actions");
  await wait("A little shortcut");
  await click("Close quick actions");
  console.log("PASS role: " + role);
}
await navigate("/");
await wait("Hello,");
await send("Emulation.setDeviceMetricsOverride", {
  width: 320,
  height: 640,
  deviceScaleFactor: 1,
  mobile: true,
});
await evaluate("localStorage.clear()");
await navigate("/");
await wait("A brighter");
await shot("onboarding-small");
const smallCTA = await evaluate(
  `document.querySelector('[aria-label="Get started"]').getBoundingClientRect().bottom <= innerHeight`,
);
assert(smallCTA, "Small-screen onboarding CTA visible");
console.log("PASS 320px onboarding");
ws.close();
console.log("Redesign smoke review complete.");
