// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken2 is ERC20 {
    constructor(address initialOwner)
        ERC20("TestToken2", "TTK2 ")
    {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}