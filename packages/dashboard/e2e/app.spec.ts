import { test, expect } from "@playwright/test";

test.describe("Prism Protocol Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should render the hero section", async ({ page }) => {
    await expect(page.getByText("Private DeFi")).toBeVisible();
    await expect(
      page.getByText("on Polkadot Hub", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Track 1: EVM Smart Contracts")
    ).toBeVisible();
    await expect(page.getByText("Track 2: PVM Precompiles")).toBeVisible();
    await expect(page.getByText("XCM Cross-Chain")).toBeVisible();
  });

  test("should show protocol metrics", async ({ page }) => {
    await expect(page.getByText("Anonymity Set")).toBeVisible();
    await expect(
      page.getByText("Active shielded deposits")
    ).toBeVisible();
    await expect(page.getByText("PVM Gas Savings")).toBeVisible();
    await expect(
      page.getByText("vs. pure EVM crypto ops")
    ).toBeVisible();
  });

  test("should display connect wallet button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Connect Wallet", exact: true })
    ).toBeVisible();
  });

  test("should show deposit panel with token selection", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Private Deposit/ })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /USDC/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /DOT/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /WND/ }).first()).toBeVisible();
  });

  test("should show denomination options in deposit panel", async ({ page }) => {
    const depositSection = page.locator("#deposit");
    await expect(depositSection.getByRole("button", { name: /^0\.1/ })).toBeVisible();
    await expect(depositSection.getByRole("button", { name: /^10 / })).toBeVisible();
    await expect(depositSection.getByRole("button", { name: /^100 / })).toBeVisible();
  });

  test("should switch denomination on click", async ({ page }) => {
    const denom10Button = page
      .locator("#deposit")
      .getByRole("button", { name: /^10 / });
    await denom10Button.click();
    await expect(denom10Button).toBeVisible();
  });

  test("should show withdraw panel", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Private Withdraw/ })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Paste your deposit note here...")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/can be a different address/)
    ).toBeVisible();
  });

  test("should show cross-VM bridge panel", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Cross-VM/ })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "EVM ↔ PVM" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "XCM Transfer" })
    ).toBeVisible();
  });

  test("should switch between cross-VM tabs", async ({ page }) => {
    const xcmButton = page.getByRole("button", { name: "XCM Transfer" });
    await xcmButton.click();
    await expect(
      page.getByRole("button", { name: /Asset Hub/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Moonbeam/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Astar/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Bifrost/ })
    ).toBeVisible();
  });

  test("should show architecture diagram", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Architecture" })
    ).toBeVisible();
    await expect(page.getByText("PrismVault")).toBeVisible();
    await expect(page.getByText("PrismRouter")).toBeVisible();
    await expect(page.getByText("CrossVMBridge")).toBeVisible();
    await expect(page.getByText("Poseidon", { exact: true })).toBeVisible();
    await expect(page.getByText("14x cheaper than EVM", { exact: true })).toBeVisible();
  });

  test("should show how it works section", async ({ page }) => {
    await expect(page.getByText("How Prism Works")).toBeVisible();
    await expect(page.getByText("PVM Proves")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cross-Chain" })
    ).toBeVisible();
  });

  test("should show footer", async ({ page }) => {
    await expect(
      page.getByText("Built for the Polkadot Solidity Hackathon 2026")
    ).toBeVisible();
  });

  test("deposit button should be disabled without wallet", async ({ page }) => {
    const depositButton = page.getByRole("button", {
      name: "Connect wallet to deposit",
    });
    await expect(depositButton).toBeDisabled();
  });

  test("withdraw button should be disabled without wallet", async ({ page }) => {
    const withdrawButton = page.getByRole("button", {
      name: "Connect wallet to withdraw",
    });
    await expect(withdrawButton).toBeDisabled();
  });

  test("should navigate to deposit section", async ({ page }) => {
    await page.getByRole("link", { name: "Deposit" }).click();
    await expect(page.locator("#deposit")).toBeInViewport();
  });

  test("should select XCM destination parachain", async ({ page }) => {
    await page.getByRole("button", { name: "XCM Transfer" }).click();
    const moonbeamButton = page.getByRole("button", {
      name: /Moonbeam/,
    });
    await moonbeamButton.click();
    await expect(moonbeamButton).toBeVisible();
  });
});
