import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("task drawer editors retain distinct identities without duplicate keys", async ({
  page,
}) => {
  const duplicateKeys: string[] = [];
  page.on("console", (message) => {
    if (/Encountered two children with the same key/.test(message.text())) {
      duplicateKeys.push(message.text());
    }
  });
  await page.goto("/?task=ORB-102");
  const title = page.getByRole("textbox", { name: "Task title", exact: true });
  const description = page.getByRole("textbox", {
    name: "Task description",
    exact: true,
  });
  await expect(title).toHaveCount(1);
  await expect(description).toHaveCount(1);
  await title.fill("Audit existing website — reviewed");
  await page.locator(".task-properties select").first().selectOption("review");
  await expect(title).toHaveValue("Audit existing website — reviewed");
  await description.fill("Check navigation and accessibility.");
  await expect(description).toHaveValue("Check navigation and accessibility.");
  await page.reload();
  await expect(title).toHaveValue("Audit existing website — reviewed");
  await expect(description).toHaveValue("Check navigation and accessibility.");
  expect(duplicateKeys).toEqual([]);
});

test("board renders all task groups and the alternate views share filters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Website redesign", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".task-card")).toHaveCount(12);
  await page.screenshot({
    path: "artifacts/orbit-board-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Search tasks", exact: true })
    .fill("homepage");
  await expect(page.locator(".task-card")).toHaveCount(1);
  await page.getByRole("tab", { name: "List", exact: true }).click();
  await expect(page.locator(".list-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".list-row")).toHaveCount(12);
  await page.getByRole("tab", { name: "Timeline", exact: true }).click();
  await expect(page.locator(".timeline-row")).toHaveCount(12);
  await expect(page).toHaveURL(/view=timeline/);
  expect(errors).toEqual([]);
});

test("create, edit, checklist, comments, and refresh persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".page-heading-actions")
    .getByRole("button", { name: "Add task", exact: true })
    .click();
  await page
    .getByLabel("Task name", { exact: true })
    .fill("Ship a thoughtful workspace");
  await page
    .getByRole("combobox", { name: "Assignee", exact: true })
    .selectOption("james");
  await page.getByLabel("Due date", { exact: true }).fill("2026-09-24");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByLabel("Task title", { exact: true })).toHaveValue(
    "Ship a thoughtful workspace",
  );
  await page
    .getByLabel("Task title", { exact: true })
    .fill("Ship a thoughtful workspace — refined");
  await page.locator(".task-properties select").first().selectOption("review");
  await page
    .getByLabel("New checklist item", { exact: true })
    .fill("Check keyboard navigation");
  await page.locator(".add-subtask button").click();
  await expect(
    page.getByLabel("Check keyboard navigation", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Check keyboard navigation", { exact: true }).check();
  await page
    .getByLabel("Add a comment", { exact: true })
    .fill("Ready for a final review.");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(
    page.getByText("Ready for a final review.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/orbit-task-detail.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "List", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Ship a thoughtful workspace — refined/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Ship a thoughtful workspace — refined/ }),
  ).toBeVisible();
});

test("pointer dragging moves a task across columns", async ({ page }) => {
  await page.goto("/");
  const handle = page.getByRole("button", {
    name: /^Drag Explore dashboard concepts/,
  });
  await handle.hover();
  const source = (await handle.boundingBox())!;
  const target = (await page
    .locator('.board-column[aria-label^="In progress"]')
    .boundingBox())!;
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(source.x + 15, source.y + 10, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + 95, {
    steps: 25,
  });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("orbit.workspace.task.v1.ORB-101") ?? "null",
          )?.status,
      ),
    )
    .toBe("progress");
  await expect(
    page.locator(
      '.board-column[aria-label^="In progress"] article[data-task-anchor="ORB-101"]',
    ),
  ).toHaveCount(1);
});

