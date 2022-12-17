import * as anchor from '@project-serum/anchor';

import {tokenVestingProgram} from "@native-to-anchor/token-vesting";
import {Keypair, PublicKey} from "@solana/web3.js";
import {BN} from "@project-serum/anchor";
import {createAssociatedTokenAccountInstruction} from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("DLxB9dSQtA4WJ49hWFhxqiQkD9v6m67Yfk9voxpxrBs4");
const SALE_MINT = new PublicKey("CeTriJZCuijyTW2oM9pZEudT4eykCFL6n2MzqhYrUaX");
const DECIMALS = 1_000_000_000;

const DST_OWNER = new PublicKey("5AtbMm86eTgFVakKqZ3oXzE4pU8sHWB2F8FFhxdwnU8f");

async function releaseTimes(connection: anchor.web3.Connection) {
  const currentBlockTime = await connection.getBlockTime(await connection.getSlot());

  let releaseSchedule = [];
  const deltaMin = 10;
  for (let idx = 0; idx < 37; idx++) {
    releaseSchedule.push(new BN(currentBlockTime + deltaMin * 60 * idx));
  }

  return releaseSchedule;
}

function buildSchedule(releaseTimes: BN[], amounts: number[]) {
  let schedule = [];
  for (let idx = 0; idx < releaseTimes.length; idx++) {
    let amount = new BN(amounts[idx]);
    amount.imul(new BN(DECIMALS));

    schedule.push({
      releaseTime: releaseTimes[idx],
      amount,
    });
  }

  return schedule;
}

async function getATA(owner: PublicKey, mint: PublicKey) {
  const [ata, _nonce] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    anchor.utils.token.ASSOCIATED_PROGRAM_ID
  );
  return ata;
}

async function init_vesting(
  srcToken: PublicKey,
  origin_seeds: Uint8Array,
  schedule: { releaseTime: BN; amount: BN }[],
) {
  const wallet = anchor.Wallet.local().publicKey;
  const vestingProgram = tokenVestingProgram({programId: PROGRAM_ID, provider: anchor.AnchorProvider.env()});

  const [vesting, nonce] = await PublicKey.findProgramAddress(
    [origin_seeds.slice(0, 31)],
    vestingProgram.programId,
  );

  let seeds = origin_seeds.slice(0, 32);
  seeds[31] = nonce;

  const vestingToken = await getATA(vesting, SALE_MINT);
  const dstToken = await getATA(DST_OWNER, SALE_MINT);

  const tx = await vestingProgram.methods.init(Array.from(seeds), schedule.length)
    .accounts(
      {
        vestingAccount: vesting,
        rentProgram: anchor.web3.SYSVAR_RENT_PUBKEY,
      }
    )
    .postInstructions([
      createAssociatedTokenAccountInstruction(
        wallet,
        vestingToken,
        vesting,
        SALE_MINT,
      ),
      await vestingProgram.methods.create(
        Array.from(seeds),
        SALE_MINT,
        dstToken,
        schedule,
      )
        .accounts({
          vestingAccount: vesting,
          vestingTokenAccount: vestingToken,
          sourceTokenAccountOwner: wallet,
          sourceTokenAccount: srcToken,
        }).instruction(),
    ])
    .rpc();

  console.log("tx: ", tx);
  console.log("Vesting Seed: ", Buffer.from(seeds).toString("hex"));
  console.log("Vesting Account: ", vesting.toBase58());
  console.log("Destination Account: ", DST_OWNER.toBase58());
  console.log("Destination Token Account: ", dstToken.toBase58());
}

async function generateSeed(preseed: PublicKey, name: string) {
  return (await PublicKey.findProgramAddress(
    [preseed.toBuffer(), anchor.utils.bytes.utf8.encode(name)],
    PROGRAM_ID,
  ))[0].toBytes();
}

async function main() {
  const vestingPreSeed = Keypair.generate().publicKey;
  console.log("pre-seed: ", vestingPreSeed.toBase58());

  const unlockTimes = await releaseTimes(anchor.getProvider().connection);

  const treasuryUnlockedSeed = await generateSeed(vestingPreSeed, "treasury_unlocked");
  const treasuryUnlockedAmounts = [
    5_000_000,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ];
  const treasuryUnlockedSchedule = buildSchedule(unlockTimes, treasuryUnlockedAmounts);

  const treasurySeed = await generateSeed(vestingPreSeed, "treasury");
  const treasuryAmounts = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333,
    208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333,
  ];
  const treasurySchedule = buildSchedule(unlockTimes, treasuryAmounts);

  const communitySeed = await generateSeed(vestingPreSeed, "community");
  const communityAmounts = [
    0, 0, 0, 0, 0, 0, 0, 1_041_667, 1_041_667,
    1_041_667, 1_041_667, 1_041_667, 1_041_667, 1_041_667, 1_041_667, 1_041_667, 1_041_667, 1_041_667, 1_041_667,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ];
  const communitySchedule = buildSchedule(unlockTimes, communityAmounts);

  const teamSeed = await generateSeed(vestingPreSeed, "team");
  const teamAmounts = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333,
    208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333, 208_333,
  ];
  const teamSchedule = buildSchedule(unlockTimes, teamAmounts);

  const ecosystemSeed = await generateSeed(vestingPreSeed, "ecosystem");
  const ecosystemAmounts = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167,
    104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167, 104_167,
  ];
  const ecosystemSchedule = buildSchedule(unlockTimes, ecosystemAmounts);

  const srcToken = await getATA(anchor.Wallet.local().publicKey, SALE_MINT);


  console.log("Treasury Unlocked Vesting - treasury_unlocked");
  await init_vesting(srcToken, treasuryUnlockedSeed, treasuryUnlockedSchedule);
  console.log("Treasury Vesting - treasury");
  await init_vesting(srcToken, treasurySeed, treasurySchedule);
  console.log("Community Vesting - community");
  await init_vesting(srcToken, communitySeed, communitySchedule);
  console.log("Team Vesting - team");
  await init_vesting(srcToken, teamSeed, teamSchedule);
  console.log("Ecosystem Vesting - ecosystem");
  await init_vesting(srcToken, ecosystemSeed, ecosystemSchedule);
}

anchor.setProvider(anchor.AnchorProvider.env());

main();

async function fetch(seeds: Uint8Array) {
  const vestingProgram = tokenVestingProgram({programId: PROGRAM_ID, provider: anchor.AnchorProvider.env()});

  const [vesting, nonce] = await PublicKey.findProgramAddress(
    [seeds.slice(0, 31)],
    PROGRAM_ID,
  );

  const vestingAccount = await vestingProgram.account.vesting.fetch(vesting);
  console.log(vestingAccount.schedule);
}

async function unlock(seeds: Uint8Array) {
  const wallet = anchor.Wallet.local();
  const vestingProgram = tokenVestingProgram({programId: PROGRAM_ID, provider: anchor.AnchorProvider.env()});

  const [vestingAccount, nonce] = await PublicKey.findProgramAddress(
    [seeds.slice(0, 31)],
    PROGRAM_ID,
  );

  seeds[31] = nonce;

  const vestingTokenAccount = await getATA(vestingAccount, SALE_MINT);
  const vestingData = await vestingProgram.account.vesting.fetch(vestingAccount);
  const destinationTokenAccount = vestingData.destinationAddress;

  const tx = await vestingProgram.methods.unlock(Array.from(seeds)).accounts({
    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
    vestingAccount,
    vestingTokenAccount,
    destinationTokenAccount,
  }).rpc();

}