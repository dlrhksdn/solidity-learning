// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AdminAuthority.sol";

interface IMyToken {
    function transfer(uint256 amount, address to) external;
    function transferFrom(address from, address to, uint256 amount) external;
    function mint(uint256 amount, address owner) external;
}

contract StakingBank is AdminAuthority {
    event Staked(address indexed account, uint256 quantity);
    event Withdraw(uint256 quantity, address indexed account);

    IMyToken public stakingToken;
    uint256 private constant BASE_REWARD_UNIT = 1 * 10 ** 18;
    uint256 public rewardPerBlock;

    mapping(address => uint256) public staked;
    mapping(address => uint256) public lastClaimedBlock;
    uint256 public totalStaked;

    address[] public participantList;

    constructor(
        IMyToken _stakingToken,
        address _owner,
        address _manager
    ) AdminAuthority(_owner, _manager) {
        stakingToken = _stakingToken;
        rewardPerBlock = BASE_REWARD_UNIT;
    }

    modifier refreshReward(address _target) {
        if (staked[_target] > 0) {
            uint256 blockDelta = block.number - lastClaimedBlock[_target];
            uint256 rewardAmount = (blockDelta * rewardPerBlock * staked[_target]) / totalStaked;
            stakingToken.mint(rewardAmount, _target);
        }
        lastClaimedBlock[_target] = block.number;
        _;
    }

    function setRewardPerBlock(uint256 _newAmount) external validateManager {
        rewardPerBlock = _newAmount;
    }

    function stake(uint256 _quantity) external refreshReward(msg.sender) {
        require(_quantity > 0, "StakingBank: Deposit must be greater than zero");
        
        stakingToken.transferFrom(msg.sender, address(this), _quantity);
        
        if (staked[msg.sender] == 0) {
            participantList.push(msg.sender);
        }

        staked[msg.sender] += _quantity;
        totalStaked += _quantity;
        
        emit Staked(msg.sender, _quantity);
    }

    function withdraw(uint256 _quantity) external refreshReward(msg.sender) {
        require(staked[msg.sender] >= _quantity, "StakingBank: Exceeds staked balance");

        stakingToken.transfer(_quantity, msg.sender);
        staked[msg.sender] -= _quantity;
        totalStaked -= _quantity;

        if (staked[msg.sender] == 0) {
            _removeParticipant(msg.sender);
        }

        emit Withdraw(_quantity, msg.sender);
    }

    function _removeParticipant(address _user) internal {
        for (uint256 i = 0; i < participantList.length; i++) {
            if (participantList[i] == _user) {
                participantList[i] = participantList[participantList.length - 1];
                participantList.pop();
                break;
            }
        }
    }
}