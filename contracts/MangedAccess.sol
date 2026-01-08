// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title 
 * @dev 
 */
abstract contract AdminAuthority {
    address public owner;
    address public manager;

    constructor(address _owner, address _manager) {
        owner = _owner;
        manager = _manager;
    }

    modifier validateOwner() {
        require(msg.sender == owner, "AdminAuthority: Restrict to owner only");
        _;
    }

    modifier validateManager() {
        require(
            msg.sender == manager,
            "AdminAuthority: Restrict to manager only"
        );
        _;
    }

    function transferOwnership(address _newOwner) external validateOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
}