import * as anchor from "@project-serum/anchor";
import {BN, Program} from "@project-serum/anchor";
import { CrowdsaleVesting } from "../target/types/crowdsale_vesting";


import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Keypair, PublicKey} from "@solana/web3.js";
import {creatMintIfRequired, getATA, getCurrentBlockTime, mintToATA} from "./utils";

chai.use(chaiAsPromised);

describe("crowdsale-vesting", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const wallet = provider.wallet.publicKey;
  const program = anchor.workspace.CrowdsaleVesting as Program<CrowdsaleVesting>;
  const splProgram = anchor.Spl.token();

  const sale = Keypair.generate();
  const authority = Keypair.generate();
  const saleMint = Keypair.generate();
  const payment = Keypair.generate();

  const user1 = Keypair.generate();
  const user2 = Keypair.generate();

  // создать sale mint
  // создать токены на продажу

  before(async () => {
    await creatMintIfRequired(splProgram, saleMint, wallet);
    await mintToATA(splProgram, wallet, new BN(1_000_000_000), saleMint.publicKey, wallet);
  });

  it("Should initialize sale", async () => {

    // Let's setup price 1 TOKEN (decimal=6) for 0.5 SOL (decimal=9)
    // received_tokens_amount = lamports * price_numerator / price_denominator
    // 1 * 10^6 = 0.5 * 10^9 * price_numerator / price_denominator
    // 2 / 1000 = price_numerator / price_denominator
    const priceNumerator = new BN(2);
    const priceDenominator = new BN(1000);
    const paymentMinAmount = new BN(10_000_000_000); // min amount 10 SOL
    const advanceFraction = 2000; // 20%
    const releaseSchedule = [
      new BN(Math.floor(new Date("2022-12-01T00:00:00Z").getTime() / 1000)), // 1 dec 2022
      new BN(Math.floor(new Date("2023-01-01T00:00:00Z").getTime() / 1000)), // 1 jan 2023
    ];

    const sale1 = Keypair.generate();
    const payment1 = Keypair.generate();

    const pubkeys = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, advanceFraction, releaseSchedule)
      .accounts({
        sale: sale1.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment1.publicKey,
        payer: wallet,
      }).pubkeys();

    const tx = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, advanceFraction, releaseSchedule)
      .accounts({
        sale: sale1.publicKey,
        authority: authority.publicKey,
        saleMint: saleMint.publicKey,
        payment: payment1.publicKey,
        payer: wallet,
      }).signers([sale1]).rpc();

    console.log("Init transaction", tx);
    console.log("Sale account: %s", sale1.publicKey.toString());
    console.log("Fund sale tokens to %s", pubkeys["saleToken"].toString());

    const saleAccount = await program.account.sale.fetch(sale1.publicKey);
    expect(saleAccount.authority).to.be.deep.equal(authority.publicKey);
    expect(saleAccount.isActive).to.be.false;
    expect(saleAccount.priceNumerator.toNumber()).to.be.equal(priceNumerator.toNumber());
    expect(saleAccount.priceDenominator.toNumber()).to.be.equal(priceDenominator.toNumber());
    expect(saleAccount.paymentMinAmount.toNumber()).to.be.equal(paymentMinAmount.toNumber());
    expect(saleAccount.advanceFraction).to.be.equal(advanceFraction);
    expect(saleAccount.releaseSchedule.length).to.be.equal(releaseSchedule.length);
    expect(saleAccount.payment).to.be.deep.equal(payment1.publicKey);
  });

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

  // Должен мочь сменить authority
  // Не должен без authority менять authority
  // Должен мочь сделать pause/resume с authority
  // Не должен без authority делать pause/resume
  // Должен мочь сделать fund
  // Должен мочь сделать прямой fund (через transfer)
  // Должен мочь сделать withdraw (если есть authority)
  // Не должен мочь сделать withdraw (если нет authority)
  // Должен мочь сделать withdraw на всю сумму

  // Должен мочь сделать execute_sale если enabled
  // Не должен мочь сделать execute_sale если disabled

  // Должен получить advance при execute_sale и залоченные в vesting
  // Должен мочь снять из vesting при наструплении unlock даны
  // Должен мочь докупить в активный vesting
  // Должен мочь закрыть пустой вестинг
  // Не должен мочь закрыть не пустой вестинг
  // Не должен мочь докупиться если у вестинга другое расписание

});
