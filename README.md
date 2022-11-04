# Crowdsale Vesting SOL

## Prerequisites

Solana and Anchor requires any linux environment. WSL is ok - https://learn.microsoft.com/en-us/windows/wsl/

You have to install development environment - rust + solana + anchor + node

You can find guide here - https://www.anchor-lang.com/docs/installation

1. Download and install Rust - https://www.rust-lang.org/tools/install
2. Download and install Solana Tool Suite - https://docs.solana.com/cli/install-solana-cli-tools
3. Create keypair for development environment
```shell
$ solana-keygen new
```
4. Install nvm (Node Version Manager) - https://github.com/nvm-sh/nvm#installing-and-updating
5. Install node `node 17.4.0`
```bash
$ nvm install 17.4.0
$ nvm use 17.4.0
```
6. Install `avm` - https://www.anchor-lang.com/docs/installation#installing-using-anchor-version-manager-avm-recommended
```bash 
$ sudo apt-get update && sudo apt-get upgrade && sudo apt-get install -y pkg-config build-essential libudev-dev libssl-dev
$ cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```
7. Install latest `anchor`
```bash
$ avm install latest
$ avm use latest
```
Now you should have `anchor 0.25.0`
```
$ anchor --version
anchor-cli 0.25.0
```

## Build and test

1. Install node dependencies
```shell
$ yarn install
```
2. Build solana program
```shell
$ anchor build
```
3. Run integration tests
```shell
$ anchor test
```

## Devnet

### Deploy
```shell
$ anchor deploy --provider.cluster devnet
DWpR44f2YDsQR1MZeucD1wrs1Toe4TbWJrZeM2PMSapm
```

Create devnet tokens

mint authority `G9tfQHxYT8sEUoQN1S6pxuFVTLnkMZ4F1LZ77PLPZ94Q`
```shell
$ spl-token create-token --decimals 9 --mint-authority G9tfQHxYT8sEUoQN1S6pxuFVTLnkMZ4F1LZ77PLPZ94Q --url devnet
CeTriJZCuijyTW2oM9pZEudT4eykCFL6n2MzqhYrUaX
```

Init contract on devnet
```shell
$ anchor run init --provider.cluster devnet
Init transaction 4keGVu6sipoN1PHUzh3xAUkuphq2psp2zqj9Knqq59w89x3XEqfLMdfnTARrpw8x5JAR7PsYawGqAWVN4U2RCbKT
Sale account: FPB5mELqr8UdLdsVHKrMgcUviHGJxk7BRBd4PzeeGyVD
Fund sale tokens to EMBscxK9PUyg1JKJ4T3ajhP221phgdzhE5Cg9VVTYDEB
Done in 11.09s.
```

```
program_id = DWpR44f2YDsQR1MZeucD1wrs1Toe4TbWJrZeM2PMSapm
sale = FPB5mELqr8UdLdsVHKrMgcUviHGJxk7BRBd4PzeeGyVD
sale_mint = CeTriJZCuijyTW2oM9pZEudT4eykCFL6n2MzqhYrUaX
```