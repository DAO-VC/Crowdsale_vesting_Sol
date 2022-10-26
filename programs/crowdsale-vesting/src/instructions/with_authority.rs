use crate::state::Sale;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct WithAuthority<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub sale: Account<'info, Sale>,
    pub authority: Signer<'info>,
}
