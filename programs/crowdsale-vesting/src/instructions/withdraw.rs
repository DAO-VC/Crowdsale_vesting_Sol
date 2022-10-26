use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Token, TokenAccount, Transfer};

use crate::state::Sale;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        has_one = authority,
    )]
    pub sale: Account<'info, Sale>,

    pub authority: Signer<'info>,

    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    #[account(
        seeds = [sale.key().as_ref()],
        bump = sale.signer_bump,
    )]
    /// CHECK: only for bump check
    pub signer: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"sale_token".as_ref(),
            sale.key().as_ref()
        ],
        bump = sale.sale_token_bump,
    )]
    pub sale_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.sale_token.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    };

    let amount = if amount == u64::MAX {
        ctx.accounts.sale_token.amount
    } else {
        amount
    };

    let key = ctx.accounts.sale.key();
    let seeds = [key.as_ref(), &[ctx.accounts.sale.signer_bump]];

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx.with_signer(&[&seeds]), amount)?;

    Ok(())
}
