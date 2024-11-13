// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;
import "./Token.sol";
contract Lending is LendingToken{
    LendingToken public token;
    address public owner;
    mapping (address=>uint256) public balanceUser;
    constructor(address _owner,address _tokenAddress){
        owner = _owner;
        token = LendingToken(_tokenAddress);
    }

    function deposit() payable public{
        require(msg.value > 0,"Enter Greater Value");
        balanceUser[msg.sender] += msg.value;
        token.mintTokens(msg.sender,msg.value);
    }

    function withdrawal(uint256 _amount) public{
        require(_amount > 0 , "Zero value");
        require(balanceUser[msg.sender] >= _amount ,"Insufficient balance");
        balanceUser[msg.sender]-=_amount;
        token.burnTokens(msg.sender,_amount);
        payable(msg.sender).transfer(_amount);
    }
}
