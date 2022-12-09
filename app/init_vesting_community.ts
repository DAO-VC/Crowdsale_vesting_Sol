import * as anchor from '@project-serum/anchor';

import {Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import { readFileSync } from "fs";
import { BN } from "@project-serum/anchor";

const PROGRAM_ID = new PublicKey("DWpR44f2YDsQR1MZeucD1wrs1Toe4TbWJrZeM2PMSapm");
const PAYMENT = new PublicKey("HFtE6TTTKkSsgKcW68XyRQ4oBM6DEuuZiWzvRHfh2nEj");
const AUTHORITY = new PublicKey("5AtbMm86eTgFVakKqZ3oXzE4pU8sHWB2F8FFhxdwnU8f");
const SALE_MINT = new PublicKey("CeTriJZCuijyTW2oM9pZEudT4eykCFL6n2MzqhYrUaX");

const FUNDING_AMOUNT = new BN("5000000000000000");

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

  const newAuthority = anchor.web3.Keypair.generate();

  // Let's setup price 1 TOKEN (decimal=9) for 0.1 SOL (decimal=9)
  // received_tokens_amount = lamports * price_numerator / price_denominator
  // 1 * 10^9 = 0.1 * 10^9 * price_numerator / price_denominator
  // 10 = price_numerator / price_denominator
  const priceNumerator = new BN(10);
  const priceDenominator = new BN(1);
  const paymentMinAmount = new BN(0);
  const currentBlockTime = await provider.connection.getBlockTime(await provider.connection.getSlot());

  let releaseSchedule = [];
  let sum = 0;
  const fraction = 417;
  const delta_min = 20;
  for (let idx = 1; idx < 24; idx++) {
    sum += fraction;
    releaseSchedule.push({
      releaseTime: new BN(currentBlockTime + delta_min * 60 * idx),
      fraction,
    });
  }
  releaseSchedule.push({
    releaseTime: new BN(currentBlockTime + delta_min * 60 * 24),
    fraction: 10000 - sum,
  });

  const [vesting, _nonce] = await PublicKey.findProgramAddress(
    [/* user */newAuthority.publicKey.toBuffer(), SALE_MINT.toBuffer()],
    program.programId
  );
  const vestingToken = await getATA(vesting, SALE_MINT);
  const userSaleToken = await getATA(/* user */newAuthority.publicKey, SALE_MINT);

  let signature = await provider.connection.requestAirdrop(newAuthority.publicKey, LAMPORTS_PER_SOL);
  await provider.connection.confirmTransaction(signature);

  const pubkeys = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, 0, true, releaseSchedule)
    .accounts({
      sale: sale.publicKey,
      authority: AUTHORITY,
      saleMint: SALE_MINT,
      payment: PAYMENT,
      payer: wallet.publicKey,
    }).pubkeys();

  const tx = await program.methods.initialize(priceNumerator, priceDenominator, paymentMinAmount, 0, true, releaseSchedule)
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
      }).instruction(),
      await program.methods.updateAuthority(newAuthority.publicKey).accounts({
        sale: sale.publicKey,
        authority: AUTHORITY,
      })
        .instruction(),
      await program.methods.initVesting().accounts({
        sale: sale.publicKey,
        saleMint: SALE_MINT,
        user: newAuthority.publicKey,
        vesting,
        vestingToken,
      }).instruction(),
      await program.methods.executeSale(FUNDING_AMOUNT).accounts({
        sale: sale.publicKey,
        user: newAuthority.publicKey,
        userSaleToken,
        saleMint: SALE_MINT,
        payment: PAYMENT,
        vesting,
        vestingToken,
      }).instruction(),
    ])
    .signers([sale, newAuthority]).rpc( );

  console.log("Devnet just vesting initialized");
  console.log("Init transaction", tx);
  console.log("Sale account: %s", sale.publicKey.toString());
  console.log("Vesting authority", newAuthority.secretKey);
}

anchor.setProvider(anchor.AnchorProvider.env());

main();