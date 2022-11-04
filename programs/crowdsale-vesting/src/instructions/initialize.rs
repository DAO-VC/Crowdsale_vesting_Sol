use crate::errors::SaleError;
use crate::state::{ReleaseSchedule, Sale};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(price_numerator: u64, price_denominator: u64, payment_min_amount: u64, advance_fraction: u16, no_sale_just_vesting:bool, release_schedule: Vec<ReleaseSchedule>)]
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

    /// CHECK: Will receive payment SOL
    pub payment: UncheckedAccount<'info>,

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
    no_sale_just_vesting:  bool,
    release_schedule: Vec<ReleaseSchedule>,
) -> Result<()> {
    require_neq!(price_numerator, 0, SaleError::ZeroPrice);
    require_neq!(price_denominator, 0, SaleError::ZeroPrice);
    require!(
        check_release_schedule(advance_fraction, &release_schedule),
        SaleError::FractionsAreNot100Percents
    );

    let sale = &mut ctx.accounts.sale;

    sale.authority = ctx.accounts.authority.key();
    sale.is_active = false;
    sale.price_numerator = price_numerator;
    sale.price_denominator = price_denominator;
    sale.payment_min_amount = payment_min_amount;
    sale.advance_fraction = advance_fraction;
    sale.no_sale_just_vesting = no_sale_just_vesting;
    sale.release_schedule = release_schedule;

    sale.signer_bump = *ctx
        .bumps
        .get("signer")
        .ok_or_else(|| error!(SaleError::BumpSeedNotInHashMap))?;

    sale.sale_token = ctx.accounts.sale_token.key();
    sale.sale_token_bump = *ctx
        .bumps
        .get("sale_token")
        .ok_or_else(|| error!(SaleError::BumpSeedNotInHashMap))?;

    sale.payment = ctx.accounts.payment.key();
    sale.sale_mint = ctx.accounts.sale_mint.key();

    Ok(())
}

// Check if advance fraction + sum of release schedule fraction is 100% (10000)
fn check_release_schedule(advance_fraction: u16, release_schedule: &Vec<ReleaseSchedule>) -> bool {
    release_schedule
        .iter()
        .map(|ReleaseSchedule { fraction, .. }| *fraction as u64)
        .sum::<u64>()
        + advance_fraction as u64
        == 10000
}
