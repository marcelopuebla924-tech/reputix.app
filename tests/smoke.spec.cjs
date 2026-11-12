const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const results = [];
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  page.on("pageerror", error => failures.push(error.stack || error.message));

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
    await page.waitForFunction(() => typeof window.reputixStartCheckout === "function", null, { timeout: 15000 });

    await check("Homepage loads without duplicate HTML IDs", async () => {
      const data = await page.locator("[id]").evaluateAll(nodes => {
        const ids = nodes.map(node => node.id);
        return { total: ids.length, unique: new Set(ids).size };
      });
      if (data.total !== data.unique) throw new Error("Duplicate IDs detected");
      if (!(await page.locator("#searchForm").count())) throw new Error("Search form missing");
    });

    await check("Spanish and English language selector works without runtime errors", async () => {
      await page.locator("#language").selectOption("en");
      if (!(await page.locator("#plansTitle").textContent()).includes("plans")) throw new Error("English plan title did not update");
      if ((await page.locator("#ownerSubscriptionPlans").textContent()).trim() !== "View plans") throw new Error("English plan button label did not update");
      await page.locator("#language").selectOption("es");
      if (!(await page.locator("#plansTitle").textContent()).includes("Planes")) throw new Error("Spanish plan title did not update");
      if ((await page.locator("#ownerSubscriptionPlans").textContent()).trim() !== "Ver planes") throw new Error("Spanish plan button label did not update");
    });

    await check("Business search handles a query and restores its button", async () => {
      await page.locator("#business").fill("reputix-smoke-test-no-match-2026");
      await page.locator("#searchButton").click();
      await page.waitForFunction(() => {
        const button = document.querySelector("#searchButton");
        const notice = document.querySelector("#notice");
        return !!button && !button.disabled && !!notice && !/buscando|searching/i.test(notice.textContent || "");
      }, null, { timeout: 20000 });
    });

    await check("Business profile and reviews buttons open the review details", async () => {
      await page.locator("#business").fill("Tamos Chelo Smoke Shop");
      await page.locator("#searchButton").click();
      await page.waitForFunction(() => {
        const cards = document.querySelectorAll("#results .business-card");
        return cards.length > 0 && [...cards].some(card => /Tamos Chelo Smoke Shop/i.test(card.textContent || ""));
      }, null, { timeout: 15000 });
      const card = page.locator("#results .business-card").filter({ hasText: "Tamos Chelo Smoke Shop" }).first();
      await card.locator(".actions button.primary").click();
      await card.locator("section.details").first().waitFor({ state: "visible" });
      const reviewForm = card.locator(".details form").first();
      if (await reviewForm.locator('select[name="cleanliness"]').count() !== 1) throw new Error("Review criteria form missing");
      if (await reviewForm.locator('input[name="visit_date"]').count() !== 1) throw new Error("Visit date field missing");
      await card.locator(".actions button.secondary").click();
      await card.locator("section.details").first().waitFor({ state: "visible" });
    });

    await check("Owner claim submission preserves the session and confirms the request", async () => {
      const claimPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      claimPage.on("pageerror", error => failures.push(error.stack || error.message));
      await claimPage.route("**/rest/v1/**", async route => {
        const request = route.request();
        const url = request.url();
        if (request.method() === "POST" && url.includes("/business_owner_claims")) {
          await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "qa-claim-id" }]) });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
      });
      await claimPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      await claimPage.waitForFunction(() => typeof window.ownerSetSession === "function", null, { timeout: 15000 });
      await claimPage.evaluate(() => window.ownerSetSession({
        access_token: "qa-mocked-access-token",
        refresh_token: "qa-mocked-refresh-token",
        user: { id: "00000000-0000-4000-8000-000000000001", email: "qa@example.invalid", app_metadata: {} }
      }));
      await claimPage.locator("#claimBusinessOpen").waitFor({ state: "visible" });
      await claimPage.waitForTimeout(500);
      await claimPage.locator("#claimBusiness").evaluate(el => { el.value = "00000000-0000-4000-8000-000000000002"; });
      await claimPage.locator("#claimEvidence").fill("QA simulation only. I am authorized to manage this test business.");
      const postResponse = claimPage.waitForResponse(response =>
        response.url().includes("/rest/v1/business_owner_claims") && response.request().method() === "POST"
      );
      await claimPage.locator("#ownerClaimForm").evaluate(form => form.requestSubmit());
      await postResponse;
      await claimPage.waitForTimeout(300);
      const claimMessage = (await claimPage.locator("#ownerClaimMessage").textContent()) || "";
      if (!/solicitud recibida|request received/i.test(claimMessage)) {
        throw new Error("Unexpected claim confirmation message: " + claimMessage);
      }
      const session = await claimPage.evaluate(() => JSON.parse(sessionStorage.getItem("reputix_owner_session") || "null"));
      if (session?.access_token !== "qa-mocked-access-token") throw new Error("Owner session was not preserved");
      await claimPage.close();
    });

    await check("Customer and verified-owner workspaces stay separate and owner tools require a verified claim", async () => {
      const workspacePage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      workspacePage.on("pageerror", error => failures.push(error.stack || error.message));
      let verified = true;
      await workspacePage.route("**/rest/v1/**", async route => {
        const request = route.request();
        const url = request.url();
        if (url.includes("/business_owner_claims") && request.method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(verified ? [{
              id: "qa-verified-claim",
              business_id: "00000000-0000-4000-8000-000000000005",
              status: "verified"
            }] : [])
          });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
      });
      await workspacePage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      await workspacePage.waitForFunction(() => typeof window.ownerSetSession === "function", null, { timeout: 15000 });
      const testSession = {
        access_token: "qa-mocked-workspace-token",
        refresh_token: "qa-mocked-workspace-refresh",
        user: { id: "00000000-0000-4000-8000-000000000006", email: "workspace-qa@example.invalid", app_metadata: {} }
      };
      await workspacePage.evaluate(session => window.ownerSetSession(session), testSession);
      await workspacePage.waitForFunction(() => {
        const panel = document.querySelector("#ownerToolsSection");
        return !!panel && !panel.hidden;
      }, null, { timeout: 8000 });
      const separation = await workspacePage.evaluate(() => {
        const customer = document.querySelector(".customer-module-group");
        const owner = document.querySelector("#ownerToolsSection");
        return {
          customerProfile: !!customer?.querySelector("#privateProfileTitle"),
          customerMessages: !!customer?.querySelector("#privateMessagesTitle"),
          customerComplaints: !!customer?.querySelector("#privateComplaintsTitle"),
          customerPosts: !!customer?.querySelector("#privatePostsTitle"),
          customerHasNoOwnerBusiness: !customer?.querySelector("#privateBusinessTitle"),
          ownerBusiness: !!owner?.querySelector("#privateBusinessTitle"),
          ownerReviews: !!owner?.querySelector("#privateReviewsTitle"),
          ownerHasNoCustomerMessages: !owner?.querySelector("#privateMessagesTitle")
        };
      });
      if (Object.values(separation).some(value => !value)) throw new Error("Customer/owner module separation failed: " + JSON.stringify(separation));
      verified = false;
      await workspacePage.evaluate(session => window.ownerSetSession(null), testSession);
      await workspacePage.evaluate(session => window.ownerSetSession(session), testSession);
      await workspacePage.waitForFunction(() => {
        const panel = document.querySelector("#ownerToolsSection");
        return !!panel && panel.hidden;
      }, null, { timeout: 8000 });
      await workspacePage.close();
    });

    await check("Admin moderation and advertising controls work with mocked data", async () => {
      const adminPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      adminPage.on("pageerror", error => failures.push(error.stack || error.message));
      await adminPage.route("**/rest/v1/**", async route => {
        if (route.request().method() === "POST" && route.request().url().includes("/ad_campaigns")) {
          await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
      });
      await adminPage.route("**/functions/v1/reputix-ai", async route => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], count: 0 }) });
      });
      await adminPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      await adminPage.waitForFunction(() => typeof window.ownerSetSession === "function", null, { timeout: 15000 });
      await adminPage.evaluate(() => window.ownerSetSession({
        access_token: "qa-mocked-admin-token",
        refresh_token: "qa-mocked-admin-refresh",
        user: {
          id: "00000000-0000-4000-8000-000000000003",
          email: "admin-qa@example.invalid",
          app_metadata: { reputix_role: "admin" }
        }
      }));
      await adminPage.locator("#adminAdsPanel").waitFor({ state: "visible" });
      await adminPage.locator("#adminReviewModerationPanel").waitFor({ state: "visible" });
      await adminPage.locator("#adminReviewModerationRefresh").click();
      await adminPage.locator("#adsRefreshButton").click();
      await adminPage.locator("#adsBusiness").evaluate(el => {
        const option = document.createElement("option");
        option.value = "00000000-0000-4000-8000-000000000004";
        option.textContent = "QA Mock Business";
        el.append(option);
        el.value = option.value;
      });
      await adminPage.locator("#adsTitle").fill("QA Mock Campaign");
      await adminPage.locator("#adsDescription").fill("Simulated campaign. No real billing.");
      const adPost = adminPage.waitForResponse(response =>
        response.url().includes("/rest/v1/ad_campaigns") && response.request().method() === "POST"
      );
      await adminPage.locator("#adsCreateButton").click();
      await adPost;
      await adminPage.waitForFunction(() => /campaña creada y enviada a revisión/i.test(document.querySelector("#adsAdminMessage")?.textContent || ""), null, { timeout: 8000 });
      await adminPage.close();
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
      await page.waitForFunction(() => /inicia sesión|sign in/i.test(document.querySelector("#basicCheckoutStatus")?.textContent || ""), null, { timeout: 8000 });
      await page.locator("#proCheckoutButton").click();
      await page.waitForFunction(() => /inicia sesión|sign in/i.test(document.querySelector("#proCheckoutStatus")?.textContent || ""), null, { timeout: 8000 });
    });

    await check("Owner plans button scrolls to the existing plans section", async () => {
      await page.locator("#privateSpace").evaluate(el => { el.hidden = false; });
      await page.locator("#ownerSubscriptionCard").evaluate(el => { el.hidden = false; });
      await page.locator("#ownerSubscriptionPlans").click();
      await page.waitForFunction(() => {
        const target = document.querySelector("#reputixPlans");
        return !!target && Math.abs(target.getBoundingClientRect().top) < window.innerHeight;
      });
    });

    await check("Business and professional proposal buttons open the correct form", async () => {
      await page.locator("#independentHeaderBtn").click();
      await page.locator("#communityFormWrap form").waitFor({ state: "visible" });
      await page.locator("#addBusinessChoice").click();
      const businessOptions = await page.locator('#communityFormWrap select[name="category"] option').allTextContents();
      if (businessOptions.length < 2) throw new Error("Business categories did not load");
      await page.locator("#addProChoice").click();
      const professionalOptions = await page.locator('#communityFormWrap select[name="category"] option').allTextContents();
      if (professionalOptions.length < 2) throw new Error("Professional categories did not load");
    });

    await check("Reviews and statistics feature buttons open their sections", async () => {
      await page.locator("#featureReviews").click();
      await page.waitForFunction(() => {
        const target = document.querySelector("#reviewTickerPanel");
        return !!target && Math.abs(target.getBoundingClientRect().top) < window.innerHeight;
      }, null, { timeout: 8000 });
      await page.locator("#featureStats").click();
      await page.waitForFunction(() => {
        const panel = document.querySelector("#advancedStatsDashboard");
        return !!panel && !panel.hidden;
      }, null, { timeout: 8000 });
    });

    await check("Business claim picker opens and closes without submitting a claim", async () => {
      await page.locator("#ownerClaimArea").evaluate(el => { el.hidden = false; });
      await page.locator("#claimBusinessOpen").click();
      await page.locator("#claimBusinessModal").waitFor({ state: "visible" });
      await page.locator("#claimBusinessSearch").fill("Tamos Chelo");
      await page.locator("#claimBusinessClose").click();
      await page.locator("#claimBusinessModal").waitFor({ state: "hidden" });
    });

    await page.goto("http://127.0.0.1:4173/mapa.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.L && !!document.querySelector("#map"), null, { timeout: 15000 });

    await check("Map category filters and reset control respond", async () => {
      const smoke = page.locator('#filters [data-category="smoke"]');
      await smoke.click();
      if (!(await smoke.evaluate(el => el.classList.contains("active")))) throw new Error("Smoke filter did not become active");
      await page.locator("#resetView").click();
    });

    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });
    mobile.on("pageerror", error => failures.push(error.stack || error.message));
    await mobile.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await mobile.waitForFunction(() => typeof window.reputixStartCheckout === "function", null, { timeout: 15000 });

    await check("Mobile AI and account access controls respond to touch", async () => {
      await mobile.locator("#reputixAiFab").click();
      await mobile.locator("#reputixAiModal").waitFor({ state: "visible" });
      await mobile.locator("#publicAiClose").click();
      await mobile.locator("#reputixAiModal").waitFor({ state: "hidden" });
      await mobile.locator("#accountAccessBtn").click();
      await mobile.locator("#ownerSignIn").waitFor({ state: "visible" });
      await mobile.locator("#ownerSignIn").click();
      await mobile.waitForFunction(() => /correo|email/i.test(document.querySelector("#ownerAuthMessage")?.textContent || ""), null, { timeout: 8000 });
    });

    await mobile.goto("http://127.0.0.1:4173/mapa.html", { waitUntil: "domcontentloaded" });
    await mobile.waitForFunction(() => !!window.L && !!document.querySelector("#map"), null, { timeout: 15000 });
    await check("Mobile map filters respond to touch", async () => {
      const filter = mobile.locator('#filters [data-category="restaurant"]');
      await filter.click();
      if (!(await filter.evaluate(el => el.classList.contains("active")))) throw new Error("Mobile category filter did not become active");
      await mobile.locator("#resetView").click();
    });
    await mobile.close();

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
