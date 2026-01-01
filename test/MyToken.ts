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

  describe("ERC20 Delegation Operations", () => {
    it("should successfully execute a delegated transfer (Approve -> TransferFrom)", async () => {
      // 0. 준비: 계정 명칭과 전송 금액 변경
      const [owner, delegate] = await ethers.getSigners();
      const vaultAmount = ethers.parseUnits("100", 18); // 초기 발행량
      const allowanceLimit = ethers.parseUnits("15.5", 18); // 15.5 MT (수치 변경)

      // [Step A] 권한 위임 (Authorization)
      // 명칭 변경: 'approve' 과정을 '권한 위임'으로 표현
      const authTx = await myTokenC
        .connect(owner)
        .approve(delegate.address, allowanceLimit);

      await expect(authTx)
        .to.emit(myTokenC, "Approval")
        .withArgs(owner.address, delegate.address, allowanceLimit);

      // [Step B] 대리 전송 실행 (Pull Mechanism)
      // signer1이 signer0의 자산을 자신에게로 '당겨오는' 로직
      const pullTx = await myTokenC
        .connect(delegate)
        .transferFrom(owner.address, delegate.address, allowanceLimit);

      await expect(pullTx)
        .to.emit(myTokenC, "Transfer")
        .withArgs(owner.address, delegate.address, allowanceLimit);

      // [Step C] 최종 잔액 감사 (Audit)
      const ownerFinalBalance = await myTokenC.balanceOf(owner.address);
      const delegateFinalBalance = await myTokenC.balanceOf(delegate.address);

      // 산식으로 검증: $100 - 15.5 = 84.5$
      expect(ownerFinalBalance).to.equal(vaultAmount - allowanceLimit);
      expect(delegateFinalBalance).to.equal(allowanceLimit);

      // 추가 검증: 남은 권한(Allowance)이 0인지 확인
      const remainingLimit = await myTokenC.allowance(
        owner.address,
        delegate.address
      );
      expect(remainingLimit).to.equal(0n);
    });
  });
});