test("metadata and collaborative description synchronize across tabs", async ({
  page,
  context,
}) => {
  await page.goto("/?task=ORB-101");
  const other = await context.newPage();
  await other.goto("/?task=ORB-101");
  const editor = page.getByRole("textbox", {
    name: "Task description",
    exact: true,
  });
  const otherEditor = other.getByRole("textbox", {
    name: "Task description",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await expect(otherEditor).toBeVisible();
  await editor.fill("A shared design direction.");
  await expect(otherEditor).toHaveValue("A shared design direction.");
  await Promise.all([
    editor.evaluate((element) => {
      const field = element as HTMLTextAreaElement;
      // Apply an insertion to the current value, not a stale full-document replacement.
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(field, `Alex: ${field.value}`);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }),
    otherEditor.evaluate((element) => {
      const field = element as HTMLTextAreaElement;
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(field, `${field.value} Reviewed.`);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }),
  ]);
  await expect
    .poll(
      async () =>
        (await editor.inputValue()) === (await otherEditor.inputValue()),
    )
    .toBe(true);
  await expect(editor).toHaveValue(/Alex:/);
  await expect(editor).toHaveValue(/Reviewed/);
  await page.locator(".task-properties select").first().selectOption("done");
  await expect(other.locator(".task-properties select").first()).toHaveValue(
    "done",
  );
  await other.reload();
  await expect(
    other.getByRole("textbox", { name: "Task description", exact: true }),
  ).toHaveValue(/Reviewed/);
});

test("dashboard, people, theme, and mobile navigation work", async ({
  page,
}) => {
  await page.goto("/?section=overview");
  await expect(
    page.getByRole("heading", { name: "Delivery outlook", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".recharts-surface")).toHaveCount(2);
  await page.screenshot({
    path: "artifacts/orbit-overview-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("button", { name: "Team", exact: true }).click();
  await expect(page.locator(".member-card")).toHaveCount(5);
  await expect(page.locator(".workspace")).not.toHaveClass(/mobile-nav-open/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/orbit-team-mobile.png",
    fullPage: true,
  });
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(12);
  await page.screenshot({
    path: "artifacts/orbit-board-mobile.png",
    fullPage: true,
  });
});

test("the board meets automated accessibility checks", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(12);
  const results = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("keyboard dragging can move and cancel a card", async ({ page }) => {
  await page.goto("/");
  const handle = page.getByRole("button", {
    name: /^Drag Explore dashboard concepts/,
  });
  await expect(handle).toHaveAttribute("aria-roledescription", "draggable");
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".drag-overlay")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByText(/was moved over droppable target ORB-104/),
  ).toBeAttached();
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("orbit.workspace.task.v1.ORB-101") ?? "null",
          )?.status,
      ),
    )
    .toBe("progress");
  const moved = page.getByRole("button", {
    name: /^Drag Explore dashboard concepts/,
  });
  await expect(page.locator(".drag-overlay")).toHaveCount(0);
  await expect(moved).toHaveAttribute("aria-roledescription", "draggable");
  await moved.focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".drag-overlay")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Escape");
  await expect(
    page.locator(
      '.board-column[aria-label^="In progress"] article[data-task-anchor="ORB-101"]',
    ),
  ).toHaveCount(1);
});

test("large working sets filter in a worker and keep mounted rows bounded", async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (let i = 0; i < 2000; i++) {
      const id = "LOAD-" + i;
      localStorage.setItem(
        "orbit.workspace.task.v1." + id,
        JSON.stringify({
          id,
          title: "Scale test " + i,
          description: "A large working set",
          projectId: "website",
          status: ["backlog", "progress", "review", "done"][i % 4],
          priority: "normal",
          tags: [],
          assigneeId: "alex",
          startOn: "",
          dueOn: "2026-09-20",
          rank: i * 1024,
          subtasks: [],
          comments: [],
          updatedAt: Date.now(),
          actor: "load-test",
        }),
      );
    }
  });
  await page.goto("/");
  await expect(page.locator(".task-toolbar")).toContainText("2012 tasks");
  expect(await page.locator(".task-card").count()).toBeLessThan(100);
  await page
    .getByRole("textbox", { name: "Search tasks", exact: true })
    .fill("Scale test 1999");
  await expect(page.locator(".task-card")).toHaveCount(1);
  await expect(page.locator(".card-title")).toHaveText("Scale test 1999");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page.getByRole("tab", { name: "List", exact: true }).click();
  await expect(page.locator(".task-toolbar")).toContainText("2012 tasks");
  expect(await page.locator(".list-row").count()).toBeLessThan(60);
  await page.getByRole("tab", { name: "Timeline", exact: true }).click();
  await expect(page.locator(".timeline-row").first()).toBeVisible();
  expect(await page.locator(".timeline-row").count()).toBeLessThan(60);
});

test("a failed local save rolls back the task and reports the error", async ({
  page,
}) => {
  await page.goto("/?task=ORB-101");
  const status = page.locator(".task-properties select").first();
  await expect(status).toHaveValue("backlog");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("orbit.workspace.task.v1."))
        throw new DOMException("Full", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await status.selectOption("done");
  await expect(status).toHaveValue("backlog");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.locator(".save-state")).toContainText("Changes not saved");
  await expect(
    page.locator(
      '.board-column[aria-label^="To do"] article[data-task-anchor="ORB-101"]',
    ),
  ).toHaveCount(1);
});

for (const route of [
  "/?view=list",
  "/?view=timeline",
  "/?task=ORB-101",
  "/?section=overview",
]) {
  test("accessible content: " + route, async ({ page }) => {
    await page.goto(route);
    if (route.includes("task="))
      await expect(
        page.getByRole("textbox", { name: "Task description", exact: true }),
      ).toBeVisible();
    else if (route.includes("overview"))
      await expect(page.locator(".recharts-surface")).toHaveCount(2);
    else
      await expect(
        page.locator(route.includes("list") ? ".list-row" : ".timeline-row"),
      ).toHaveCount(12);
    const results = await new AxeBuilder({ page })
      .exclude("nextjs-portal")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });
}

test("dark theme has accessible contrast", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const results = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: "artifacts/orbit-board-dark.png",
    fullPage: true,
  });
});
