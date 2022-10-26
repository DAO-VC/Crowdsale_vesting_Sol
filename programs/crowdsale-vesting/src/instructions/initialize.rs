use crate::errors::SaleError;
use crate::state::Sale;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(price_numerator: u64, price_denominator: u64, payment_min_amount: u64, advance_fraction: u16, release_schedule: Vec<u64>)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = Sale::space(&release_schedule),
    )]
    pub sale: Box<Account<'info, Sale>>,

    /// CHECK: only for key()
    pub authority: UncheckedAccount<'info>,

    #[account(
        seeds = [sale.key().as_ref()],
        bump,
    )]
    /// CHECK: only for bump generation
    pub signer: UncheckedAccount<'info>,

    pub sale_mint: Box<Account<'info, Mint>>,
    #[account(
        init,
        payer = payer,
        token::mint = sale_mint,
        token::authority = signer,
        seeds = [
            b"sale_token".as_ref(),
            sale.key().as_ref()
        ],
        bump
    )]
    pub sale_token: Box<Account<'info, TokenAccount>>,

    pub payment_token: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(
    ctx: Context<Initialize>,
    price_numerator: u64,
    price_denominator: u64,
    payment_min_amount: u64,
    advance_fraction: u16,
    release_schedule: Vec<u64>,
) -> Result<()> {
    require_neq!(price_numerator, 0, SaleError::ZeroPrice);
    require_neq!(price_denominator, 0, SaleError::ZeroPrice);
    require_gt!(10000, advance_fraction, SaleError::AdvanceFractionTooHigh);

    let sale = &mut ctx.accounts.sale;

    sale.authority = ctx.accounts.authority.key();
    sale.is_active = false;
    sale.price_numerator = price_numerator;
    sale.price_denominator = price_denominator;
    sale.payment_min_amount = payment_min_amount;
    sale.advance_fraction = advance_fraction;
    sale.release_schedule = release_schedule;

    sale.signer_bump = *ctx
        .bumps
        .get("signer")
        .ok_or_else(|| error!(SaleError::BumpSeedNotInHashMap))?;

    sale.sale_token_bump = *ctx
        .bumps
        .get("sale_token")
        .ok_or_else(|| error!(SaleError::BumpSeedNotInHashMap))?;

    sale.payment_token = ctx.accounts.payment_token.key();

    Ok(())
}
