import { ethers } from "hardhat";

export const sqrtPX96 = (value: number) => {
    const priceRatio = ethers.toBigInt(value);

    const sqrtPrice = Math.sqrt(Number(priceRatio));

    const scaleFactor = ethers.toBigInt(2) ** ethers.toBigInt(96);

    const sqrtPriceX96 = (ethers.toBigInt(Math.floor(sqrtPrice * Number(scaleFactor))))?.toString();
};


export function encodeError(error:any) {
    return ethers.id(error).slice(0, 10);
}
