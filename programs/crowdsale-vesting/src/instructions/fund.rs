use crate::state::Sale;
use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Fund<'info> {
    pub sale: Account<'info, Sale>,

    pub user: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = sale_token.mint,
        associated_token::authority = user,
    )]
    pub source: Account<'info, TokenAccount>,

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

pub fn fund(ctx: Context<Fund>, amount: u64) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.source.to_account_info(),
        to: ctx.accounts.sale_token.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}
