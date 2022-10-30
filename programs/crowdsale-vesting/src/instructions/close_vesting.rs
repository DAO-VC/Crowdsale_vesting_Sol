use crate::state::Vesting;
use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{CloseAccount, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct CloseVesting<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [
            authority.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump = vesting.vesting_bump,
        has_one = authority,
        has_one = mint,
    )]
    pub vesting: Account<'info, Vesting>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vesting,
        constraint = vesting_token.amount == 0,
    )]
    pub vesting_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn close_vesting(ctx: Context<CloseVesting>) -> Result<()> {
    let authority_key = ctx.accounts.authority.key();
    let mint_key = ctx.accounts.mint.key();
    let seeds = [
        authority_key.as_ref(),
        mint_key.as_ref(),
        &[ctx.accounts.vesting.vesting_bump],
    ];

    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.vesting_token.to_account_info(),
            destination: ctx.accounts.authority.to_account_info(),
            authority: ctx.accounts.vesting.to_account_info(),
        },
        &[&seeds],
    ))?;

    Ok(())
}
