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