import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DECIMALS, MINTING_AMOUNT } from "./constant";

describe("MyToken: Functional & Security Analysis", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];
  let signer0: HardhatEthersSigner;
  let signer1: HardhatEthersSigner;
  let hacker: HardhatEthersSigner;

  beforeEach("Environment Setup: Deploying MyToken", async () => {
    signers = await hre.ethers.getSigners();
    [signer0, signer1, hacker] = signers; // 구조 분해 할당으로 명확화

    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
  });

  describe("Metadata & Initial State Verification", () => {
    it("verify: token metadata (name, symbol, decimals)", async () => {
      expect(await myTokenC.name()).to.equal("MyToken");
      expect(await myTokenC.symbol()).to.equal("MT");
      expect(await myTokenC.decimals()).to.equal(DECIMALS);
    });

    it("verify: initial total supply calculation", async () => {
      const expectedSupply = MINTING_AMOUNT * 10n ** BigInt(DECIMALS);
      expect(await myTokenC.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe("Minting Mechanics & Access Control", () => {
    it("success: owner should increase balance through minting", async () => {
      const targetVolume = hre.ethers.parseUnits("1", DECIMALS);
      const initialBalance = await myTokenC.balanceOf(signer0.address);

      await myTokenC.mint(targetVolume, signer0.address);

      expect(await myTokenC.balanceOf(signer0.address)).to.equal(
        initialBalance + targetVolume
      );
    });

    it("security: unauthorized minting attempt must be reverted", async () => {
      const unauthorizedMintAmount = hre.ethers.parseUnits("100", DECIMALS);

      await expect(
        myTokenC.connect(hacker).mint(unauthorizedMintAmount, hacker.address)
      ).to.be.revertedWith("You are not authorized to manage this contract");
    });
  });

  describe("Transfer & Allowance Logic Flow", () => {
    it("process: standard transfer with event emission", async () => {
      const transferVolume = hre.ethers.parseUnits("0.5", DECIMALS);

      await expect(myTokenC.transfer(transferVolume, signer1.address))
        .to.emit(myTokenC, "Transfer")
        .withArgs(signer0.address, signer1.address, transferVolume);

      expect(await myTokenC.balanceOf(signer1.address)).to.equal(
        transferVolume
      );
    });

    it("revert: transfer attempt exceeding current balance", async () => {
      const excessiveAmount = hre.ethers.parseUnits(
        (MINTING_AMOUNT + 1n).toString(),
        DECIMALS
      );

      await expect(
        myTokenC.transfer(excessiveAmount, signer1.address)
      ).to.be.revertedWith("insufficient balance");
    });

    describe("Delegated Transfer (TransferFrom)", () => {
      const approvalLimit = hre.ethers.parseUnits("10", DECIMALS);

      it("verify: approval event and allowance state", async () => {
        await expect(myTokenC.approve(signer1.address, approvalLimit))
          .to.emit(myTokenC, "Approval")
          .withArgs(signer0.address, signer1.address, approvalLimit);
      });

      it("audit: balance changes after transferFrom execution", async () => {
        const moveAmount = hre.ethers.parseUnits("1", DECIMALS);

        await myTokenC.approve(signer1.address, moveAmount);

        const preBalanceOwner = await myTokenC.balanceOf(signer0.address);
        const preBalanceRecipient = await myTokenC.balanceOf(signer1.address);

        await expect(
          myTokenC
            .connect(signer1)
            .transferFrom(signer0.address, signer1.address, moveAmount)
        ).to.emit(myTokenC, "Transfer");

        expect(await myTokenC.balanceOf(signer0.address)).to.equal(
          preBalanceOwner - moveAmount
        );
        expect(await myTokenC.balanceOf(signer1.address)).to.equal(
          preBalanceRecipient + moveAmount
        );
      });
    });
  });
});
