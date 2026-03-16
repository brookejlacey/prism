# Prism Protocol — Demo Video Recording Guide & Script

**Project:** Cross-VM Privacy-Preserving DeFi Router for Polkadot Hub
**Hackathon:** Polkadot Solidity Hackathon 2026
**Target Length:** 3:30 (hard cap 4:00)
**GitHub:** https://github.com/brookejlacey/prism

---

## 1. Recording Setup

### Software
- **Screen recorder:** OBS Studio (free) or Loom (faster setup)
  - OBS: Use "Display Capture" source, encode to MP4 (H.264, CRF 18)
  - Loom: Select "Screen + Cam" mode, bubble cam bottom-left
- **Resolution:** 1920x1080 at 30fps minimum (judges will watch fullscreen)
- **Audio:** External mic or headset mic — avoid laptop built-in. Set input gain so your voice peaks around -12dB in OBS. Do a 10-second test clip and listen back before the real take.

### Browser Setup (Chrome, single window, 100% zoom)
Arrange these tabs left-to-right before recording:
1. **Dashboard** — deployed Vercel URL (live, loaded, wallet connected)
2. **GitHub repo** — https://github.com/brookejlacey/prism (README visible)
3. **PrismVault.sol** — open in GitHub to the contract source
4. **lib.rs (PVM)** — open in GitHub to the Rust precompile entry point
5. **Terminal** — VS Code integrated terminal, ready to run tests

### Environment
- Close Slack, Discord, notifications — zero popups during recording
- Dark mode everything (browser, VS Code, terminal)
- Increase VS Code font size to 16px+ so code is readable at 1080p

---

## 2. Pre-Recording Checklist

- [ ] Dashboard loads cleanly at the deployed URL — no console errors
- [ ] Wallet "connected" state visible in the header
- [ ] All five browser tabs loaded and verified
- [ ] Terminal in VS Code has the repo open, sitting at the project root
- [ ] `pnpm test` has been run once already so all dependencies are cached (the on-camera run should be fast)
- [ ] Water nearby — dry mouth kills energy
- [ ] Read the full narration out loud at least twice. Time it. Trim if over 3:45.
- [ ] Close any file explorer / finder windows

---

## 3. Full Narration Script

> Tone: confident, direct, a little bit excited. You are explaining something genuinely clever, not selling snake oil. Speak at a natural pace — slightly faster than conversational but never rushed.

---

### SCENE 1 — Opening Hook (0:00 - 0:10)

**[ACTION: Dashboard is on screen, hero section visible with "Private DeFi on Polkadot Hub" headline. Slowly scroll so the full hero + stats are in view.]**

> "Every DeFi transaction on-chain is public by default. Your wallet, your balance, your entire trading history — visible to everyone. Prism Protocol fixes this for Polkadot Hub."

---

### SCENE 2 — Architecture Overview (0:10 - 0:45)

**[ACTION: Scroll down to the Architecture Diagram component on the dashboard. Hover over sections as you mention them.]**

> "Prism is a cross-VM privacy layer that spans both of Polkadot Hub's execution environments."

**[ACTION: Point cursor at the EVM side of the diagram.]**

> "On the EVM side — Track 1 — we have three Solidity contracts. PrismVault handles private deposits and withdrawals using commitment schemes. PrismRouter coordinates multi-vault routing for token swaps. And CrossVMBridge handles the handoff between EVM and PVM, plus XCM messages to other parachains."

**[ACTION: Move cursor to the PVM side of the diagram.]**

> "On the PVM side — Track 2 — we wrote Rust precompiles that compile to RISC-V for PolkaVM. Poseidon hashing, Pedersen commitments, range proofs, nullifier verification — all the heavy cryptography runs natively in PVM at roughly fourteen times cheaper gas than doing it in Solidity."

**[ACTION: Point at the bridge/XCM connector area.]**

> "The EVM contracts call into these PVM precompiles through the cross-VM interface. And the bridge extends privacy to any parachain via XCM — Asset Hub, Moonbeam, Astar, Bifrost."

---

### SCENE 3 — Live Dashboard Demo (0:45 - 1:50)

**[ACTION: Scroll back up to the Protocol Metrics stats grid. Hover over each card briefly.]**

> "Here are the live protocol metrics — anonymity set size, total deposits, cross-VM transfers, PVM gas savings, and XCM transfer count. These track the state of the deployed contracts on Westend testnet."

**[ACTION: Scroll to the Deposit Panel. Select DOT token, select the 1 denomination.]**

> "Let's walk through a private deposit. I select DOT as my token and a denomination of 1. Denominations are fixed — everyone deposits the same amount so deposits are indistinguishable from each other. That is the foundation of the anonymity set."

**[ACTION: Click the Deposit button. Wait for the commitment note to appear.]**

> "When I deposit, the SDK generates a random secret, computes a Poseidon commitment — routed through the PVM precompile — and inserts it into an on-chain Merkle tree. In return, I get this note string. This note is my private withdrawal key. Whoever holds it can withdraw, and there is no on-chain link between my deposit address and the withdrawal."

**[ACTION: Scroll to the Withdraw Panel. Paste or type the note string.]**

