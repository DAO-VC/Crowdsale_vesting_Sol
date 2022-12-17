import * as anchor from '@project-serum/anchor';

import {Keypair, PublicKey} from "@solana/web3.js";
import { readFileSync } from "fs";
import { BN } from "@project-serum/anchor";

// Deployed program id
const PROGRAM_ID = new PublicKey("DWpR44f2YDsQR1MZeucD1wrs1Toe4TbWJrZeM2PMSapm");

// Account which will receive SOL payments for the sale
const PAYMENT = new PublicKey("HFtE6TTTKkSsgKcW68XyRQ4oBM6DEuuZiWzvRHfh2nEj");

// The authority which can pause/resume the sale
const AUTHORITY = new PublicKey("5AtbMm86eTgFVakKqZ3oXzE4pU8sHWB2F8FFhxdwnU8f");

// The sale token mint address
const SALE_MINT = new PublicKey("CeTriJZCuijyTW2oM9pZEudT4eykCFL6n2MzqhYrUaX");

const SOURCE_TOKEN_ACCOUNT = new PublicKey("2LNXZhTHzyBZgYLMbZdXwopivASeEcDrFRYUHx19Utvg");

// The amount of tokens to fund the sale with
// 15_000_000 * 10^9
const PUBLIC_SALE_FUNDING_AMOUNT = new BN("15000000000000000");

// 5_000_000 * 10^9
const PRIVATE_SALE_FUNDING_AMOUNT = new BN("5000000000000000");

const PUBLIC_SALE_PRICE_NUMERATOR = new BN(10);
const PUBLIC_SALE_PRICE_DENOMINATOR = new BN(1);
const PUBLIC_SALE_PAYMENT_MIN_AMOUNT = new BN(100_000_000); // min amount 0.1 SOL

const PRIVATE_SALE_PRICE_NUMERATOR = new BN(10);
const PRIVATE_SALE_PRICE_DENOMINATOR = new BN(1);
const PRIVATE_SALE_PAYMENT_MIN_AMOUNT = new BN(100_000_000); // min amount 0.1 SOL

// -------------------------------------------------------------------------------------------------------------------

async function crowdsaleVestingProgram() {
  const idl = JSON.parse(
    readFileSync("./target/idl/crowdsale_vesting.json", "utf8")
  );

  return new anchor.Program(idl, PROGRAM_ID);
}

async function getATA(owner: PublicKey, mint: PublicKey) {
  const [ata, _nonce] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    anchor.utils.token.ASSOCIATED_PROGRAM_ID
  );
  return ata;
}

async function publicSale() {
  const program = await crowdsaleVestingProgram();
  const wallet = anchor.Wallet.local();

  const sale = Keypair.generate();

  // Let's setup price 1 TOKEN (decimal=9) for 0.1 SOL (decimal=9)
  // received_tokens_amount = lamports * price_numerator / price_denominator
  // 1 * 10^9 = 0.1 * 10^9 * price_numerator / price_denominator
  // 10 = price_numerator / price_denominator
  const priceNumerator = PUBLIC_SALE_PRICE_NUMERATOR;
  const priceDenominator = PUBLIC_SALE_PRICE_DENOMINATOR;
  const paymentMinAmount = PUBLIC_SALE_PAYMENT_MIN_AMOUNT; // min amount 0.1 SOL

  const pubkeys = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, 10000, false, [])
    .accounts({
      sale: sale.publicKey,
      authority: wallet.publicKey,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).pubkeys();

  const tx = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, 10000, false, [])
    .accounts({
      sale: sale.publicKey,
      authority: wallet.publicKey,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).
    postInstructions([
      await program.methods.fund(PUBLIC_SALE_FUNDING_AMOUNT)
        .accounts({
          sale: sale.publicKey,
          user: wallet.publicKey,
          source: SOURCE_TOKEN_ACCOUNT,
        }).instruction(),
      await program.methods.resume().accounts({
        sale: sale.publicKey,
        authority: wallet.publicKey,
      }).instruction(),
      await program.methods.updateAuthority(AUTHORITY)
        .accounts({
          sale: sale.publicKey,
          authority: wallet.publicKey,
        }).instruction(),
    ])
    .signers([sale]).rpc();

  console.log("Public sale initialized");
  console.log("Init transaction", tx);
  console.log("Sale account: %s", sale.publicKey.toString());
}

async function privateSale() {
  const program = await crowdsaleVestingProgram();
  const wallet = anchor.Wallet.local();
  const sale = Keypair.generate();

  // Let's setup price 1 TOKEN (decimal=9) for 0.1 SOL (decimal=9)
  // received_tokens_amount = lamports * price_numerator / price_denominator
  // 1 * 10^9 = 0.1 * 10^9 * price_numerator / price_denominator
  // 10 = price_numerator / price_denominator
  const priceNumerator = PRIVATE_SALE_PRICE_NUMERATOR;
  const priceDenominator = PRIVATE_SALE_PRICE_DENOMINATOR;
  const paymentMinAmount = PRIVATE_SALE_PAYMENT_MIN_AMOUNT; // min amount 0.1 SOL

  const releaseSchedule = schedule();

  const pubkeys = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, 0, false, releaseSchedule)
    .accounts({
      sale: sale.publicKey,
      authority: wallet.publicKey,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).pubkeys();

  const tx = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, 0, false, releaseSchedule)
    .accounts({
      sale: sale.publicKey,
      authority: wallet.publicKey,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).
    postInstructions([
      await program.methods.fund(PRIVATE_SALE_FUNDING_AMOUNT)
        .accounts({
          sale: sale.publicKey,
          user: wallet.publicKey,
          source: SOURCE_TOKEN_ACCOUNT,
        }).instruction(),
      await program.methods.resume().accounts({
        sale: sale.publicKey,
        authority: wallet.publicKey,
      }).instruction(),
      await program.methods.updateAuthority(AUTHORITY)
        .accounts({
          sale: sale.publicKey,
          authority: wallet.publicKey,
        }).instruction(),
    ])
    .signers([sale]).rpc();

  console.log("Private sale initialized");
  console.log("Init transaction", tx);
  console.log("Sale account: %s", sale.publicKey.toString());
}

function schedule() {
  return [
    { releaseTime: new BN(Math.floor(new Date("2022-11-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2022-12-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2023-01-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2023-02-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2023-03-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2023-04-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2023-05-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2023-06-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2023-07-08T00:00:00Z").getTime() / 1000)), fraction: 0, },
    { releaseTime: new BN(Math.floor(new Date("2023-08-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2023-09-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2023-10-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2023-11-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2023-12-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-01-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-02-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-03-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-04-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-05-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-06-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-07-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-08-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-09-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-10-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-11-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2024-12-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-01-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-02-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-03-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-04-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-05-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-06-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-07-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-08-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-09-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-10-08T00:00:00Z").getTime() / 1000)), fraction: 417, },
    { releaseTime: new BN(Math.floor(new Date("2025-11-08T00:00:00Z").getTime() / 1000)), fraction: 409, },
  ];
}

anchor.setProvider(anchor.AnchorProvider.env());

async function main() {
  await publicSale();
  await privateSale();
}

main();