// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AdminAuthority.sol";

/**
 * @title
 * @dev
 */
contract MyToken is AdminAuthority {
    event AssetTransfer(address indexed sender, address indexed recipient, uint256 quantity);
    event AccessGranted(address indexed authorizedSpender, uint256 quantity);

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public permittedAmount;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimal,
        uint256 _initialStock
    ) AdminAuthority(msg.sender, msg.sender) {
        name = _name;
        symbol = _symbol;
        decimals = _decimal;
        
        _internalMint(_initialStock * 10 ** uint256(decimals), msg.sender);
    }

    function approve(address _authorizedSpender, uint256 _quantity) external {
        permittedAmount[msg.sender][_authorizedSpender] = _quantity;
        emit AccessGranted(_authorizedSpender, _quantity);
    }

    function transfer(uint256 _quantity, address _recipient) external {
        require(balanceOf[msg.sender] >= _quantity, "MyToken: insufficient balance");
        
        balanceOf[msg.sender] -= _quantity;
        balanceOf[_recipient] += _quantity;

        emit AssetTransfer(msg.sender, _recipient, _quantity);
    }

    function transferFrom(address _sender, address _recipient, uint256 _quantity) external {
        require(permittedAmount[_sender][msg.sender] >= _quantity, "MyToken: insufficient allowance");
        require(balanceOf[_sender] >= _quantity, "MyToken: insufficient balance");

        permittedAmount[_sender][msg.sender] -= _quantity;
        balanceOf[_sender] -= _quantity;
        balanceOf[_recipient] += _quantity;

        emit AssetTransfer(_sender, _recipient, _quantity);
    }

    function mint(uint256 _quantity, address _recipient) external validateManager {
        _internalMint(_quantity, _recipient);
    }

    function setManager(address _newManager) external validateOwner {
        manager = _newManager;
    }

    function _internalMint(uint256 _quantity, address _recipient) internal {
        totalSupply += _quantity;
        balanceOf[_recipient] += _quantity;
        emit AssetTransfer(address(0), _recipient, _quantity);
    }
}