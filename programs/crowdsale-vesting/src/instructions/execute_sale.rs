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
        init_if_needed,
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

pub fn execute_sale(ctx: Context<ExecuteSale>, payment_amount: u64) -> Result<()> {
    let sale = &ctx.accounts.sale;

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

    let number_of_vesting_schedules = sale.release_schedule.len() as u64;
    let advance_amount =
        (token_purchase_amount as u128 * sale.advance_fraction as u128 / 10000) as u64;
    let remaining_portion_amount =
        (token_purchase_amount - advance_amount) / number_of_vesting_schedules;
    let remaining_total_amount = remaining_portion_amount * number_of_vesting_schedules;
    let advance_amount = token_purchase_amount - remaining_total_amount;

    msg!(
        "Advance payment: {}, remaining {} x {}",
        advance_amount,
        number_of_vesting_schedules,
        remaining_portion_amount
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

    let vesting = &ctx.accounts.vesting;
    if vesting.total_amount == 0 {
        // New vesting
        let vesting = &mut ctx.accounts.vesting;

        vesting.authority = ctx.accounts.user.key();
        vesting.mint = ctx.accounts.sale_mint.key();
        vesting.first_sale = ctx.accounts.sale.key();
        vesting.total_amount = remaining_total_amount;
        vesting.vesting_bump = *ctx
            .bumps
            .get("vesting")
            .ok_or_else(|| error!(SaleError::BumpSeedNotInHashMap))?;

        vesting.schedule = sale
            .release_schedule
            .iter()
            .map(|&release_time| VestingSchedule {
                release_time,
                amount: remaining_portion_amount,
            })
            .collect();
    } else {
        // Top Up
        require_keys_eq!(
            vesting.authority,
            ctx.accounts.user.key(),
            SaleError::IncompatibleVesting
        );
        require_keys_eq!(
            vesting.mint,
            ctx.accounts.sale_mint.key(),
            SaleError::IncompatibleVesting
        );
        require_eq!(
            vesting.schedule.len(),
            sale.release_schedule.len(),
            SaleError::IncompatibleVesting
        );
        require!(
            vesting
                .schedule
                .iter()
                .map(|line| &line.release_time)
                .zip(sale.release_schedule.iter())
                .all(|(v, s)| v == s),
            SaleError::IncompatibleVesting
        );

        let vesting = &mut ctx.accounts.vesting;
        vesting.schedule = vesting
            .schedule
            .iter()
            .map(|line| VestingSchedule {
                release_time: line.release_time,
                amount: line.amount + remaining_portion_amount,
            })
            .collect();
    }
    ctx.accounts.vesting.total_amount += remaining_total_amount;

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
