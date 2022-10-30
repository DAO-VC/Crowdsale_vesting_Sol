import * as anchor from "@project-serum/anchor";
import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import {Program, web3, BN, AnchorProvider} from "@project-serum/anchor";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";

export async function creatMintIfRequired(
  spl_program: Program<anchor.SplToken>,
  mint: Keypair,
  mint_authority: PublicKey) {
  const mintAccount = await spl_program.account.mint.fetchNullable(mint.publicKey);
  if (mintAccount == null) {
    await spl_program.methods
      .initializeMint(6, mint_authority, null)
      .accounts({
        mint: mint.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mint])
      .preInstructions([await spl_program.account.mint.createInstruction(mint)])
      .rpc();
  }
}

export async function createToken(
  spl_program: Program<anchor.SplToken>,
  token: Keypair,
  mint: PublicKey,
  authority: PublicKey
) {
  await spl_program.methods.initializeAccount()
    .accounts({
      account: token.publicKey,
      mint,
      authority,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([token])
    .preInstructions([await spl_program.account.token.createInstruction(token)])
    .rpc();
}

export async function mintTo(
  spl_program: Program<anchor.SplToken>,
  amount: number,
  mint: PublicKey,
  to: PublicKey,
  authority: PublicKey,
) {
  await spl_program.methods.mintTo(new BN(amount))
    .accounts({
        mint,
        to,
        authority,
      })
    .rpc();
}

export async function getATA(owner: PublicKey, mint: PublicKey) {
  const [ata, _nonce] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    anchor.utils.token.ASSOCIATED_PROGRAM_ID
  );
  return ata;
}

export async function mintToATA(
  spl_program: Program<anchor.SplToken>,
  owner: PublicKey,
  amount: BN,
  mint: PublicKey,
  mintAuthority: PublicKey
) {
  const ata = await getATA(owner, mint);

  const ataAccount = await spl_program.account.token.fetchNullable(ata);

  let ixs = [
    createAssociatedTokenAccountInstruction(
      mintAuthority,
      ata,
      owner,
      mint)
  ];
  if (ataAccount != null) {
    ixs = [];
  }

  await spl_program.methods.mintTo(amount)
    .accounts({
      mint: mint,
      to: ata,
      authority: mintAuthority,
    })
    .preInstructions(ixs)
    .rpc();

  return ata;
}

export async function tokenBalance(spl_program: Program<anchor.SplToken>, token: PublicKey) {
  let tokenAccount = await spl_program.account.token.fetch(token);
  return tokenAccount.amount.toNumber();
}

export async function waitUntilBlockTime(connection: Connection, until: number) {
  const slot = await connection.getSlot();
  const blockTime = await connection.getBlockTime(slot);
  if (blockTime < until) {
    await new Promise(resolve => setTimeout(resolve, (until - blockTime)*1000));
  }
}

export async function blockTimeFromTx(connection: Connection, txs) {
   const tx = await connection.getTransaction(txs, {commitment: 'confirmed', maxSupportedTransactionVersion: 0})
   return tx.blockTime;
}

export async function getCurrentBlockTime(connection: Connection) {
  const slot = await connection.getSlot();
  return await connection.getBlockTime(slot);
}