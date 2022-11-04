import * as anchor from "@project-serum/anchor";
import { BN, Program } from "@project-serum/anchor";
import { CrowdsaleVesting } from "../target/types/crowdsale_vesting";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";


import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Keypair, PublicKey} from "@solana/web3.js";
import {creatMintIfRequired, getATA, getCurrentBlockTime, mintToATA} from "./utils";

chai.use(chaiAsPromised);

describe("just vesting no crowdsale", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const wallet = provider.wallet.publicKey;
  const program = anchor.workspace.CrowdsaleVesting as Program<CrowdsaleVesting>;
  const splProgram = anchor.Spl.token();

  const authority = Keypair.generate();
  const saleMint = Keypair.generate();
  const payment = Keypair.generate();

  const priceNumerator = new BN(2);
  const priceDenominator = new BN(1);
  const paymentMinAmount = new BN(LAMPORTS_PER_SOL); // min amount 1 SOL
  const advanceFraction = 2000; // 20%
  const isOnlyVesting = true;
  const releaseSchedule = [
    {
      releaseTime: new BN(Math.floor(new Date("2022-12-01T00:00:00Z").getTime() / 1000)), // 1 dec 2022
      fraction: 4000,
    },
    {
      releaseTime: new BN(Math.floor(new Date("2023-01-01T00:00:00Z").getTime() / 1000)), // 1 jan 2023
      fraction: 4000,
    }
  ];


  before(async () => {
    await creatMintIfRequired(splProgram, saleMint, wallet);
    await mintToATA(splProgram, wallet, new BN(1_000_000_000), saleMint.publicKey, wallet);
  });

  it("Should initialize sale with some advance and vesting", async () => {

    // Let's setup price 1 TOKEN (decimal=9) for 0.5 SOL (decimal=9)
    // received_tokens_amount = lamports * price_numerator / price_denominator
    // 1 * 10^9 = 0.5 * 10^9 * price_numerator / price_denominator
    // 2 / 1000 = price_numerator / price_denominator

    const sale = Keypair.generate();

    const pubkeys = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, advanceFraction,isOnlyVesting, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).pubkeys();

    const tx = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, advanceFraction, isOnlyVesting, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    console.log("Init transaction", tx);
    console.log("Sale account: %s", sale.publicKey.toString());
    console.log("Fund sale tokens to %s", pubkeys["saleToken"].toString());

    const saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.authority).to.be.deep.equal(authority.publicKey);
    expect(saleAccount.isActive).to.be.false;
    expect(saleAccount.priceNumerator.toNumber()).to.be.equal(priceNumerator.toNumber());
    expect(saleAccount.priceDenominator.toNumber()).to.be.equal(priceDenominator.toNumber());
    expect(saleAccount.paymentMinAmount.toNumber()).to.be.equal(paymentMinAmount.toNumber());
    expect(saleAccount.advanceFraction).to.be.equal(advanceFraction);
    expect(saleAccount.releaseSchedule.length).to.be.equal(releaseSchedule.length);
    expect(saleAccount.payment).to.be.deep.equal(payment.publicKey);
  });

  it("Should initialize sale without vesting", async () => {
    const sale = Keypair.generate();

    const pubkeys = await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL), 10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).pubkeys();

    const tx = await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL),10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.authority).to.be.deep.equal(authority.publicKey);
    expect(saleAccount.isActive).to.be.false;
    expect(saleAccount.priceNumerator.toNumber()).to.be.equal(2);
    expect(saleAccount.priceDenominator.toNumber()).to.be.equal(1);
    expect(saleAccount.paymentMinAmount.toNumber()).to.be.equal(LAMPORTS_PER_SOL);
    expect(saleAccount.advanceFraction).to.be.equal(10000);
    expect(saleAccount.releaseSchedule.length).to.be.equal(0);
    expect(saleAccount.payment).to.be.deep.equal(payment.publicKey);
  });

  it("Should initialize sale without advance", async () => {
    const sale = Keypair.generate();

    const releaseSchedule = [
      {
        releaseTime: new BN(Math.floor(new Date("2022-12-01T00:00:00Z").getTime() / 1000)), // 1 dec 2022
        fraction: 5000,
      },
      {
        releaseTime: new BN(Math.floor(new Date("2023-01-01T00:00:00Z").getTime() / 1000)), // 1 jan 2023
        fraction: 5000,
      }
    ];

    const pubkeys = await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL), 0, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).pubkeys();

    const tx = await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL), 0, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.authority).to.be.deep.equal(authority.publicKey);
    expect(saleAccount.isActive).to.be.false;
    expect(saleAccount.priceNumerator.toNumber()).to.be.equal(2);
    expect(saleAccount.priceDenominator.toNumber()).to.be.equal(1);
    expect(saleAccount.paymentMinAmount.toNumber()).to.be.equal(LAMPORTS_PER_SOL);
    expect(saleAccount.advanceFraction).to.be.equal(0);
    expect(saleAccount.releaseSchedule.length).to.be.equal(2);
    expect(saleAccount.payment).to.be.deep.equal(payment.publicKey);
  });

  it("Should initialize sale with empty vesting", async () => {
    const sale = Keypair.generate();

    const releaseSchedule = [
      {
        releaseTime: new BN(Math.floor(new Date("2022-12-01T00:00:00Z").getTime() / 1000)), // 1 dec 2022
        fraction: 0,
      },
      {
        releaseTime: new BN(Math.floor(new Date("2023-01-01T00:00:00Z").getTime() / 1000)), // 1 jan 2023
        fraction: 0,
      }
    ];

    const pubkeys = await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL), 10000, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).pubkeys();

    const tx = await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL), 10000, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.authority).to.be.deep.equal(authority.publicKey);
    expect(saleAccount.isActive).to.be.false;
    expect(saleAccount.priceNumerator.toNumber()).to.be.equal(2);
    expect(saleAccount.priceDenominator.toNumber()).to.be.equal(1);
    expect(saleAccount.paymentMinAmount.toNumber()).to.be.equal(LAMPORTS_PER_SOL);
    expect(saleAccount.advanceFraction).to.be.equal(10000);
    expect(saleAccount.releaseSchedule.length).to.be.equal(2);
    expect(saleAccount.payment).to.be.deep.equal(payment.publicKey);
  });

  it("Should NOT initialize sale with advance > 100%", async () => {
    const sale = Keypair.generate();

    const releaseSchedule = [
      {
        releaseTime: new BN(Math.floor(new Date("2022-12-01T00:00:00Z").getTime() / 1000)), // 1 dec 2022
        fraction: 0,
      },
      {
        releaseTime: new BN(Math.floor(new Date("2023-01-01T00:00:00Z").getTime() / 1000)), // 1 jan 2023
        fraction: 0,
      }
    ];

    await expect(program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL), 10001, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc()).to.be.rejectedWith("FractionsAreNot100Percents");
  });

  it("Should NOT initialize sale with advance + vesting > 100%", async () => {
    const sale = Keypair.generate();

    const releaseSchedule = [
      {
        releaseTime: new BN(Math.floor(new Date("2022-12-01T00:00:00Z").getTime() / 1000)), // 1 dec 2022
        fraction: 4000,
      },
      {
        releaseTime: new BN(Math.floor(new Date("2023-01-01T00:00:00Z").getTime() / 1000)), // 1 jan 2023
        fraction: 4001,
      }
    ];

    await expect(program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL), 2000, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc()).to.be.rejectedWith("FractionsAreNot100Percents");
  });

  it("Should NOT initialize sale with advance + vesting < 100%", async () => {
    const sale = Keypair.generate();

    const releaseSchedule = [
      {
        releaseTime: new BN(Math.floor(new Date("2022-12-01T00:00:00Z").getTime() / 1000)), // 1 dec 2022
        fraction: 4000,
      },
      {
        releaseTime: new BN(Math.floor(new Date("2023-01-01T00:00:00Z").getTime() / 1000)), // 1 jan 2023
        fraction: 4000,
      }
    ];

    await expect(program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL), 1990, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc()).to.be.rejectedWith("FractionsAreNot100Percents");
  });

  it("Should NOT initialize sale with price == 0", async () => {
    const sale = Keypair.generate();

    await expect(program.methods.initialize(new BN(0), new BN(1), new BN(LAMPORTS_PER_SOL),10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc()).to.be.rejectedWith("ZeroPrice");

    await expect(program.methods.initialize(new BN(2), new BN(0), new BN(LAMPORTS_PER_SOL),10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc()).to.be.rejectedWith("ZeroPrice");
  });

  it("Should update authority with right authority", async () => {
    const sale = Keypair.generate();
    const newAuthority = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL),10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    let saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.authority).to.be.deep.equal(authority.publicKey);

    await program.methods.updateAuthority(newAuthority.publicKey)
      .accounts(
        {
          sale: sale.publicKey,
          authority: authority.publicKey,
        }
      ).signers([authority]).rpc();

    saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.authority).to.be.deep.equal(newAuthority.publicKey);
  });

  it("Should NOT update authority without authority", async () => {
    const sale = Keypair.generate();
    const newAuthority = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL),10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    await expect(program.methods.updateAuthority(newAuthority.publicKey)
      .accounts(
        {
          sale: sale.publicKey,
          authority: newAuthority.publicKey,
        }
      ).signers([newAuthority]).rpc()).to.be.rejected;
  });

  it("Should pause and resume with right authority", async () => {
    const sale = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL),10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    let saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.isActive).to.be.false;

    await program.methods.resume()
      .accounts(
        {
          sale: sale.publicKey,
          authority: authority.publicKey,
        }
      ).signers([authority]).rpc();

    saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.isActive).to.be.true;

    await program.methods.pause()
      .accounts(
        {
          sale: sale.publicKey,
          authority: authority.publicKey,
        }
      ).signers([authority]).rpc();

    saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.isActive).to.be.false;
  });

  it("Should NOT pause or resume already paused or active sale", async () => {
    const sale = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL),10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    let saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.isActive).to.be.false;

    await expect(program.methods.pause()
      .accounts(
        {
          sale: sale.publicKey,
          authority: authority.publicKey,
        }
      ).signers([authority]).rpc()).to.be.rejected;

    await program.methods.resume()
      .accounts(
        {
          sale: sale.publicKey,
          authority: authority.publicKey,
        }
      ).signers([authority]).rpc();

    saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.isActive).to.be.true;

    await expect(program.methods.resume()
      .accounts(
        {
          sale: sale.publicKey,
          authority: authority.publicKey,
        }
      ).signers([authority]).rpc()).to.be.rejected;
  });

  it("Should NOT pause and resume without authority", async () => {
    const sale = Keypair.generate();
    const invalidAuthority = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(LAMPORTS_PER_SOL),10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    let saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.isActive).to.be.false;

    await expect(program.methods.resume()
      .accounts(
        {
          sale: sale.publicKey,
          authority: invalidAuthority.publicKey,
        }
      ).signers([invalidAuthority]).rpc()).to.be.rejected;

    await program.methods.resume()
      .accounts(
        {
          sale: sale.publicKey,
          authority: authority.publicKey,
        }
      ).signers([authority]).rpc();

    saleAccount = await program.account.sale.fetch(sale.publicKey);
    expect(saleAccount.isActive).to.be.true;

    await expect(program.methods.pause()
      .accounts(
        {
          sale: sale.publicKey,
          authority: invalidAuthority.publicKey,
        }
      ).signers([invalidAuthority]).rpc()).to.be.rejected;
  });

  // Должен мочь сделать fund
  // Должен мочь сделать прямой fund (через transfer)
  // Должен мочь сделать withdraw (если есть authority)
  // Не должен мочь сделать withdraw (если нет authority)
  // Должен мочь сделать withdraw на всю сумму
  // Должен мочь сделать pause/resume с authority
  // Не должен без authority делать pause/resume

  // Должен мочь init vesting

  // Должен мочь сделать init с вестингом и advance + executeSale + unlock
  // Не должен мочь сделать unlock если нечего брать

  // Должен мочь сделать init без вестинга + executeSale - как с вестинг аккаунтом, так и без вестинг аккаунта
  // Не должен мочь сделать claim для пустого вестинга

  // Должен мочь сделать init без advance + initVesting + executeSale + unlock
  // Не должен мочь сделать executeSale если не проинициализирован вестинг

  // Должен мочь докупить в активный vesting из того же sale
  // Должен мочь докупить в активный vesting из другого sale
  // Не должен мочь докупить если у sale другое расписание
  // Не должен мочь докупить если у sale другой токен

  // Должен мочь докупить если у first_sale не было вестинга

