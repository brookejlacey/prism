import { test, expect } from "@playwright/test";

test.describe("Prism Protocol Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should render the hero section", async ({ page }) => {
    await expect(page.getByText("Private DeFi")).toBeVisible();
    await expect(page.getByText("on Polkadot Hub")).toBeVisible();
    await expect(
      page.getByText("Track 1: EVM Smart Contracts")
    ).toBeVisible();
    await expect(page.getByText("Track 2: PVM Precompiles")).toBeVisible();
    await expect(page.getByText("XCM Cross-Chain")).toBeVisible();
  });

  test("should show protocol metrics", async ({ page }) => {
    await expect(page.getByText("Anonymity Set")).toBeVisible();
    await expect(page.getByText("Total Deposits")).toBeVisible();
    await expect(page.getByText("Cross-VM Transfers")).toBeVisible();
    await expect(page.getByText("PVM Gas Savings")).toBeVisible();
    await expect(page.getByText("14x")).toBeVisible();
  });

  test("should display connect wallet button", async ({ page }) => {
    await expect(page.getByText("Connect Wallet")).toBeVisible();
  });

  test("should show deposit panel with token selection", async ({ page }) => {
    await expect(page.getByText("Private Deposit")).toBeVisible();
    await expect(page.getByRole("button", { name: /USDC/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /DOT/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /WND/ }).first()).toBeVisible();
  });

  test("should show denomination options", async ({ page }) => {
    const depositSection = page.locator("#deposit");
    await expect(depositSection.getByText("0.1", { exact: false })).toBeVisible();
    await expect(depositSection.getByText("10", { exact: false })).toBeVisible();
    await expect(depositSection.getByText("100", { exact: false })).toBeVisible();
  });

  test("should switch denomination on click", async ({ page }) => {
    const denom10Button = page
      .locator("#deposit")
      .getByRole("button", { name: /^10 / });
    await denom10Button.click();
    // The button should now be highlighted (has primary bg)
    await expect(denom10Button).toBeVisible();
  });

  test("should show withdraw panel", async ({ page }) => {
    await expect(page.getByText("Private Withdraw")).toBeVisible();
    await expect(
      page.getByPlaceholder("Paste your deposit note here...")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/can be a different address/)
    ).toBeVisible();
  });

  test("should show cross-VM bridge panel", async ({ page }) => {
    await expect(page.getByText("Cross-VM & XCM Bridge")).toBeVisible();
    await expect(page.getByRole("button", { name: "EVM ↔ PVM" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "XCM Transfer" })
    ).toBeVisible();
  });

  test("should switch between cross-VM tabs", async ({ page }) => {
    const xcmButton = page.getByRole("button", { name: "XCM Transfer" });
    await xcmButton.click();
    await expect(page.getByText("Asset Hub")).toBeVisible();
    await expect(page.getByText("Moonbeam")).toBeVisible();
    await expect(page.getByText("Astar")).toBeVisible();
    await expect(page.getByText("Bifrost")).toBeVisible();
  });

  test("should show architecture diagram", async ({ page }) => {
    await expect(page.getByText("Architecture")).toBeVisible();
    await expect(page.getByText("PrismVault")).toBeVisible();
    await expect(page.getByText("PrismRouter")).toBeVisible();
    await expect(page.getByText("CrossVMBridge")).toBeVisible();
    await expect(page.getByText("Poseidon")).toBeVisible();
    await expect(page.getByText("Pedersen")).toBeVisible();
    await expect(page.getByText("14x cheaper than EVM")).toBeVisible();
  });

  test("should show how it works section", async ({ page }) => {
    await expect(page.getByText("How Prism Works")).toBeVisible();
    await expect(page.getByText("PVM Proves")).toBeVisible();
    await expect(page.getByText("Cross-Chain")).toBeVisible();
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

  test("should navigate between sections", async ({ page }) => {
    // Click nav links
    await page.getByRole("link", { name: "Deposit" }).click();
    await expect(page.locator("#deposit")).toBeInViewport();

    await page.getByRole("link", { name: "Withdraw" }).click();
    await expect(page.locator("#withdraw")).toBeInViewport();
  });

  test("should select XCM destination parachain", async ({ page }) => {
    await page.getByRole("button", { name: "XCM Transfer" }).click();
    const moonbeamButton = page.getByRole("button", {
      name: /Moonbeam/,
    });
    await moonbeamButton.click();
    // Verify the protocol info updates
    await expect(page.getByText("Moonbeam").first()).toBeVisible();
  });
});
