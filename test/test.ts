import hre from "hardhat";

describe("Sample Test", function () {
  it("hardhat ethers test", async () => {
    const signer = await hre.ethers.getSigner();
  });
  it("ethers test", async () => {
    const result = await hre.ethers.provider.getBlockNumber();
    console.log("Current Block Number:", result);
  });
});
