import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const decimals = 18n;

describe("My Token", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];

  beforeEach(async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      18,
      100,
    ]);
  });

  describe("TransferFrom (approve & transferFrom)", () => {
    it("signer1 moves signer0 token using approve & transferFrom and checks balances", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];

      const amount = hre.ethers.parseUnits("10", decimals); // 10 MT

      // 1) approve: signer0가 signer1에게 권한 부여
      await expect(myTokenC.approve(signer1.address, amount))
        .to.emit(myTokenC, "Approval")
        .withArgs(signer0.address, signer1.address, amount);

      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, amount)
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(signer0.address, signer1.address, amount);

      const bal0 = await myTokenC.balanceOf(signer0.address);
      const bal1 = await myTokenC.balanceOf(signer1.address);

      expect(bal1).to.equal(amount);
      expect(bal0).to.equal(hre.ethers.parseUnits("100", decimals) - amount);

      const remain = await myTokenC.allowance(signer0.address, signer1.address);
      expect(remain).to.equal(0n);
    });
  });
});
