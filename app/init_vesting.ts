import * as anchor from '@project-serum/anchor';

import { tokenVestingProgram } from "@native-to-anchor/token-vesting";
import {Keypair, PublicKey} from "@solana/web3.js";
import {BN} from "@project-serum/anchor";
import {createAssociatedTokenAccountInstruction} from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("DLxB9dSQtA4WJ49hWFhxqiQkD9v6m67Yfk9voxpxrBs4");
const SALE_MINT = new PublicKey("CeTriJZCuijyTW2oM9pZEudT4eykCFL6n2MzqhYrUaX");

const DST_OWNER = new PublicKey("5AtbMm86eTgFVakKqZ3oXzE4pU8sHWB2F8FFhxdwnU8f");

function baseSchedule() {
  return [
    { releaseTime: new BN(Math.floor(new Date("2022-11-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2022-12-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-01-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-02-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-03-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-04-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-05-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-06-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-07-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-08-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-09-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-10-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-11-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-12-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-01-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-02-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-03-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-04-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-05-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-06-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-07-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-08-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-09-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-10-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-11-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2024-12-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-01-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-02-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-03-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-04-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-05-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-06-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-07-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-08-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-09-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-10-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2025-11-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
  ];
}

function treasury() {
  const sch = [
    { releaseTime: new BN(Math.floor(new Date("2022-11-08T00:00:00Z").getTime() / 1000)), amount: new BN("5000000000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2022-12-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-01-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-02-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-03-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-04-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-05-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-06-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-07-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-08-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-09-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-10-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-11-08T00:00:00Z").getTime() / 1000)), amount: new BN("0"), },
    { releaseTime: new BN(Math.floor(new Date("2023-12-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-01-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-02-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-03-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-04-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-05-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-06-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-07-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-08-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-09-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-10-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-11-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2024-12-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-01-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-02-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-03-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-04-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-05-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-06-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-07-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-08-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-09-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-10-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
    { releaseTime: new BN(Math.floor(new Date("2025-11-08T00:00:00Z").getTime() / 1000)), amount: new BN("208333000000000"), },
  ];

  let sum = new BN("0");
  for (let idx = 0; idx < sch.length; idx++) {
    sum = sum.add(sch[idx].amount);
  }
  console.log("sum", sum.toString());

  return sch;
}

async function getATA(owner: PublicKey, mint: PublicKey) {
  const [ata, _nonce] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    anchor.utils.token.ASSOCIATED_PROGRAM_ID
  );
  return ata;
}

async function main() {
  const splProgram = anchor.Spl.token();
  const provider = anchor.getProvider();
  const wallet = anchor.Wallet.local();
  const vestingProgram = tokenVestingProgram({ programId: PROGRAM_ID, provider: anchor.AnchorProvider.env()});

  const vestingPreSeed = Keypair.generate().publicKey;
  let seeds = vestingPreSeed.toBytes();
  const [vesting, nonce] = await PublicKey.findProgramAddress(
    [seeds.slice(0, 31)],
    vestingProgram.programId,
  );
  seeds[31] = nonce;

  const vestingToken = await getATA(vesting, SALE_MINT);
  let releaseSchedule = treasury();

  const srcToken = await getATA(wallet.publicKey, SALE_MINT);
  const dstToken = await getATA(DST_OWNER, SALE_MINT);

  const tx = await vestingProgram.methods.init(Array.from(seeds), releaseSchedule.length)
    .accounts(
      {
        vestingAccount: vesting,
        rentProgram: anchor.web3.SYSVAR_RENT_PUBKEY,
      }
    )
    .postInstructions([
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        vestingToken,
        vesting,
        SALE_MINT,
      ),
      await vestingProgram.methods.create(
        Array.from(seeds),
        SALE_MINT,
        dstToken,
        releaseSchedule,
      )
        .accounts({
          vestingAccount: vesting,
          vestingTokenAccount: vestingToken,
          sourceTokenAccountOwner: wallet.publicKey,
          sourceTokenAccount: srcToken,
        }).instruction(),
    ])
    .rpc({skipPreflight: true});

  console.log("tx: ", tx);
  console.log("Vesting Seed: ", seeds);
  console.log("Vesting Account: ", vesting.toBase58());
}

anchor.setProvider(anchor.AnchorProvider.env());

//main();


async function fetch() {
  const provider = anchor.getProvider();
  const wallet = anchor.Wallet.local();
  const vestingProgram = tokenVestingProgram({ programId: PROGRAM_ID, provider: anchor.AnchorProvider.env()});

  const vesting = new PublicKey("DLhP57Cx2mTFVj78xvQVnq4aC5f3XpemsFRtQUs3RMUW");
  const vestingAccount = await vestingProgram.account.vesting.fetch(vesting);
  console.log(vestingAccount);
}

fetch();