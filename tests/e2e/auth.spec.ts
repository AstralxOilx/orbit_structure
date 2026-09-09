import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("login validates fields and supports password visibility and remember me", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByText("Enter your email or username.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Enter your password.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Email or username", { exact: true })
    .fill("alex.morgan");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("sample-password");
  const toggle = page.getByRole("button", {
    name: "Show password",
    exact: true,
  });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByLabel("Remember me").check();
  await expect(page.getByLabel("Remember me")).toBeChecked();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Sign-in is not connected",
  );
});

test("signup validates strength, confirmation, terms and does not persist credentials", async ({
  page,
}) => {
  const messages: string[] = [];
  page.on("console", (message) => messages.push(message.text()));
  await page.goto("/auth");
  await page.getByRole("tab", { name: "Sign Up", exact: true }).click();
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(
    page.getByText("Enter your full name.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Please accept the Terms & Conditions.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Full name", { exact: true }).fill("Alex Morgan");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("alex@example.com");
  await page.getByLabel("Password", { exact: true }).fill("a");
  await expect(page.getByRole("meter")).toHaveAttribute(
    "aria-valuetext",
    "Weak",
  );
  await page.getByLabel("Password", { exact: true }).fill("Orbit-Sample!938");
  await expect(page.getByRole("meter")).toHaveAttribute(
    "aria-valuetext",
    "Strong",
  );
  await page.getByLabel("Confirm password", { exact: true }).fill("different");
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(
    page.getByText("Passwords don't match.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Orbit-Sample!938");
  await page.getByLabel("I agree to the", { exact: true }).check();
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "no account has been created",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("Orbit-Sample!938");
  expect(messages.join("\n")).not.toContain("Orbit-Sample!938");
});

test("social, password recovery and terms actions give clear feedback", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Google sign-in is not connected",
  );
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page.getByRole("status")).toContainText(
    "GitHub sign-in is not connected",
  );
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Account email").fill("alex@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No email has been sent",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Forgot password?" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Terms", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Terms & Conditions");
  await page.getByRole("button", { name: "Got it" }).click();
});

test("auth tabs support keyboard, mobile sizing and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth");
  await page.getByRole("tab", { name: "Login", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Sign Up", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "artifacts/orbit-signup-mobile.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Sign Up", exact: true }).press("Home");
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible();
});

test("login and signup pass automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/auth");
  for (const mode of ["Login", "Sign Up"]) {
    await page.getByRole("tab", { name: mode, exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: mode === "Login" ? "Welcome back." : "Make room for more.",
      }),
    ).toBeVisible();
    const result = await new AxeBuilder({ page })
      .exclude("nextjs-portal")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

test("sidebar interpolates its width and retains usable navigation", async ({
  page,
}) => {
  await page.goto("/workspace");
  const sidebar = page.locator(".sidebar");
  await expect(
    page.getByRole("button", { name: "Collapse sidebar", exact: true }),
  ).toBeVisible();
  const widths = await sidebar.evaluate(async (element) => {
    const samples: number[] = [];
    const start = performance.now();
    (element.querySelector(".collapse-control") as HTMLButtonElement).click();
    await new Promise<void>((resolve) => {
      const sample = () => {
        samples.push(element.getBoundingClientRect().width);
        if (performance.now() - start < 400) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return samples;
  });
  expect(widths.some((width) => width > 75 && width < 230)).toBe(true);
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(73);
  await expect(sidebar.locator(".brand .orbit-mark")).toBeInViewport();
  await expect(sidebar.locator(".profile-button .avatar")).toBeInViewport();
  await sidebar.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace overview", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect
    .poll(async () => Math.round((await sidebar.boundingBox())!.width))
    .toBe(236);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await sidebar.getByRole("button", { name: "Team", exact: true }).click();
  await expect(page.locator(".member-card")).toHaveCount(5);
});
