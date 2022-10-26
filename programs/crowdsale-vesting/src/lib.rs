pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use errors::SaleError;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod crowdsale_vesting {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        price_numerator: u64,
        price_denominator: u64,
        payment_min_amount: u64,
        advance_fraction: u16,
        release_schedule: Vec<u64>,
    ) -> Result<()> {
        instructions::initialize(
            ctx,
            price_numerator,
            price_denominator,
            payment_min_amount,
            advance_fraction,
            release_schedule,
        )
    }

    pub fn update_authority(ctx: Context<WithAuthority>, new_authority: Pubkey) -> Result<()> {
        ctx.accounts.sale.authority = new_authority;
        Ok(())
    }

    pub fn pause(ctx: Context<WithAuthority>) -> Result<()> {
        require!(ctx.accounts.sale.is_active, SaleError::SaleNotActive);
        ctx.accounts.sale.is_active = false;
        Ok(())
    }

    pub fn resume(ctx: Context<WithAuthority>) -> Result<()> {
        require!(ctx.accounts.sale.is_active == false, SaleError::SaleAlreadyActive);
        ctx.accounts.sale.is_active = true;
        Ok(())
    }
    /*
       pub fn fund(ctx: Context<Fund>, amount: u64) -> Result<()> {
           todo!()
       }

       pub fn withdraw(ctx: Context<Withdraw>, sale_token_amount: u64) -> Result<()> {
           todo!()
       }

       pub fn execute_sale(ctx: Context<ExecuteSale>, payment_token_amount: u64) -> Result<()> {
           todo!()
       }

       // vesting
       pub fn claim(ctx: Context<Claim>) -> Result<()> {
           todo!()
       }

       pub fn close_vesting(ctx: Context<CloseVesting>) -> Result<()> {
           todo!()
       }

    */
}
