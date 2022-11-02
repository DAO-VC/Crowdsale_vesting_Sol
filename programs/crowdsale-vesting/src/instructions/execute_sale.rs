use crate::errors::SaleError;
use crate::state::{Sale, Vesting, VestingSchedule};
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(payment_amount: u64)]
pub struct ExecuteSale<'info> {
    #[account(
        has_one = payment,
        has_one = sale_mint,
        constraint = sale.is_active == true,
        constraint = payment_amount >= sale.payment_min_amount @ SaleError::AmountMinimum,
    )]
    pub sale: Box<Account<'info, Sale>>,

    #[account(mut)]
    pub user: Signer<'info>,

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
    /// CHECK: Will receive payments
    pub payment: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            user.key().as_ref(),
            sale_mint.key().as_ref(),
        ],
        bump = vesting.vesting_bump,
        has_one = user @ SaleError::IncompatibleVesting,
        has_one = sale_mint @ SaleError::IncompatibleVesting,
        constraint = vesting.schedule.len() == sale.release_schedule.len() @ SaleError::IncompatibleVesting,
    )]
    pub vesting: Box<Account<'info, Vesting>>,

    #[account(
        mut,
        associated_token::mint = sale_mint,
        associated_token::authority = vesting,
    )]
    pub vesting_token: Box<Account<'info, TokenAccount>>,

    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn execute_sale(ctx: Context<ExecuteSale>, payment_amount: u64) -> Result<()> {
    let sale = &ctx.accounts.sale;

    require!(
        ctx.accounts
            .vesting
            .schedule
            .iter()
            .map(|line| &line.release_time)
            .zip(sale.release_schedule.iter().map(|line| &line.release_time))
            .all(|(v, s)| v == s),
        SaleError::IncompatibleVesting
    );

    let token_purchase_amount =
        payment_amount as u128 * sale.price_numerator as u128 / sale.price_denominator as u128;
    let token_purchase_amount =
        u64::try_from(token_purchase_amount).map_err(|_| error!(SaleError::CalculationOverflow))?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.payment.to_account_info(),
            },
        ),
        payment_amount,
    )?;

    let vesting_amounts: Vec<u64> = sale
        .release_schedule
        .iter()
        .map(|line| (token_purchase_amount as u128 * line.fraction as u128 / 10000) as u64)
        .collect();
    let remaining_total_amount = vesting_amounts.iter().sum::<u64>();
    let advance_amount = token_purchase_amount - remaining_total_amount;

    msg!(
        "Advance payment: {}, remaining {}",
        advance_amount,
        remaining_total_amount,
    );

    let key = ctx.accounts.sale.key();
    let seeds = [key.as_ref(), &[ctx.accounts.sale.signer_bump]];

    // Advance payment
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sale_token.to_account_info(),
                to: ctx.accounts.user_sale_token.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            },
            &[&seeds],
        ),
        advance_amount,
    )?;

    // Update vesting
    let vesting = &mut ctx.accounts.vesting;
    vesting.schedule = vesting
        .schedule
        .iter()
        .zip(vesting_amounts.iter())
        .map(|(line, additional)| VestingSchedule {
            release_time: line.release_time,
            amount: line.amount + additional,
        })
        .collect();
    vesting.total_amount += remaining_total_amount;

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sale_token.to_account_info(),
                to: ctx.accounts.vesting_token.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            },
            &[&seeds],
        ),
        remaining_total_amount,
    )?;

    Ok(())
}
