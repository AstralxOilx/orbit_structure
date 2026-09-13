import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("one theme preference survives auth tab changes, reload and workspace navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match|hydrated/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto("/auth");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".auth-shell").first()).toHaveCSS(
    "background-color",
    "rgb(17, 24, 39)",
  );
  await page.getByRole("tab", { name: "Sign Up", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Shared theme test");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Shared theme test",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Explore the workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workspace/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await page.goto("/auth");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

test("stored light preference and changes in another tab are shared", async ({
  page,
  context,
}) => {
  await page.goto("/auth");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  const other = await context.newPage();
  await other.goto("/auth");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
});

test("shared appearance selector can follow the operating system", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/workspace");
  await page.locator(".workspace-switcher").click();
  const preference = page.getByRole("combobox", {
    name: "Appearance",
    exact: true,
  });
  await preference.selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(preference).toHaveValue("system");
  await page.goto("/auth");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("light and dark login, signup and shared dialog remain accessible", async ({
  page,
}) => {
  await page.goto("/auth");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Switch to dark theme", exact: true })
        .click();
    for (const mode of ["Login", "Sign Up"]) {
      await page.getByRole("tab", { name: mode, exact: true }).click();
      const panel = page.getByRole("tabpanel");
      await expect(panel).toHaveAttribute(
        "id",
        mode === "Login" ? "auth-panel-login" : "auth-panel-register",
      );
      await expect(panel).toHaveCSS("opacity", "1");
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
      await page.screenshot({
        path: `artifacts/auth-${mode}-${theme}.png`,
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Terms", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .exclude("nextjs-portal")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await page.keyboard.press("Escape");
  }
});
