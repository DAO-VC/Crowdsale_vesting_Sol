use crate::state::Vesting;
use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{CloseAccount, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct CloseVesting<'info> {
    #[account(
        mut,
        close = user,
        seeds = [
            user.key().as_ref(),
            sale_mint.key().as_ref(),
        ],
        bump = vesting.vesting_bump,
        has_one = user,
        has_one = sale_mint,
    )]
    pub vesting: Account<'info, Vesting>,

    #[account(
        mut,
        associated_token::mint = sale_mint,
        associated_token::authority = vesting,
        constraint = vesting_token.amount == 0,
    )]
    pub vesting_token: Account<'info, TokenAccount>,
    pub sale_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn close_vesting(ctx: Context<CloseVesting>) -> Result<()> {
    let user_key = ctx.accounts.user.key();
    let sale_mint_key = ctx.accounts.sale_mint.key();
    let seeds = [
        user_key.as_ref(),
        sale_mint_key.as_ref(),
        &[ctx.accounts.vesting.vesting_bump],
    ];

    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.vesting_token.to_account_info(),
            destination: ctx.accounts.user.to_account_info(),
            authority: ctx.accounts.vesting.to_account_info(),
        },
        &[&seeds],
    ))?;

    Ok(())
}