> "To withdraw, I paste the note. The SDK reconstructs the Merkle proof, computes a nullifier hash to prevent double-spending, and submits the withdrawal to a completely different address. The contract verifies the proof, checks the nullifier, and releases the funds — all without revealing which deposit I am spending."

**[ACTION: Click Withdraw, wait for success state.]**

> "Done. Private deposit, private withdrawal, zero link between the two addresses."

**[ACTION: Scroll to the Cross-VM & XCM Bridge panel. Click the "Cross-VM" tab.]**

> "Now the cross-VM bridge. This panel lets me move shielded commitments between EVM and PVM. The commitment gets locked on one side and released on the other — the privacy guarantee is maintained across virtual machines."

**[ACTION: Switch to the "XCM" tab. Select Moonbeam from the parachain dropdown.]**

> "And the XCM tab — this is where it gets really interesting. I can send a private transfer to any connected parachain. I select Moonbeam, enter an amount, and Prism wraps the commitment into an XCM message. On the destination chain, the recipient can claim with the note. Private cross-chain transfers, built on XCM."

---

### SCENE 4 — Code Walkthrough (1:50 - 2:40)

**[ACTION: Switch to the PrismVault.sol tab in the browser. Scroll to the top of the contract.]**

> "Let's look at the contracts. PrismVault is the core — it imports OpenZeppelin's SafeERC20 and ReentrancyGuard, our PoseidonHasher and MerkleTree libraries, and the IPVMCryptoCore interface that bridges to the Rust precompiles."

**[ACTION: Scroll to show the Deposit event, the state variables — pvmCore, commitmentTree, nullifiers mapping.]**

> "Key state: a Merkle tree of commitments, a nullifier map to prevent double-spends, and an immutable reference to the PVM crypto core. Every commitment hash and every nullifier verification goes through the PVM precompile — that is where the fourteen-x gas savings come from."

**[ACTION: Switch to the lib.rs tab. Show the `call` function with the selector dispatch.]**

> "And here is the PVM side. This is the Rust precompile entry point compiled to RISC-V for PolkaVM. It dispatches on the function selector — Poseidon hash, Pedersen commit, range proof verify, nullifier check. Each one is a native Rust implementation instead of expensive Solidity opcodes."

**[ACTION: Switch to the CrossVMBridge.sol tab. Show the XCMTransfer struct and events.]**

> "CrossVMBridge ties it together. It defines CrossVMCommitment structs that track which VM a commitment originated from and where it is headed, plus XCMTransfer structs for the parachain routing. Events fire at every step so indexers can track the flow without breaking privacy."

---

### SCENE 5 — Test Results (2:40 - 2:55)

**[ACTION: Switch to VS Code terminal. Run `pnpm test` from the project root. Let the output scroll.]**

> "Tests. We have 28 contract-level tests covering PrismVault, PrismRouter, and CrossVMBridge — deposits, withdrawals, double-spend prevention, edge cases. Plus 16 end-to-end tests on the dashboard using Playwright."

**[ACTION: Let the terminal show all tests passing — green checkmarks.]**

> "All passing. Full coverage across both tracks."

---

### SCENE 6 — Closing (2:55 - 3:15)

**[ACTION: Switch back to the dashboard. Slowly scroll through the full page one more time.]**

> "Prism Protocol is a complete privacy layer for Polkadot Hub. Solidity contracts for the EVM, Rust precompiles for PVM that cut gas costs by fourteen-x, XCM integration for cross-chain privacy, a TypeScript SDK, and a production-grade dashboard."

**[ACTION: Pause on the hero section for a beat.]**

> "Private DeFi should not be a luxury. With dual-VM architecture on Polkadot Hub, it does not have to be. This is Prism."

**[ACTION: Hold for 2 seconds, then stop recording.]**

---

## 4. Post-Recording

### Editing (keep it minimal)
- Trim any dead air at the start and end
- If you stumbled on a sentence, cut that segment and re-record just the audio for it (Loom lets you trim; OBS requires a video editor like DaVinci Resolve)
- Do NOT add background music — judges often watch with partial attention and music makes narration harder to follow
- Add a 2-second title card at the very start if you want: "Prism Protocol | Polkadot Solidity Hackathon 2026"

### Export Settings
- MP4, H.264, 1080p, 30fps
- Target file size under 100MB
- Upload to YouTube (unlisted) or Loom and share the link in the submission

### Submission Checklist
- [ ] Video link works and is accessible (test in an incognito window)
- [ ] Video is under 4 minutes
- [ ] Audio is clear throughout — no clipping, no background noise
- [ ] Dashboard URL is visible at least once during the recording
- [ ] GitHub repo link is visible at least once during the recording

---

## Quick Reference — Key Numbers to Mention

| Metric | Value |
|---|---|
| PVM gas savings | ~14x cheaper than EVM |
| Solidity contracts | 3 (PrismVault, PrismRouter, CrossVMBridge) |
| Rust precompile modules | 5 (Poseidon, Pedersen, Merkle, Nullifier, Range Proof) |
| Contract tests | 28 |
| E2E tests | 16 |
| Supported parachains | 4 (Asset Hub, Moonbeam, Astar, Bifrost) |
| Token denominations | 0.1, 1, 10, 100 |
| Tracks covered | Track 1 (EVM) + Track 2 (PVM) + XCM |
