import * as anchor from '@project-serum/anchor';

import { Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { BN } from "@project-serum/anchor";

const PROGRAM_ID = new PublicKey("DWpR44f2YDsQR1MZeucD1wrs1Toe4TbWJrZeM2PMSapm");
const PAYMENT = new PublicKey("HFtE6TTTKkSsgKcW68XyRQ4oBM6DEuuZiWzvRHfh2nEj");
const AUTHORITY = new PublicKey("5AtbMm86eTgFVakKqZ3oXzE4pU8sHWB2F8FFhxdwnU8f");
const SALE_MINT = new PublicKey("CeTriJZCuijyTW2oM9pZEudT4eykCFL6n2MzqhYrUaX");
const FUNDING_AMOUNT = new BN("15000000000000000");

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

async function main() {
  const program = await crowdsaleVestingProgram();
  const splProgram = anchor.Spl.token();

  const provider = anchor.getProvider();
  const wallet = anchor.Wallet.local();

  const sale = anchor.web3.Keypair.generate();

  // Let's setup price 1 TOKEN (decimal=9) for 0.1 SOL (decimal=9)
  // received_tokens_amount = lamports * price_numerator / price_denominator
  // 1 * 10^9 = 0.1 * 10^9 * price_numerator / price_denominator
  // 10 = price_numerator / price_denominator
  const priceNumerator = new BN(10);
  const priceDenominator = new BN(1);
  const paymentMinAmount = new BN(100_000_000); // min amount 0.1 SOL

  const pubkeys = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, 10000, [])
    .accounts({
      sale: sale.publicKey,
      authority: AUTHORITY,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).pubkeys();

  const tx = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, 10000, [])
    .accounts({
      sale: sale.publicKey,
      authority: AUTHORITY,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).
      postInstructions([
      await program.methods.fund(FUNDING_AMOUNT)
        .accounts({
          sale: sale.publicKey,
          user: wallet.publicKey,
          source: await getATA(wallet.publicKey, SALE_MINT),
        }).instruction(),
        await program.methods.resume().accounts({
          sale: sale.publicKey,
          authority: AUTHORITY,
        }).instruction()
    ])
    .signers([sale]).rpc();

  console.log("Devnet public sale (without vesting) initialized");
  console.log("Init transaction", tx);
  console.log("Sale account: %s", sale.publicKey.toString());
}

anchor.setProvider(anchor.AnchorProvider.env());

main();