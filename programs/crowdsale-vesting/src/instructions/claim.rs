use crate::errors::SaleError;
use crate::state::{Vesting, VestingSchedule};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        mut,
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
    )]
    pub vesting_token: Account<'info, TokenAccount>,
    pub sale_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = sale_mint,
        associated_token::authority = user,
    )]
    pub user_token: Account<'info, TokenAccount>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn claim(ctx: Context<Claim>) -> Result<()> {
    let clock = Clock::get().map_err(Into::<anchor_lang::error::Error>::into)?;

    let total_amount_to_transfer: u64 = ctx
        .accounts
        .vesting
        .schedule
        .iter()
        .filter_map(|line| {
            if clock.unix_timestamp as u64 >= line.release_time {
                Some(line.amount)
            } else {
                None
            }
        })
        .sum();

    require_gt!(total_amount_to_transfer, 0, SaleError::NothingToClaim);

    ctx.accounts.vesting.schedule = ctx
        .accounts
        .vesting
        .schedule
        .iter()
        .map(|line| {
            if clock.unix_timestamp as u64 >= line.release_time {
                VestingSchedule {
                    release_time: line.release_time,
                    amount: 0,
                }
            } else {
                line.clone()
            }
        })
        .collect();

    let user_key = ctx.accounts.user.key();
    let sale_mint_key = ctx.accounts.sale_mint.key();
    let seeds = [
        user_key.as_ref(),
        sale_mint_key.as_ref(),
        &[ctx.accounts.vesting.vesting_bump],
    ];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vesting_token.to_account_info(),
                to: ctx.accounts.user_token.to_account_info(),
                authority: ctx.accounts.vesting.to_account_info(),
            },
            &[&seeds],
        ),
        total_amount_to_transfer,
    )?;
    Ok(())
}
