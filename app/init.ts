import * as anchor from '@project-serum/anchor';

import {Keypair, PublicKey} from "@solana/web3.js";
import { readFileSync } from "fs";
import {BN} from "@project-serum/anchor";

const PROGRAM_ID = new PublicKey("DWpR44f2YDsQR1MZeucD1wrs1Toe4TbWJrZeM2PMSapm");
const PAYMENT = new PublicKey("5AtbMm86eTgFVakKqZ3oXzE4pU8sHWB2F8FFhxdwnU8f");
const AUTHORITY = new PublicKey("5AtbMm86eTgFVakKqZ3oXzE4pU8sHWB2F8FFhxdwnU8f");
const SALE_MINT = new PublicKey("CeTriJZCuijyTW2oM9pZEudT4eykCFL6n2MzqhYrUaX");

async function crowdsaleVestingProgram() {
  const idl = JSON.parse(
    readFileSync("./target/idl/crowdsale_vesting.json", "utf8")
  );

  return new anchor.Program(idl, PROGRAM_ID);
}

async function main() {
  const program = await crowdsaleVestingProgram();
  const wallet = anchor.Wallet.local();

  const sale = anchor.web3.Keypair.generate();

  // Let's setup price 1 TOKEN (decimal=9) for 0.5 SOL (decimal=9)
  // received_tokens_amount = lamports * price_numerator / price_denominator
  // 1 * 10^9 = 0.5 * 10^9 * price_numerator / price_denominator
  // 2 = price_numerator / price_denominator
  const priceNumerator = new BN(2);
  const priceDenominator = new BN(1);
  const paymentMinAmount = new BN(1_000_000_000); // min amount 1 SOL
  const advanceFraction = 2000; // 20%
  const releaseSchedule = [
    {
      releaseTime: new BN(Math.floor(new Date("2022-10-01T00:00:00Z").getTime() / 1000)), // 1 oct 2022
      fraction: 2000,
    },
    {
      releaseTime: new BN(Math.floor(new Date("2022-11-01T00:00:00Z").getTime() / 1000)), // 1 nov 2022
      fraction: 2000,
    },
    {
      releaseTime: new BN(Math.floor(new Date("2022-12-01T00:00:00Z").getTime() / 1000)), // 1 dec 2022
      fraction: 2000,
    },
    {
      releaseTime: new BN(Math.floor(new Date("2023-01-01T00:00:00Z").getTime() / 1000)), // 1 jan 2023
      fraction: 2000,
    },
  ];

  const pubkeys = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, advanceFraction, false, releaseSchedule)
    .accounts({
      sale: sale.publicKey,
      authority: AUTHORITY,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).pubkeys();

  const tx = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, advanceFraction, false, releaseSchedule)
    .accounts({
      sale: sale.publicKey,
      authority: AUTHORITY,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).
      postInstructions([
        await program.methods.resume().accounts({
          sale: sale.publicKey,
          authority: AUTHORITY,
        }).instruction()
    ])
    .signers([sale]).rpc();

  console.log("Init transaction", tx);
  console.log("Sale account: %s", sale.publicKey.toString());
  console.log("Fund sale tokens to %s", pubkeys["saleToken"].toString());

}

anchor.setProvider(anchor.AnchorProvider.env());

main();