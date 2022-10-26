use anchor_lang::prelude::*;

#[account]
pub struct Sale {
    pub authority: Pubkey,
    pub is_active: bool,

    pub price_numerator: u64,
    pub price_denominator: u64,
    pub payment_min_amount: u64,

    pub advance_fraction: u16,
    pub release_schedule: Vec<u64>,

    pub signer_bump: u8,
    pub sale_token_bump: u8,
    pub payment_token: Pubkey,
}

impl Sale {
    pub fn space(release_schedule: &Vec<u64>) -> usize {
        8 + 32 + 1 + 8 + 8 + 8 + 2 + 4 + release_schedule.len() * 8 + 1 + 1 + 32
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct VestingSchedule {
    pub release_time: u64,
    pub amount: u64,
}

#[account]
pub struct Vesting {
    pub authority: Pubkey,
    pub mint: Pubkey,

    pub total_amount: u64,
    pub vesting_bump: u8,
    pub vesting_token_bump: u8,

    pub schedule: Vec<VestingSchedule>,
}

impl Vesting {
    pub fn space(release_schedule: &Vec<u64>) -> usize {
        8 + 32
            + 32
            + 8
            + 1
            + 1
            + 4
            + release_schedule.len() * std::mem::size_of::<VestingSchedule>()
    }
}
