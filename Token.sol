pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract LendingToken is ERC20, ERC20Permit {
    constructor() ERC20("LendingToken", "LGT") ERC20Permit("LendingToken") {}
        function mintTokens(address account, uint256 value) public{
            _mint(account, value);
        }

        function burnTokens(address account, uint256 value) public{
            _burn(account, value);
        }
}