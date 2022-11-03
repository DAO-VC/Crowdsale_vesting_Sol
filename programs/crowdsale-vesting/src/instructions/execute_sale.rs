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
        constraint = sale.price_numerator > 0 && payment_amount >= sale.payment_min_amount  @ SaleError::AmountMinimum,
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
        bump,
    )]
    /// CHECK: Can be uninitialized, will be checked in the handler
    pub vesting: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            user.key().as_ref(),
            token_program.key().as_ref(),
            sale_mint.key().as_ref(),
        ], bump,
        seeds::program = associated_token_program.key(),
    )]
    /// CHECK: Can be uninitialized, will be checked in the handler
    pub vesting_token: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn execute_sale(ctx: Context<ExecuteSale>, payment_amount: u64) -> Result<()> {
    let sale = &ctx.accounts.sale;
    let mut  token_purchase_amount: u64;
    if sale.price_numerator >0 { //sale.price_numerator == 0 means not sale just vesting
        token_purchase_amount =
        payment_amount  * sale.price_numerator  / sale.price_denominator ;
     
        token_purchase_amount =
            u64::try_from(token_purchase_amount as u64).map_err(|_| error!(SaleError::CalculationOverflow))?;

        // Transfer SOL for tokens to payment address
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
    } else   {
        token_purchase_amount = payment_amount ;
   } 
    // Calculate advance amount and vesting amounts
    let vesting_amounts: Vec<u64> = sale
        .release_schedule
        .iter()
        .map(|line| (token_purchase_amount as u128 * line.fraction as u128 / 10000) as u64)
        .collect();
    let remaining_total_amount = vesting_amounts.iter().sum::<u64>();
    let advance_amount = token_purchase_amount - remaining_total_amount ;

    msg!(
        "Advance payment: {}, remaining {}",
        advance_amount,
        remaining_total_amount,
    );

    let key = ctx.accounts.sale.key();
    let seeds = [key.as_ref(), &[ctx.accounts.sale.signer_bump]];

     // Transfer advance amount to user
    if advance_amount > 0 {
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
            advance_amount as u64,
        )?;
    } 

    if remaining_total_amount > 0 {
        let mut vesting: Account<Vesting> = Account::try_from(&ctx.accounts.vesting)?;

        require_keys_eq!(
            vesting.user,
            ctx.accounts.user.key(),
            SaleError::IncompatibleVesting
        );
        require_keys_eq!(
            vesting.sale_mint,
            ctx.accounts.sale_mint.key(),
            SaleError::IncompatibleVesting
        );
        require_eq!(
            vesting.schedule.len(),
            sale.release_schedule.len(),
            SaleError::IncompatibleVesting
        );
        let actual_vesting_bump = *ctx
            .bumps
            .get("vesting")
            .ok_or_else(|| error!(SaleError::BumpSeedNotInHashMap))?;
        require_eq!(
            vesting.vesting_bump,
            actual_vesting_bump,
            SaleError::IncompatibleVesting
        );
        require!(
            vesting
                .schedule
                .iter()
                .map(|line| &line.release_time)
                .zip(sale.release_schedule.iter().map(|line| &line.release_time))
                .all(|(v, s)| v == s),
            SaleError::IncompatibleVesting
        );

        let vesting_token: Account<TokenAccount> = Account::try_from(&ctx.accounts.vesting_token)?;
        require_keys_eq!(
            vesting_token.mint,
            ctx.accounts.sale_mint.key(),
            SaleError::IncompatibleVesting
        );
        require_keys_eq!(
            vesting_token.owner,
            ctx.accounts.user.key(),
            SaleError::IncompatibleVesting
        );

        // Update vesting account
        vesting.schedule = vesting
            .schedule
            .iter()
            .zip(vesting_amounts.iter())
            .map(|(line, extra)| VestingSchedule {
                release_time: line.release_time,
                amount: line.amount + extra,
            })
            .collect();
        vesting.total_amount += remaining_total_amount;

        // Transfer remaining tokens to vesting token account
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

        vesting.exit(ctx.program_id)?;
    }

    Ok(())
}
