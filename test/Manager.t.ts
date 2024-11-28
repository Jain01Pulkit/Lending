import { expect } from "chai";
import { ethers } from "hardhat";
import { encodeError } from "./calculationHelper";

describe("UniswapV3 Add Liquidity and Swap Tests", function () {
	let token1: any;
	let token2: any;
	let Weth: any;
	let owner: any;
	let signers: any;
	let manager: any;
	beforeEach(async () => {
		signers = await ethers.getSigners();
		owner = signers[0];
		let TOKEN1 = await ethers.getContractFactory("TestToken1");
		token1 = await TOKEN1.deploy(owner.getAddress());

		let TOKEN2 = await ethers.getContractFactory("TestToken2");
		token2 = await TOKEN2.deploy(owner.getAddress());

		let WETh = await ethers.getContractFactory("WETH");
		Weth = await WETh.deploy();

		let Manager = await ethers.getContractFactory("Manager");
		manager = await Manager.deploy();
	});

	it("Should Mint a position in Manager Contract", async function () {
    // formula for calculating tick from price: Math.pow(1.0001, tick);
		const lowTick = 84000;      /// calculated for price 4445.199496294341
		const upperTick = 87000;    /// calculated for price 6000.30169230465

    ///// sqrtPrice calculated from sqrtPX96() function in calculationHelper.ts
		const sqrtPrice = 5602277097478614198912276234240n;

		const currentTick = 85176;  ///  calculated for price 4999.904785770063
		await token1
			.connect(owner)
			.mint(owner.getAddress(), ethers.parseEther("1"));
		await token2
			.connect(owner)
			.mint(owner.getAddress(), ethers.parseEther("42"));

		await token1
			.connect(owner)
			.approve(manager.getAddress(), ethers.parseEther("20000000000"));
		await token2
			.connect(owner)
			.approve(manager.getAddress(), ethers.parseEther("50000000000"));
		let pool = await ethers.getContractFactory("Pool");
		/////////// sqrtPrice price resembles 1 token1 = 5000 token2
		//////////// currentTick resembles 4999.904785770063 price
		let poolContract = await pool.deploy(
			await token1.getAddress(),
			await token2.getAddress(),
			sqrtPrice,
			currentTick
		);
		const paramTypes = [
			ethers.ParamType.from({ type: "address" }),
			ethers.ParamType.from({ type: "address" }),
			ethers.ParamType.from({ type: "address" }),
		];
		let encodedData = poolContract.interface._encodeParams(paramTypes, [
			await token1.getAddress(),
			await token2.getAddress(),
			await owner.getAddress(),
		]);
		await token1
			.connect(owner)
			.mint(poolContract.getAddress(), ethers.parseEther("2"));
		await token2
			.connect(owner)
			.mint(poolContract.getAddress(), ethers.parseEther("4"));
		await manager.mint(
			await poolContract.getAddress(),
			lowTick,
			upperTick,
			ethers.parseEther("1"),
			encodedData
		);
		let positionKey = ethers.keccak256(
			ethers.solidityPacked(
				["address", "int24", "int24"],
				[await owner.getAddress(), lowTick, upperTick]
			)
		);
		expect(await poolContract.positions(positionKey)).to.be.equal(
			ethers.parseEther("1")
		);
	});

	it("Should fail due to invalid Lower Tick", async function () {
		let pool = await ethers.getContractFactory("Pool");
		let poolContract = await pool.deploy(
			await token1.getAddress(),
			await token2.getAddress(),
			1,
			0
		);
		await expect(
			manager.mint(await poolContract.getAddress(), -887273, 0, 0, "0x")
		).to.be.revertedWithCustomError(poolContract,"InvalidTickRange()");
	});

	it("Should fail due to invalid Upper Tick", async function () {
		let pool = await ethers.getContractFactory("Pool");
		let poolContract = await pool.deploy(
			await token1.getAddress(),
			await token2.getAddress(),
			1,
			0
		);
		await expect(
			manager.mint(await poolContract.getAddress(), 0,887273, 0, "0x")
		).to.be.revertedWithCustomError(poolContract,"InvalidTickRange()");
	});

	it("Should revert due to minting zero liquidity", async function () {
		let pool = await ethers.getContractFactory("Pool");
		let poolContract = await pool.deploy(
			await token1.getAddress(),
			await token2.getAddress(),
			1,
			0
		);
		await expect(
			manager.mint(await poolContract.getAddress(), 0,1, 0, "0x")
		).to.be.revertedWithCustomError(poolContract,"ZeroLiquidity()");
	});

	it("Should Swap token2 into token1", async function () {
		const lowTick = 84000;
		const upperTick = 87000;
		const sqrtPrice = 5602277097478614198912276234240n;
		const currentTick = 85176;
		const swapAmount = ethers.parseEther("42");
		await token1.connect(owner).mint(owner.getAddress(), swapAmount);
		await token2
			.connect(owner)
			.mint(owner.getAddress(), ethers.parseEther("400000"));

		await token1
			.connect(owner)
			.approve(manager.getAddress(), ethers.parseEther("20000000000"));
		await token2
			.connect(owner)
			.approve(manager.getAddress(), ethers.parseEther("50000000000"));
		let pool = await ethers.getContractFactory("Pool");
		let poolContract = await pool.deploy(
			await token1.getAddress(),
			await token2.getAddress(),
			sqrtPrice,
			currentTick
		);
		const paramTypes = [
			ethers.ParamType.from({ type: "address" }),
			ethers.ParamType.from({ type: "address" }),
			ethers.ParamType.from({ type: "address" }),
		];
		let encodedData = poolContract.interface._encodeParams(paramTypes, [
			await token1.getAddress(),
			await token2.getAddress(),
			await owner.getAddress(),
		]);
		await manager.mint(
			await poolContract.getAddress(),
			lowTick,
			upperTick,
			ethers.parseEther("1"),
			encodedData
		);
		await token1
			.connect(owner)
			.mint(owner.getAddress(), ethers.parseEther("718793847"));
		await manager.swap(
			await poolContract.getAddress(),
			false,
			ethers.parseEther("1"),
			encodedData
		);
		const swapFilter = poolContract.filters.Swap();
		const events = await poolContract.queryFilter(swapFilter);
		const amounts = events.map((event) => {
			return { amount0: event.args.amount0, amount1: event.args.amount1 };
		});
		expect(amounts[0].amount1).to.be.equal(ethers.parseEther("1"));
	});

	it("Should Swap token1 into token2", async function () {
		const lowTick = 84000;
		const upperTick = 87000;
		const sqrtPrice = 5602277097478614198912276234240n;
		const currentTick = 85176;
		//// calculated from this formula ((amount * 10 ** (token1Decimals - token2Decimals)) * Math.sqrt(price) * Math.sqrt(upperPrice)) / (Math.sqrt(upperPrice) - Math.sqrt(price));
		const liquidity = 1517882343751509868544n;
		const swapAmount = ethers.parseEther("42");
		await token1.connect(owner).mint(owner.getAddress(), swapAmount);
		await token2
			.connect(owner)
			.mint(owner.getAddress(), ethers.parseEther("400000"));

		await token1
			.connect(owner)
			.approve(manager.getAddress(), ethers.parseEther("20000000000"));
		await token2
			.connect(owner)
			.approve(manager.getAddress(), ethers.parseEther("50000000000"));
		let pool = await ethers.getContractFactory("Pool");
		let poolContract = await pool.deploy(
			await token1.getAddress(),
			await token2.getAddress(),
			sqrtPrice,
			currentTick
		);
		const paramTypes = [
			ethers.ParamType.from({ type: "address" }),
			ethers.ParamType.from({ type: "address" }),
			ethers.ParamType.from({ type: "address" }),
		];
		let encodedData = poolContract.interface._encodeParams(paramTypes, [
			await token1.getAddress(),
			await token2.getAddress(),
			await owner.getAddress(),
		]);
		await manager.mint(
			await poolContract.getAddress(),
			lowTick,
			upperTick,
			liquidity,
			encodedData
		);
		await token2
			.connect(owner)
			.mint(owner.getAddress(), ethers.parseEther("1"));
		await manager.swap(
			await poolContract.getAddress(),
			true,
			ethers.parseEther("0.01337"),
			encodedData
		);
		const swapFilter = poolContract.filters.Swap();
		const events = await poolContract.queryFilter(swapFilter);
		const amounts = events.map((event) => {
			return { amount0: event.args.amount0, amount1: event.args.amount1 };
		});
		expect(amounts[0].amount0).to.be.equal(ethers.parseEther("0.01337"));
	});
});
