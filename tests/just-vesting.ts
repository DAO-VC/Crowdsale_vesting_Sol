import * as anchor from "@project-serum/anchor";
import { BN, Program } from "@project-serum/anchor";
import { CrowdsaleVesting } from "../target/types/crowdsale_vesting";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";


import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Keypair, PublicKey} from "@solana/web3.js";
import {creatMintIfRequired, getATA, getCurrentBlockTime, mintToATA, tokenBalance} from "./utils";

chai.use(chaiAsPromised);

describe("no crowdsale just vesting", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const wallet = provider.wallet.publicKey;
  const program = anchor.workspace.CrowdsaleVesting as Program<CrowdsaleVesting>;
  const splProgram = anchor.Spl.token();

  const authority = Keypair.generate();
  const saleMint = Keypair.generate();
  const payment = Keypair.generate();

  before(async () => {
    await creatMintIfRequired(splProgram, saleMint, wallet);
    await mintToATA(splProgram, wallet, new BN(100_000_000_000), saleMint.publicKey, wallet);
  });

  it("Should initialize sale with some advance and vesting", async () => {

    // Let's setup price 1 TOKEN (decimal=9) for 0.5 SOL (decimal=9)
    // received_tokens_amount = lamports * price_numerator / price_denominator
    // 1 * 10^9 = 0.5 * 10^9 * price_numerator / price_denominator
    // 2 / 1000 = price_numerator / price_denominator
    const sale = Keypair.generate();
    const priceNumerator = new BN(2);
    const priceDenominator = new BN(1);
    const paymentMinAmount = new BN(0); // min amount 1 SOL
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

    const isOnlyVesting = true;
 
    const pubkeys = await program.methods.initialize(new BN(2), new BN(1), new BN(0), 10000, isOnlyVesting, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).pubkeys();

    const tx = await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, isOnlyVesting, [])
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
    expect(saleAccount.paymentMinAmount.toNumber()).to.be.equal(0);
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

    const pubkeys = await program.methods.initialize(new BN(2), new BN(1), new BN(0), 0, true,releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).pubkeys();

    const tx = await program.methods.initialize(new BN(2), new BN(1), new BN(0), 0, true,releaseSchedule)
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
    expect(saleAccount.paymentMinAmount.toNumber()).to.be.equal(0);
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

    const pubkeys = await program.methods.initialize(new BN(2), new BN(1), new BN(0), 10000, true, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).pubkeys();

    const tx = await program.methods.initialize(new BN(2), new BN(1), new BN(0), 10000, true,releaseSchedule)
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
    expect(saleAccount.paymentMinAmount.toNumber()).to.be.equal(0);
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

    await expect(program.methods.initialize(new BN(2), new BN(1), new BN(0), 10001, true, releaseSchedule)
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

    await expect(program.methods.initialize(new BN(2), new BN(1), new BN(0), 2000, true, releaseSchedule)
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

    await expect(program.methods.initialize(new BN(2), new BN(1), new BN(0), 1990, true, releaseSchedule)
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

    await expect(program.methods.initialize(new BN(0), new BN(1), new BN(0),10000, true, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc()).to.be.rejectedWith("ZeroPrice");

    await expect(program.methods.initialize(new BN(2), new BN(0), new BN(0),10000, true, [])
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

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
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

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
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

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
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

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
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

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
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

  it("Should fund through fund instruction", async () => {
    const sale = Keypair.generate();
    const authority = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(0), 10000, true, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const pubkeys = await program.methods.fund(new BN(1_000_000_000))
      .accounts({
        sale: sale.publicKey,
        user: wallet,
        source: await getATA(wallet, saleMint.publicKey),
      }).pubkeys();

    const saleToken = pubkeys["saleToken"];
    const balance_before = await tokenBalance(splProgram, saleToken);

    await program.methods.fund(new BN(1_000_000_000))
      .accounts({
        sale: sale.publicKey,
        user: wallet,
        source: await getATA(wallet, saleMint.publicKey),
      }).rpc();

    const balance_after = await tokenBalance(splProgram, saleToken);

    expect(balance_after - balance_before).to.be.equal(1_000_000_000);
  });

  it("Should fund through spl transfer", async () => {
    const sale = Keypair.generate();
    const authority = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),  10000, true, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const saleAccount = await program.account.sale.fetch(sale.publicKey);
    const saleToken = saleAccount.saleToken;

    await splProgram.methods.transfer(new BN(1_000_000_000))
      .accounts({
        source: await getATA(wallet, saleMint.publicKey),
        destination: saleToken,
        authority: wallet,
      }).rpc();
  });

  it("Should withdraw remaining tokens with authority", async () => {
    const sale = Keypair.generate();
    const authority = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const saleAccount = await program.account.sale.fetch(sale.publicKey);
    const saleToken = saleAccount.saleToken;

    await splProgram.methods.transfer(new BN(1_000_000_000))
      .accounts({
        source: await getATA(wallet, saleMint.publicKey),
        destination: saleToken,
        authority: wallet,
      }).rpc();

    const balance_before = await tokenBalance(splProgram, saleToken);

    await program.methods.withdraw(new BN(1_000_000_000))
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        destination: await getATA(wallet, saleMint.publicKey),
      }).signers([authority])
      .rpc();

    const balance_after = await tokenBalance(splProgram, saleToken);

    expect(balance_before - balance_after).to.be.equal(1_000_000_000);
  });

  it("Should NOT withdraw remaining tokens without authority", async () => {
    const sale = Keypair.generate();
    const invalidAuthority = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const saleAccount = await program.account.sale.fetch(sale.publicKey);
    const saleToken = saleAccount.saleToken;

    await splProgram.methods.transfer(new BN(1_000_000_000))
      .accounts({
        source: await getATA(wallet, saleMint.publicKey),
        destination: saleToken,
        authority: wallet,
      }).rpc();

    await expect(
      program.methods.withdraw(new BN(1_000_000_000))
        .accounts({
          sale: sale.publicKey,
          authority: invalidAuthority.publicKey,
          destination: await getATA(wallet, saleMint.publicKey),
        }).signers([invalidAuthority]).rpc()
    ).to.be.rejected;
  });

  it("Should withdraw ALL remaining tokens with authority", async () => {
    const sale = Keypair.generate();
    const authority = Keypair.generate();

    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const saleAccount = await program.account.sale.fetch(sale.publicKey);
    const saleToken = saleAccount.saleToken;

    await splProgram.methods.transfer(new BN(1_000_000_000))
      .accounts({
        source: await getATA(wallet, saleMint.publicKey),
        destination: saleToken,
        authority: wallet,
      }).rpc();

    const U64_MAX = "18446744073709551615";

    await program.methods.withdraw(new BN(U64_MAX))
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        destination: await getATA(wallet, saleMint.publicKey),
      }).signers([authority])
      .rpc();

    const balance_after = await tokenBalance(splProgram, saleToken);

    expect(balance_after).to.be.equal(0);
  });

  it("Should init vesting account for sales with vesting", async () => {
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

    await program.methods.initialize(new BN(2), new BN(1), new BN(0), 2000, true, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [wallet.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    await program.methods.initVesting().accounts({
      sale: sale.publicKey,
      saleMint: saleMint.publicKey,
      user: wallet,
      vesting: vesting,
      vestingToken: vestingToken,
    }).rpc();

    const vestingAccount = await program.account.vesting.fetch(vesting);
    expect(vestingAccount.user).to.be.deep.equal(wallet);
    expect(vestingAccount.saleMint).to.be.deep.equal(saleMint.publicKey);
    expect(vestingAccount.totalAmount.toNumber()).to.be.equal(0);
    expect(vestingAccount.schedule.length).to.be.equal(2);
    expect(vestingAccount.schedule[0].releaseTime.toNumber()).to.be.equal(releaseSchedule[0].releaseTime.toNumber());
    expect(vestingAccount.schedule[1].releaseTime.toNumber()).to.be.equal(releaseSchedule[1].releaseTime.toNumber());
  });

  it("Should NOT init vesting account for sales without vesting", async () => {
    const sale = Keypair.generate();
    await program.methods.initialize(new BN(2), new BN(1), new BN(0),10000, true, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      }).signers([sale]).rpc();

    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [wallet.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    await expect(program.methods.initVesting().accounts({
      sale: sale.publicKey,
      saleMint: saleMint.publicKey,
      user: wallet,
      vesting: vesting,
      vestingToken: vestingToken,
    }).rpc()).to.be.rejected;
  });

  it("Should init sale with vesting and advance, fund, executeSale and claim", async () => {
    const sale = Keypair.generate();

    const currentBlockTime = await getCurrentBlockTime(provider.connection);

    const releaseSchedule = [
      {
        releaseTime: new BN(currentBlockTime - 1),
        fraction: 4000,
      },
      {
        releaseTime: new BN(currentBlockTime + 1000),
        fraction: 4000,
      }
    ];

    //const user = Keypair.generate();
    await provider.connection.requestAirdrop(authority.publicKey, LAMPORTS_PER_SOL);

    // init, fund and resume
    await program.methods.initialize(new BN(2), new BN(1), new BN(0), 2000, true, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale, authority]).rpc();

    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [/* user */authority.publicKey.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    const userSaleToken = await getATA(/* user */authority.publicKey, saleMint.publicKey)

    // execute sale for 0.001 SOL and will receive 20% from 0.002 tokens, remaining 80% will in vestingToken
    await program.methods.executeSale(new BN(1_000)).accounts({
      sale: sale.publicKey,
      user: /* user */ authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    }).preInstructions([
      await program.methods.initVesting().accounts({
        sale: sale.publicKey,
        saleMint: saleMint.publicKey,
        user: authority.publicKey,
        vesting,
        vestingToken,
      }).instruction()
    ])
      .signers([authority])
      .rpc();

    // 0.001 SOL / 0.5 token per SOL * 20% = 0.0004 tokens
    // expect(await tokenBalance(splProgram, userSaleToken)).to.be.equal(400_000);

    await program.methods.claim().accounts({
      vesting,
      vestingToken,
      saleMint: saleMint.publicKey,
      user: authority .publicKey,
      userToken: userSaleToken,
    }).signers([authority]).rpc();

    expect(await tokenBalance(splProgram, userSaleToken)).to.be.equal(600);

    await expect(program.methods.claim().accounts({
      vesting,
      vestingToken,
      saleMint: saleMint.publicKey,
      user: /* user */ authority.publicKey,
      userToken: userSaleToken,
    }).signers([authority]).rpc()).to.be.rejected;
  });

/*   it("Should init sale with only advance, fund, executeSale and claim", async () => {
    const sale = Keypair.generate();

    const user = Keypair.generate();
    await provider.connection.requestAirdrop(user.publicKey, LAMPORTS_PER_SOL);

    // init, fund and resume
     await program.methods.initialize(new BN(2), new BN(1), new BN(0), 10000, true, [])
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale, authority]).rpc();

    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [user.publicKey.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);
    const userSaleToken = await getATA(user.publicKey, saleMint.publicKey)

    await program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale.publicKey,
      user: user.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    })
      .signers([user])
      .rpc();

    expect(await tokenBalance(splProgram, userSaleToken)).to.be.equal(2_000_000);
  }); */

  it("Should init sale with only vesting, fund, executeSale and claim", async () => {
    const sale = Keypair.generate();

    const currentBlockTime = await getCurrentBlockTime(provider.connection);

    const releaseSchedule = [
      {
        releaseTime: new BN(currentBlockTime - 1),
        fraction: 5000,
      },
      {
        releaseTime: new BN(currentBlockTime + 1000),
        fraction: 5000,
      }
    ];

    const authority = Keypair.generate();
    await provider.connection.requestAirdrop(authority.publicKey, LAMPORTS_PER_SOL);

    // init, fund and resume
    await program.methods.initialize(new BN(2), new BN(1), new BN(0), 0, true, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale, authority]).rpc();

    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [authority.publicKey.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    const userSaleToken = await getATA(authority.publicKey, saleMint.publicKey)

    await program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale.publicKey,
      user: authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    }).preInstructions([
      await program.methods.initVesting().accounts({
        sale: sale.publicKey,
        saleMint: saleMint.publicKey,
        user: authority.publicKey,
        vesting,
        vestingToken,
      }).instruction()
    ])
      .signers([authority])
      .rpc();

    // 0.001 SOL / 0.5 token per SOL * 20% = 0.0004 tokens
    expect(await tokenBalance(splProgram, userSaleToken)).to.be.equal(0);

    await program.methods.claim().accounts({
      vesting,
      vestingToken,
      saleMint: saleMint.publicKey,
      user: authority.publicKey,
      userToken: userSaleToken,
    }).signers([authority]).rpc();

    expect(await tokenBalance(splProgram, userSaleToken)).to.be.equal(500000);

    await expect(program.methods.claim().accounts({
      vesting,
      vestingToken,
      saleMint: saleMint.publicKey,
      user: authority.publicKey,
      userToken: userSaleToken,
    }).signers([authority]).rpc()).to.be.rejected;
  });

  it("Should NOT executeSale without inited vesting", async () => {
    const sale = Keypair.generate();

    const currentBlockTime = await getCurrentBlockTime(provider.connection);

    const releaseSchedule = [
      {
        releaseTime: new BN(currentBlockTime - 1),
        fraction: 5000,
      },
      {
        releaseTime: new BN(currentBlockTime + 1000),
        fraction: 5000,
      }
    ];

    const authority =  Keypair.generate();
    await provider.connection.requestAirdrop(authority.publicKey, LAMPORTS_PER_SOL);

    // init, fund and resume
    await program.methods.initialize(new BN(2), new BN(1), new BN(0), 0, true, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale, authority]).rpc();

    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [authority.publicKey.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    const userSaleToken = await getATA(authority.publicKey, saleMint.publicKey)

    await expect(program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale.publicKey,
      user: authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    })
      .signers([authority])
      .rpc()).to.be.rejected;
  });

  it("Should executeSale multiple times for the same sale", async () => {
    const sale = Keypair.generate();

    const currentBlockTime = await getCurrentBlockTime(provider.connection);

    const releaseSchedule = [
      {
        releaseTime: new BN(currentBlockTime - 1),
        fraction: 5000,
      },
      {
        releaseTime: new BN(currentBlockTime + 1000),
        fraction: 5000,
      }
    ];

    const authority =  Keypair.generate();
    await provider.connection.requestAirdrop(authority.publicKey, LAMPORTS_PER_SOL);

    // init, fund and resume
    await program.methods.initialize(new BN(1), new BN(1), new BN(0), 0, true, releaseSchedule)
      .accounts({
        sale: sale.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale, authority]).rpc();

    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [authority.publicKey.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    const userSaleToken = await getATA(authority.publicKey, saleMint.publicKey)

    await program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale.publicKey,
      user: authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    }).preInstructions([
      await program.methods.initVesting().accounts({
        sale: sale.publicKey,
        saleMint: saleMint.publicKey,
        user: authority.publicKey,
        vesting,
        vestingToken,
      }).instruction()
    ])
      .signers([authority])
      .rpc();

    let vestingAccount = await program.account.vesting.fetch(vesting);
    expect(vestingAccount.totalAmount.toNumber()).to.be.equal(1_000_000);
    expect(vestingAccount.schedule[0].amount .toNumber()).to.be.equal(500_000);
    expect(vestingAccount.schedule[1].amount .toNumber()).to.be.equal(500_000);
    expect(await tokenBalance(splProgram, vestingToken)).to.be.equal(1_000_000);

    await program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale.publicKey,
      user: authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    })
      .signers([authority])
      .rpc();

    vestingAccount = await program.account.vesting.fetch(vesting);
    expect(vestingAccount.totalAmount.toNumber()).to.be.equal(2_000_000);
    expect(vestingAccount.schedule[0].amount .toNumber()).to.be.equal(1_000_000);
    expect(vestingAccount.schedule[1].amount .toNumber()).to.be.equal(1_000_000);
    expect(await tokenBalance(splProgram, vestingToken)).to.be.equal(2_000_000);
  });

  it("Should executeSale multiple times for different sales with same schedule", async () => {
    const sale1 = Keypair.generate();
    const sale2 = Keypair.generate();

    const currentBlockTime = await getCurrentBlockTime(provider.connection);

    const releaseSchedule1 = [
      {
        releaseTime: new BN(currentBlockTime - 1),
        fraction: 5000,
      },
      {
        releaseTime: new BN(currentBlockTime + 1000),
        fraction: 5000,
      }
    ];

    const authority =  Keypair.generate();
    await provider.connection.requestAirdrop(authority.publicKey, LAMPORTS_PER_SOL);

    // Init sale1
    await program.methods.initialize(new BN(1), new BN(1), new BN(0), 0, true, releaseSchedule1)
      .accounts({
        sale: sale1.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale1.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale1.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale1, authority]).rpc();

    const releaseSchedule2 = [
      {
        releaseTime: new BN(currentBlockTime - 1),
        fraction: 4000,
      },
      {
        releaseTime: new BN(currentBlockTime + 1000),
        fraction: 4000,
      }
    ];

    // init sale2
    await program.methods.initialize(new BN(1), new BN(1), new BN(0), 2000, true, releaseSchedule2)
      .accounts({
        sale: sale2.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale2.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale2.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale2, authority]).rpc();


    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [authority.publicKey.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    const userSaleToken = await getATA(authority.publicKey, saleMint.publicKey)

    // executeSale for sale1
    await program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale1.publicKey,
      user: authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    }).preInstructions([
      await program.methods.initVesting().accounts({
        sale: sale1.publicKey,
        saleMint: saleMint.publicKey,
        user: authority.publicKey,
        vesting,
        vestingToken,
      }).instruction()
    ])
      .signers([authority])
      .rpc();

    let vestingAccount = await program.account.vesting.fetch(vesting);
    expect(vestingAccount.totalAmount.toNumber()).to.be.equal(1_000_000);
    expect(vestingAccount.schedule[0].amount .toNumber()).to.be.equal(500_000);
    expect(vestingAccount.schedule[1].amount .toNumber()).to.be.equal(500_000);
    expect(await tokenBalance(splProgram, vestingToken)).to.be.equal(1_000_000);

    // executeSale for sale2
    await program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale2.publicKey,
      user: authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    })
      .signers([authority])
      .rpc();

    vestingAccount = await program.account.vesting.fetch(vesting);
    expect(vestingAccount.totalAmount.toNumber()).to.be.equal(1_800_000);
    expect(vestingAccount.schedule[0].amount .toNumber()).to.be.equal(900_000);
    expect(vestingAccount.schedule[1].amount .toNumber()).to.be.equal(900_000);
    expect(await tokenBalance(splProgram, vestingToken)).to.be.equal(1_800_000);
  });

  it("Should NOT executeSale multiple times for different sales with different schedule", async () => {
    const sale1 = Keypair.generate();
    const sale2 = Keypair.generate();

    const currentBlockTime = await getCurrentBlockTime(provider.connection);

    const releaseSchedule1 = [
      {
        releaseTime: new BN(currentBlockTime - 1),
        fraction: 5000,
      },
      {
        releaseTime: new BN(currentBlockTime + 1000),
        fraction: 5000,
      }
    ];

    const authority =  Keypair.generate();
    await provider.connection.requestAirdrop(authority.publicKey, LAMPORTS_PER_SOL);

    // Init sale1
    await program.methods.initialize(new BN(2), new BN(1), new BN(0), 0, true, releaseSchedule1)
      .accounts({
        sale: sale1.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale1.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale1.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale1, authority]).rpc();

    const releaseSchedule2 = [
      {
        releaseTime: new BN(currentBlockTime - 1),
        fraction: 4000,
      },
      {
        releaseTime: new BN(currentBlockTime + 1000),
        fraction: 2000,
      },
      {
        releaseTime: new BN(currentBlockTime + 2000),
        fraction: 2000,
      }
    ];

    // init sale2
    await program.methods.initialize(new BN(4), new BN(1), new BN(0), 2000, true, releaseSchedule2)
      .accounts({
        sale: sale2.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment.publicKey,
        payer: wallet,
      })
      .postInstructions([
        await program.methods.fund(new BN(1_000_000_000))
          .accounts({
            sale: sale2.publicKey,
            user: wallet,
            source: await getATA(wallet, saleMint.publicKey),
          }).instruction(),
        await program.methods.resume().accounts({
          sale: sale2.publicKey,
          authority: authority.publicKey,
        }).instruction()
      ])
      .signers([sale2, authority]).rpc();


    const [vesting, _nonce] = await PublicKey.findProgramAddress(
      [authority.publicKey.toBuffer(), saleMint.publicKey.toBuffer()],
      program.programId
    );
    const vestingToken = await getATA(vesting, saleMint.publicKey);

    const userSaleToken = await getATA(authority.publicKey, saleMint.publicKey)

    // executeSale for sale1
    await program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale1.publicKey,
      user: authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    }).preInstructions([
      await program.methods.initVesting().accounts({
        sale: sale1.publicKey,
        saleMint: saleMint.publicKey,
        user: authority.publicKey,
        vesting,
        vestingToken,
      }).instruction()
    ])
      .signers([authority])
      .rpc();

    let vestingAccount = await program.account.vesting.fetch(vesting);
    expect(vestingAccount.totalAmount.toNumber()).to.be.equal(1_000_000);
    expect(vestingAccount.schedule[0].amount .toNumber()).to.be.equal(500_000);
    expect(vestingAccount.schedule[1].amount .toNumber()).to.be.equal(500_000);
    expect(await tokenBalance(splProgram, vestingToken)).to.be.equal(1_000_000);

    // executeSale for sale2
    await expect(program.methods.executeSale(new BN(1_000_000)).accounts({
      sale: sale2.publicKey,
      user: authority.publicKey,
      userSaleToken,
      saleMint: saleMint.publicKey,
      payment: payment.publicKey,
      vesting,
      vestingToken,
    })
      .signers([authority])
      .rpc()).to.be.rejected;
  });
});
