const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const results = [];
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  page.on("pageerror", error => failures.push(error.message));

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: "PASS" });
    } catch (error) {
      results.push({ name, status: "FAIL", detail: error.message });
      failures.push(name + ": " + error.message);
    }
  }

  try {
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.reputixStartCheckout === "function", { timeout: 15000 });

    await check("Homepage loads without duplicate HTML IDs", async () => {
      const data = await page.locator("[id]").evaluateAll(nodes => {
        const ids = nodes.map(node => node.id);
        return { total: ids.length, unique: new Set(ids).size };
      });
      if (data.total !== data.unique) throw new Error("Duplicate IDs detected");
      if (!(await page.locator("#searchForm").count())) throw new Error("Search form missing");
    });

    await check("Public Reputix AI opens and closes", async () => {
      await page.locator("#reputixAiFab").click();
      await page.locator("#reputixAiModal").waitFor({ state: "visible" });
      await page.locator("#publicAiClose").click();
      await page.locator("#reputixAiModal").waitFor({ state: "hidden" });
    });

    await check("Owner sign-in and sign-up validate empty credentials", async () => {
      await page.locator("#accountAccessBtn").click();
      await page.locator("#ownerArea").waitFor({ state: "visible" });
      await page.locator("#ownerSignIn").click();
      await page.waitForFunction(() => /correo|email/i.test(document.querySelector("#ownerAuthMessage")?.textContent || ""));
      await page.locator("#ownerSignUp").click();
      await page.waitForFunction(() => /correo|email/i.test(document.querySelector("#ownerAuthMessage")?.textContent || ""));
    });

    await check("Password recovery explains that email is required", async () => {
      await page.locator("#ownerForgotPassword").click();
      await page.waitForFunction(() => /correo|email/i.test(document.querySelector("#ownerAuthMessage")?.textContent || ""));
    });

    await check("Basic checkout sends logged-out users to account access", async () => {
      await page.locator("#basicCheckoutButton").click();
      await page.waitForFunction(() => /inicia sesión|sign in/i.test(document.querySelector("#basicCheckoutStatus")?.textContent || ""), { timeout: 8000 });
    });

    await check("Owner plans button points to an existing plans section", async () => {
      const exists = await page.locator("#reputixPlans").count();
      if (!exists) throw new Error("#reputixPlans anchor missing");
    });

    await page.goto("http://127.0.0.1:4173/mapa.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.L && !!document.querySelector("#map"), { timeout: 15000 });

    await check("Map category filters and reset control respond", async () => {
      const smoke = page.locator('#filters [data-category="smoke"]');
      await smoke.click();
      if (!(await smoke.evaluate(el => el.classList.contains("active")))) throw new Error("Smoke filter did not become active");
      await page.locator("#resetView").click();
    });

    if (failures.length) {
      console.error(JSON.stringify({ results, pageErrors: failures }, null, 2));
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify({ results, pageErrors: [] }, null, 2));
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
