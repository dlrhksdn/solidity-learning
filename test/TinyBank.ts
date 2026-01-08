import hre from "hardhat";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";
import { MyToken, StakingBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("StakingBank: Rewards & Asset Security Test", () => {
  let signers: HardhatEthersSigner[];
  let myTokenC: MyToken;
  let stakingBankC: StakingBank;
  let signer0: HardhatEthersSigner;
  let hacker: HardhatEthersSigner;

  const ADMIN_COUNT = 5;

  beforeEach("Infrastructure Setup", async () => {
    signers = await hre.ethers.getSigners();
    signer0 = signers[0];
    hacker = signers[7];

    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);

    const adminAddresses: string[] = [];
    for (let i = 0; i < ADMIN_COUNT; i++) {
      adminAddresses.push(signers[i].address);
    }

    stakingBankC = await hre.ethers.deployContract("StakingBank", [
      await myTokenC.getAddress(),
      signer0.address,
      signers[1].address,
    ]);

    await myTokenC.setManager(await stakingBankC.getAddress());
  });

  describe("Initial State Audit", () => {
    it("should initialize with zero total staked assets", async () => {
      expect(await stakingBankC.totalStaked()).to.equal(0);
    });

    it("should confirm signer0 has no initial staked balance", async () => {
      expect(await stakingBankC.staked(signer0.address)).to.equal(0);
    });
  });

  describe("Staking Core Mechanism", () => {
    const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);

    it("should successfully lock tokens and update state", async () => {
      const bankAddress = await stakingBankC.getAddress();

      await myTokenC.approve(bankAddress, stakingAmount);
      await expect(stakingBankC.stake(stakingAmount))
        .to.emit(stakingBankC, "Staked")
        .withArgs(signer0.address, stakingAmount);

      expect(await stakingBankC.staked(signer0.address)).to.equal(
        stakingAmount
      );
      expect(await stakingBankC.totalStaked()).to.equal(stakingAmount);

      expect(await myTokenC.balanceOf(bankAddress)).to.equal(stakingAmount);
    });
  });

  describe("Withdrawal & Asset Release", () => {
    const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);

    beforeEach(async () => {
      await myTokenC.approve(await stakingBankC.getAddress(), stakingAmount);
      await stakingBankC.stake(stakingAmount);
    });

    it("should return assets and reset staked balance to zero", async () => {
      await expect(stakingBankC.withdraw(stakingAmount))
        .to.emit(stakingBankC, "Withdraw")
        .withArgs(stakingAmount, signer0.address);

      expect(await stakingBankC.staked(signer0.address)).to.equal(0);
    });
  });

  describe("Reward Calculus & Governance Security", () => {
    it("should accumulate 1MT reward per block during stake period", async () => {
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      const dummyTransferVolume = hre.ethers.parseUnits("1", DECIMALS);
      const BLOCKS = 5n;

      await myTokenC.approve(await stakingBankC.getAddress(), stakingAmount);
      await stakingBankC.stake(stakingAmount);

      for (let i = 0; i < Number(BLOCKS); i++) {
        await myTokenC.transfer(dummyTransferVolume, signer0.address);
      }

      await stakingBankC.withdraw(stakingAmount);

      const expectedBalance = hre.ethers.parseUnits(
        (BLOCKS + MINTING_AMOUNT).toString(),
        DECIMALS
      );
      expect(await myTokenC.balanceOf(signer0.address)).to.be.closeTo(
        expectedBalance,
        hre.ethers.parseUnits("1", DECIMALS)
      );
    });

    it("security: reject reward rate modification by unauthorized hacker", async () => {
      const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);

      await expect(
        stakingBankC.connect(hacker).setRewardPerBlock(rewardToChange)
      ).to.be.revertedWith("AdminAuthority: Restrict to manager only");
    });
  });
});
