use crate::state::{Sale, Vesting};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct ExecuteSale<'info> {
    #[account(
        has_one = payment_token,
        constraint = sale.is_active == true
    )]
    pub sale: Box<Account<'info, Sale>>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = payment_token.mint,
        associated_token::authority = user,
    )]
    pub user_payment_token: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = sale_mint,
        associated_token::authority = user,
    )]
    pub user_sale_token: Box<Account<'info, TokenAccount>>,

    pub sale_mint: Box<Account<'info, Mint>>,

    #[account(
        seeds = [sale.key().as_ref()],
        bump = sale.signer_bump,
    )]
    /// CHECK: only for bump check
    pub signer: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = sale_mint,
        token::authority = signer,
        seeds = [
            b"sale_token".as_ref(),
            sale.key().as_ref()
        ],
        bump = sale.sale_token_bump,
    )]
    pub sale_token: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub payment_token: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        space = Vesting::space(&sale.release_schedule),
        payer = user,
        seeds = [
            user.key().as_ref(),
            sale_token.mint.as_ref(),
        ],
        bump
    )]
    pub vesting: Box<Account<'info, Vesting>>,

    #[account(
        init_if_needed,
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

pub fn execute_sale(ctx: Context<ExecuteSale>, payment_token_amount: u64) -> Result<()> {
    todo!()
}
