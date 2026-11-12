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

    await check("Paid Basic and Pro members receive a spacious working dashboard with live navigation and refresh controls", async () => {
      for (const plan of ["basic", "pro"]) {
        const paidPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        paidPage.on("pageerror", error => failures.push(error.stack || error.message));
        let refreshProfileCalls = 0;
        let profileSavePayload = null;
        await paidPage.route("**/rest/v1/**", async route => {
          const url = route.request().url();
          if (url.includes("/user_profiles") && route.request().method() === "POST") {
            profileSavePayload = route.request().postDataJSON();
            await route.fulfill({ status: 204, body: "" });
            return;
          }
          if (url.includes("/user_subscriptions")) {
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{
              plan_code: plan, status: "active", current_period_end: "2027-01-01T00:00:00Z", cancel_at_period_end: false
            }]) });
            return;
          }
          if (url.includes("/user_profiles") && route.request().method() === "GET") refreshProfileCalls += 1;
          if (url.includes("/businesses?")) {
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{
              id: "00000000-0000-4000-8000-000000000093", name: "QA Approved Business", city: "Los Angeles", status: "approved"
            }]) });
            return;
          }
          await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        });
        await paidPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
        await paidPage.waitForFunction(() => typeof window.ownerSetSession === "function", null, { timeout: 15000 });
        await paidPage.evaluate(() => window.ownerSetSession({
          access_token: "qa-paid-workspace-token",
          refresh_token: "qa-paid-workspace-refresh",
          user: { id: "00000000-0000-4000-8000-000000000091", email: "paid-workspace-qa@example.invalid", app_metadata: {} }
        }));
        await paidPage.locator("#customerWorkspace").waitFor({ state: "visible", timeout: 10000 });
        await paidPage.locator("#privateProfileAction").click();
        await paidPage.locator("#privateProfileName").fill("QA Member Profile");
        await paidPage.locator("#privateProfileBio").fill("Synthetic profile editor validation only.");
        await paidPage.locator("#privateProfileEditor").evaluate(form => form.requestSubmit());
        await paidPage.waitForFunction(() => {
          const editor = document.querySelector("#privateProfileEditor");
          return !editor && document.querySelector("#privateProfileContent")?.textContent.includes("QA Member Profile");
        }, null, { timeout: 8000 });
        if (!profileSavePayload || profileSavePayload.user_id !== "00000000-0000-4000-8000-000000000091" ||
            profileSavePayload.display_name !== "QA Member Profile" ||
            profileSavePayload.bio !== "Synthetic profile editor validation only.") {
          throw new Error("Inline profile editor did not save the expected synthetic member payload");
        }
        const workspaceFacts = await paidPage.evaluate(() => {
          const panel = document.querySelector("#customerWorkspace");
          const links = [...panel.querySelectorAll("nav a")];
          return {
            width: panel.getBoundingClientRect().width,
            reviewLink: links.some(a => a.getAttribute("href") === "#privateOwnReviewsTitle"),
            profileTarget: !!document.querySelector("#privateProfileTitle"),
            messagesTarget: !!document.querySelector("#privateMessagesTitle"),
            complaintsTarget: !!document.querySelector("#privateComplaintsTitle"),
            postsTarget: !!document.querySelector("#privatePostsTitle"),
            discoverTarget: !!document.querySelector("#searchForm"),
            reviewsTarget: !!document.querySelector("#privateOwnReviewsTitle"),
            refreshButton: !!document.querySelector("#customerWorkspaceRefresh"),
            planText: document.querySelector("#customerWorkspacePlan")?.textContent || "",
            aiVisible: !document.querySelector("#customerLinkAI")?.hidden
          };
        });
        if (workspaceFacts.width < 1200) throw new Error("Paid workspace is not using the available desktop width: " + workspaceFacts.width);
        for (const key of ["reviewLink","profileTarget","messagesTarget","complaintsTarget","postsTarget","discoverTarget","reviewsTarget","refreshButton"]) {
          if (!workspaceFacts[key]) throw new Error("Paid workspace navigation/control missing: " + key);
        }
        if (plan === "pro" && !workspaceFacts.aiVisible) throw new Error("Pro workspace did not show the Reputix AI shortcut");
        if (plan === "basic" && workspaceFacts.aiVisible) throw new Error("Basic workspace incorrectly exposed the Pro AI shortcut");
        const before = refreshProfileCalls;
        await paidPage.locator("#customerWorkspaceRefresh").click();
        await paidPage.waitForFunction(() => /updated|actualizado/i.test(document.querySelector("#customerWorkspaceStatus")?.textContent || ""), null, { timeout: 8000 });
        if (refreshProfileCalls <= before) throw new Error("Workspace refresh did not reload the customer profile data");
        if (plan === "basic") {
          await paidPage.locator("#customerComplaintBusiness").selectOption("00000000-0000-4000-8000-000000000093");
          await paidPage.locator("#customerComplaintText").fill("QA synthetic complaint about a delayed service.");
          let complaintPayload = null;
          await paidPage.route("**/rest/v1/complaints", async route => {
            if (route.request().method() === "POST") {
              complaintPayload = route.request().postDataJSON();
              await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
            } else {
              await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
            }
          });
          await paidPage.locator("#customerComplaintForm").evaluate(form => form.requestSubmit());
          await paidPage.waitForFunction(() => /reclamo enviado|complaint submitted/i.test(document.querySelector("#customerComplaintStatus")?.textContent || ""), null, { timeout: 8000 });
          if (!complaintPayload || complaintPayload.status !== "pending" || complaintPayload.user_id !== "00000000-0000-4000-8000-000000000091") {
            throw new Error("Complaint form did not submit a pending complaint owned by the signed-in synthetic user");
          }
        }
        await paidPage.locator("#customerLinkReviews").click();
        await paidPage.waitForFunction(() => location.hash === "#privateOwnReviewsTitle");
        await paidPage.setViewportSize({ width: 390, height: 844 });
        const mobileFacts = await paidPage.evaluate(() => {
          const panel = document.querySelector("#customerWorkspace");
          const grid = document.querySelector(".customer-workspace-grid");
          return {
            columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
            panelFits: panel.scrollWidth <= panel.clientWidth + 1,
            refreshVisible: document.querySelector("#customerWorkspaceRefresh").getBoundingClientRect().width > 0
          };
        });
        if (mobileFacts.columns > 2 || !mobileFacts.panelFits || !mobileFacts.refreshVisible) {
          throw new Error("Paid mobile workspace layout failed: " + JSON.stringify(mobileFacts));
        }
        await paidPage.close();
      }

      const freePage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      await freePage.route("**/rest/v1/**", async route => {
        if (route.request().url().includes("/user_subscriptions")) {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{
            plan_code: "free", status: "active", current_period_end: null, cancel_at_period_end: false
          }]) });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
      });
      await freePage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      await freePage.waitForFunction(() => typeof window.ownerSetSession === "function", null, { timeout: 15000 });
      await freePage.evaluate(() => window.ownerSetSession({
        access_token: "qa-free-workspace-token",
        refresh_token: "qa-free-workspace-refresh",
        user: { id: "00000000-0000-4000-8000-000000000092", email: "free-workspace-qa@example.invalid", app_metadata: {} }
      }));
      await freePage.waitForTimeout(300);
      if (!(await freePage.locator("#customerWorkspace").isHidden())) throw new Error("Free plan incorrectly unlocked the paid workspace");
      if (!(await freePage.locator("#customerLinkAI").isHidden())) throw new Error("Free plan incorrectly unlocked the Pro AI shortcut");
      await freePage.close();
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

    await check("Checkout refreshes an expired session once before retrying safely", async () => {
      const checkoutPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      checkoutPage.on("pageerror", error => failures.push(error.stack || error.message));
      let refreshCalls = 0;
      let checkoutCalls = 0;
      let retryAuthorization = "";
      await checkoutPage.route("**/auth/v1/token?grant_type=refresh_token", async route => {
        refreshCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            access_token: "qa-fresh-access-token",
            refresh_token: "qa-rotated-refresh-token",
            user: { id: "00000000-0000-4000-8000-000000000008", email: "checkout-qa@example.invalid" }
          })
        });
      });
      await checkoutPage.route("**/functions/v1/create-checkout-session", async route => {
        checkoutCalls += 1;
        retryAuthorization = route.request().headers().authorization || "";
        if (checkoutCalls === 1) {
          await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "JWT expired" }) });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ url: "http://127.0.0.1:4173/checkout-test-success" })
          });
        }
      });
      await checkoutPage.route("**/checkout-test-success", async route => {
        await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Mock checkout redirect</title><p>QA only</p>" });
      });
      await checkoutPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      await checkoutPage.evaluate(() => sessionStorage.setItem("reputix_owner_session", JSON.stringify({
        access_token: "qa-expired-access-token",
        refresh_token: "qa-refresh-token",
        user: { id: "00000000-0000-4000-8000-000000000008", email: "checkout-qa@example.invalid" }
      })));
      await checkoutPage.locator("#basicCheckoutButton").click();
      await checkoutPage.waitForURL("**/checkout-test-success", { timeout: 10000 });
      if (refreshCalls !== 1) throw new Error("Expired session did not trigger exactly one refresh");
      if (checkoutCalls !== 2) throw new Error("Checkout was not retried exactly once after refresh");
      if (retryAuthorization !== "Bearer qa-fresh-access-token") throw new Error("Checkout retry did not use the refreshed access token");
      await checkoutPage.close();
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

    await check("Public business proposal honeypot blocks bots and duplicate submissions show a clear message", async () => {
      const proposalPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      proposalPage.on("pageerror", error => failures.push(error.stack || error.message));
      let rpcCalls = 0;
      let rpcMode = "success";
      await proposalPage.route("**/rest/v1/rpc/submit_business_proposal", async route => {
        rpcCalls += 1;
        if (rpcMode === "duplicate") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ message: "A matching business proposal already exists and is pending or approved" })
          });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify("00000000-0000-4000-8000-000000000007") });
        }
      });
      await proposalPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      await proposalPage.locator("#addBusinessChoice").click();
      const form = proposalPage.locator("#communityFormWrap form");
      await form.locator('input[name="name"]').fill("QA Proposal Test Business");
      await form.locator("select[name='category']").selectOption({ index: 1 });
      await form.locator('input[name="city"]').fill("QA Test City");
      await form.locator('input[name="company_website"]').fill("https://spam.example");
      await form.evaluate(el => el.requestSubmit());
      await proposalPage.waitForFunction(() => /propuesta recibida|suggestion received/i.test(document.querySelector("#communityFormWrap .form-message")?.textContent || ""));
      if (rpcCalls !== 0) throw new Error("Honeypot-filled submission reached the database RPC");
      await form.locator('input[name="name"]').fill("QA Proposal Test Business");
      await form.locator("select[name='category']").selectOption({ index: 1 });
      await form.locator('input[name="city"]').fill("QA Test City");
      await form.evaluate(el => el.requestSubmit());
      await proposalPage.waitForFunction(() => /propuesta recibida|proposal received/i.test(document.querySelector("#communityFormWrap .form-message")?.textContent || ""));
      if (rpcCalls !== 1) throw new Error("Valid proposal did not call the RPC exactly once");
      rpcMode = "duplicate";
      await form.locator('input[name="name"]').fill("QA Proposal Test Business");
      await form.locator("select[name='category']").selectOption({ index: 1 });
      await form.locator('input[name="city"]').fill("QA Test City");
      await form.evaluate(el => el.requestSubmit());
      await proposalPage.waitForFunction(() => /ya existe una propuesta igual|matching proposal already exists/i.test(document.querySelector("#communityFormWrap .form-message")?.textContent || ""), null, { timeout: 8000 });
      if (rpcCalls !== 2) throw new Error("Duplicate attempt did not reach the server-side duplicate guard");
      await proposalPage.close();
    });

    await check("Verified business owners can read and reply to customer conversations", async () => {
      const customerId = "00000000-0000-4000-8000-000000000201";
      const ownerId = "00000000-0000-4000-8000-000000000202";
      const businessId = "00000000-0000-4000-8000-000000000203";
      const conversationId = "00000000-0000-4000-8000-000000000204";
      const conversations = [];
      const messages = [];
      const business = { id: businessId, name: "QA Verified Business", city: "Los Angeles", status: "approved" };
      const mockRest = async route => {
        const request = route.request();
        const url = new URL(request.url());
        const table = url.pathname.split("/").pop();
        const method = request.method();
        const isOwner = (request.headers().authorization || "").includes("qa-owner-message-token");
        const userId = isOwner ? ownerId : customerId;
        const json = body => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
        if (table === "businesses" && method === "GET") return json([business]);
        if (table === "business_owner_claims" && method === "GET") {
          return json(isOwner ? [{ id: "qa-owner-claim", business_id: businessId, status: "verified" }] : []);
        }
        if (table === "business_conversations" && method === "GET") {
          const rows = conversations.filter(row =>
            url.searchParams.has("business_id")
              ? row.business_id === businessId
              : row.customer_id === userId
          );
          return json(rows);
        }
        if (table === "business_conversations" && method === "POST") {
          const payload = request.postDataJSON();
          if (payload.customer_id !== customerId || payload.business_id !== businessId) {
            return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Invalid synthetic participant" }) });
          }
          const row = { ...payload, id: conversationId, updated_at: new Date().toISOString() };
          conversations.push(row);
          return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([row]) });
        }
        if (table === "business_messages" && method === "GET") {
          const id = url.searchParams.get("conversation_id")?.replace(/^eq\./, "");
          return json(messages.filter(row => row.conversation_id === id));
        }
        if (table === "business_messages" && method === "POST") {
          const payload = request.postDataJSON();
          if (payload.sender_id !== userId || payload.conversation_id !== conversationId) {
            return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Invalid synthetic sender" }) });
          }
          messages.push({ ...payload, id: "qa-message-" + (messages.length + 1), created_at: new Date(Date.now() + messages.length).toISOString(), read_at: null });
          return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        }
        if (table === "business_messages" && method === "PATCH") {
          const ids = (url.searchParams.get("id") || "").replace(/^in\./, "").replace(/[()"]/g, "").split(",");
          messages.forEach(row => { if (ids.includes(row.id)) row.read_at = request.postDataJSON().read_at; });
          return route.fulfill({ status: 204, body: "" });
        }
        if (method === "OPTIONS") return route.fulfill({ status: 204, body: "" });
        return json([]);
      };

      const customerPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      customerPage.on("pageerror", error => failures.push(error.stack || error.message));
      await customerPage.route("**/rest/v1/**", mockRest);
      await customerPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      await customerPage.waitForFunction(() => typeof window.ownerSetSession === "function", null, { timeout: 15000 });
      await customerPage.evaluate(({ customerId }) => window.ownerSetSession({
        access_token: "qa-customer-message-token",
        refresh_token: "qa-customer-message-refresh",
        user: { id: customerId, email: "customer-message-qa@example.invalid", app_metadata: {} }
      }), { customerId });
      await customerPage.locator("#privateMessagesAction").click();
      await customerPage.locator("#messageBusiness option").nth(1).waitFor({ state: "attached", timeout: 8000 });
      await customerPage.locator("#messageBusiness").selectOption(businessId);
      await customerPage.locator("#messageSubject").fill("QA conversation");
      await customerPage.locator("#messageFirstBody").fill("Hello from the synthetic customer account.");
      await customerPage.locator("#messageStartButton").click();
      await customerPage.waitForFunction(() => /mensaje enviado|message sent/i.test(document.querySelector("#messageStatus")?.textContent || ""), null, { timeout: 8000 });
      if (conversations.length !== 1 || messages.length !== 1) throw new Error("Customer message did not create the expected synthetic conversation");

      const ownerPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      ownerPage.on("pageerror", error => failures.push(error.stack || error.message));
      await ownerPage.route("**/rest/v1/**", mockRest);
      await ownerPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
      await ownerPage.waitForFunction(() => typeof window.ownerSetSession === "function", null, { timeout: 15000 });
      await ownerPage.evaluate(({ ownerId }) => window.ownerSetSession({
        access_token: "qa-owner-message-token",
        refresh_token: "qa-owner-message-refresh",
        user: { id: ownerId, email: "owner-message-qa@example.invalid", app_metadata: {} }
      }), { ownerId });
      await ownerPage.waitForFunction(() => {
        const panel = document.querySelector("#ownerToolsSection");
        return !!panel && !panel.hidden;
      }, null, { timeout: 8000 });
      const ownerConversation = ownerPage.locator("#ownerMessageList .message-conversation").first();
      await ownerConversation.waitFor({ state: "visible", timeout: 8000 });
      await ownerConversation.click();
      await ownerPage.waitForFunction(() => !document.querySelector("#ownerMessageThread")?.hidden, null, { timeout: 8000 });
      await ownerPage.waitForFunction(() =>
        (document.querySelector("#ownerMessageThreadItems")?.textContent || "").includes("Hello from the synthetic customer account."),
        null,
        { timeout: 8000 }
      );
      if (!(await ownerPage.locator("#ownerMessageThreadItems").textContent()).includes("Hello from the synthetic customer account.")) {
        throw new Error("Verified owner could not read the customer's message");
      }
      await ownerPage.locator("#ownerMessageReplyBody").fill("Hello from the synthetic verified business owner.");
      await ownerPage.locator("#ownerMessageReplyForm").evaluate(form => form.requestSubmit());
      await ownerPage.waitForFunction(() => /respuesta enviada|reply sent/i.test(document.querySelector("#ownerMessageReplyStatus")?.textContent || ""), null, { timeout: 8000 });
      if (messages.length !== 2 || messages[1].sender_id !== ownerId) throw new Error("Owner reply was not saved as the verified synthetic owner");

      await customerPage.locator("#messageConversationList .message-conversation").first().click();
      await customerPage.waitForFunction(() =>
        (document.querySelector("#messageThreadItems")?.textContent || "").includes("Hello from the synthetic verified business owner."),
        null,
        { timeout: 8000 }
      );
      await ownerPage.close();
      await customerPage.close();
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

    await check("Standalone map loads approved businesses, filters results, and safely renders untrusted names", async () => {
      const mapPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      mapPage.on("pageerror", error => failures.push(error.stack || error.message));
      await mapPage.addInitScript(() => {
        const map = {
          setView() { return this; },
          flyTo() { return this; },
          fitBounds() { return this; },
          invalidateSize() { return this; }
        };
        window.L = {
          map: () => map,
          tileLayer: () => ({ addTo() { return this; } }),
          divIcon: () => ({}),
          marker: coords => ({
            coords,
            addTo() { return this; },
            bindPopup() { return this; },
            on() { return this; },
            getLatLng() { return { lat: coords[0], lng: coords[1] }; },
            openPopup() { return this; }
          }),
          featureGroup: () => ({ getBounds: () => ({ pad() { return this; } }) })
        };
      });
      await mapPage.route("**/*", async route => {
        const url = route.request().url();
        if (url.includes("leaflet.js")) {
          await route.abort();
          return;
        }
        if (url.includes("/rest/v1/businesses")) {
          if (route.request().method() === "OPTIONS") {
            await route.fulfill({
              status: 204,
              headers: {
                "access-control-allow-origin": "*",
                "access-control-allow-methods": "GET, OPTIONS",
                "access-control-allow-headers": "apikey, authorization, content-type, accept"
              }
            });
            return;
          }
          await route.fulfill({
            status: 200,
            headers: {
              "access-control-allow-origin": "*",
              "content-type": "application/json"
            },
            body: JSON.stringify([
              {
                id: "qa-map-1",
                name: "<img src=x onerror=alert(1)>",
                category: "Smoke Shop",
                address: "100 Main Street",
                city: "Los Angeles",
                zip: "90001",
                latitude: 34.00,
                longitude: -118.26,
                status: "approved"
              },
              {
                id: "qa-map-2",
                name: "QA Cafe",
                category: "Restaurant",
                address: "200 Main Street",
                city: "Los Angeles",
                zip: "90002",
                latitude: 34.01,
                longitude: -118.25,
                status: "approved"
              }
            ])
          });
          return;
        }
        await route.continue();
      });
      const mapDiagnostics = [];
      mapPage.on("requestfailed", request => mapDiagnostics.push("request failed: " + request.url() + " " + (request.failure()?.errorText || "")));
      mapPage.on("response", response => {
        if (response.url().includes("/rest/v1/businesses")) mapDiagnostics.push("business API: " + response.status() + " " + response.url());
      });
      await mapPage.goto("http://127.0.0.1:4173/mapa.html", { waitUntil: "domcontentloaded" });
      try {
        await mapPage.waitForFunction(() => /2 de 2 negocios ubicados/i.test(document.querySelector("#status")?.textContent || ""), null, { timeout: 10000 });
      } catch (error) {
        const statusText = await mapPage.locator("#status").textContent().catch(() => "missing status");
        const rowCount = await mapPage.locator("#businessList .business").count().catch(() => -1);
        throw new Error(error.message + "; map status: " + statusText + "; business rows: " + rowCount + "; diagnostics: " + mapDiagnostics.join(" | "));
      }
      const rows = mapPage.locator("#businessList .business");
      if (await rows.count() !== 2) throw new Error("Approved businesses did not appear in the map list");
      await mapPage.locator('#filters [data-category="smoke"]').click();
      if (await rows.count() !== 1) throw new Error("Smoke shop filter returned an incorrect result count");
      await rows.first().click();
      const detail = mapPage.locator("#detail");
      if (!(await detail.textContent()).includes("<img src=x onerror=alert(1)>")) {
        throw new Error("Business name was not rendered as literal text");
      }
      if (await detail.locator("img").count()) throw new Error("Untrusted business name created an HTML image element");
      await mapPage.locator("#resetView").click();
      await mapPage.close();
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
