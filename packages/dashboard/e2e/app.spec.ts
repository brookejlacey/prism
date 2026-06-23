import { test, expect } from "@playwright/test";

test.describe("Prism Protocol Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the hero section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Private DeFi/ })).toBeVisible();
    await expect(page.getByText("Groth16 zk-SNARK", { exact: true })).toBeVisible();
    await expect(page.getByText("Poseidon Merkle tree", { exact: true })).toBeVisible();
    await expect(page.getByText("bn128 precompiles", { exact: true })).toBeVisible();
  });

  test("shows protocol metrics", async ({ page }) => {
    await expect(page.getByText("Anonymity Set", { exact: true })).toBeVisible();
    await expect(page.getByText("Tree Depth", { exact: true })).toBeVisible();
    await expect(page.getByText("Withdrawals", { exact: true })).toBeVisible();
  });

  test("shows the connect wallet button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Connect", exact: true })
    ).toBeVisible();
  });

  test("shows the deposit panel with token + denomination selection", async ({ page }) => {
    await expect(page.getByText("Private Deposit")).toBeVisible();
    await expect(page.getByRole("button", { name: "USDC" }).first()).toBeVisible();
    const deposit = page.locator("#deposit");
    await expect(deposit.getByRole("button", { name: "0.1" })).toBeVisible();
    await expect(deposit.getByRole("button", { name: "10", exact: true })).toBeVisible();
    await expect(deposit.getByRole("button", { name: "100", exact: true })).toBeVisible();
  });

  test("shows the withdraw panel", async ({ page }) => {
    await expect(page.getByText("Private Withdraw")).toBeVisible();
    await expect(page.getByPlaceholder("paste deposit note...")).toBeVisible();
    await expect(page.getByPlaceholder(/can differ from depositor/)).toBeVisible();
  });

  test("shows the architecture diagram with the real stack", async ({ page }) => {
    await expect(page.getByText("Architecture")).toBeVisible();
    await expect(page.getByText("PrismVault")).toBeVisible();
    await expect(page.getByText("PrismRouter")).toBeVisible();
    await expect(page.getByText("Groth16Verifier")).toBeVisible();
    await expect(page.getByText("withdraw.circom")).toBeVisible();
  });

  test("shows the how-it-works section", async ({ page }) => {
    await expect(page.getByText("How it works")).toBeVisible();
    await expect(page.getByText("Prove", { exact: true })).toBeVisible();
  });

  test("deposit button is disabled without a wallet", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Connect wallet to deposit" })
    ).toBeDisabled();
  });

  test("withdraw button is disabled without a wallet", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Connect wallet to withdraw" })
    ).toBeDisabled();
  });

  test("navigates to the deposit section", async ({ page }) => {
    await page.getByRole("link", { name: "Deposit" }).click();
    await expect(page.locator("#deposit")).toBeInViewport();
  });
});
