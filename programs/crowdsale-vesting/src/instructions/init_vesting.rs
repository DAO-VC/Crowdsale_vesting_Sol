use crate::errors::SaleError;
use crate::state::{ReleaseSchedule, Sale, Vesting, VestingSchedule};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct InitVesting<'info> {
    #[account(
        has_one = sale_mint,
    )]
    pub sale: Box<Account<'info, Sale>>,

    pub sale_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        space = Vesting::space(&sale.release_schedule),
        payer = user,
        seeds = [
            user.key().as_ref(),
            sale_mint.key().as_ref(),
        ],
        bump
    )]
    pub vesting: Box<Account<'info, Vesting>>,

    #[account(
        init,
        payer = user,
        associated_token::mint = sale_mint,
        associated_token::authority = vesting,
    )]
    pub vesting_token: Box<Account<'info, TokenAccount>>,

    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn init_vesting(ctx: Context<InitVesting>) -> Result<()> {
    let vesting = &mut ctx.accounts.vesting;
    vesting.first_sale = ctx.accounts.sale.key();
    vesting.user = ctx.accounts.user.key();
    vesting.sale_mint = ctx.accounts.sale_mint.key();
    vesting.vesting_bump = *ctx
        .bumps
        .get("vesting")
        .ok_or_else(|| error!(SaleError::BumpSeedNotInHashMap))?;
    vesting.total_amount = 0;
    vesting.schedule = ctx
        .accounts
        .sale
        .release_schedule
        .iter()
        .map(|&ReleaseSchedule { release_time, .. }| VestingSchedule {
            release_time,
            amount: 0,
        })
        .collect();

    Ok(())
}