/*
  it("Should init, fund and executeSale and unlock first payment", async () => {
    const currentBlockTime = await getCurrentBlockTime(provider.connection);

    // Price 1 TOKEN (decimal=6) for 0.5 SOL (decimal=9)
    const priceNumerator = new BN(2);
    const priceDenominator = new BN(1000);

    // Min amount 10 SOL
    const paymentMinAmount = new BN(10_000_000_000);
    const advanceFraction = 2000; // 20%
    const releaseSchedule = [
      new BN(currentBlockTime - 5), // -5 sec from now
      new BN(currentBlockTime + 5), // +5 sec from now
    ];

    // init sale
    await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, advanceFraction, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    // fund sale
    await program.methods.fund(new BN(1_000_000_000))
      .accounts({
        sale: sale.publicKey,
        user: wallet,
        source: await getATA(wallet, saleMint.publicKey),
      }).rpc();

    // enable sale
    await program.methods.resume()
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey
      }).signers([authority]).rpc();

    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [wallet.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    // execute sale
    await program.methods.executeSale(new BN(10_000_000_000))
      .accounts({
        sale: sale.publicKey,
        user: wallet,
        userSaleToken: await getATA(wallet, saleMint.publicKey),
        vestingToken,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
      }).rpc();

    // claim tokens
    await program.methods.claim()
      .accounts({
        vestingToken,
        mint: saleMint.publicKey,
        authority: wallet,
        userToken: await getATA(wallet, saleMint.publicKey),
      }).rpc();
  });
 */
});
