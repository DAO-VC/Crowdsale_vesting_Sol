use anchor_lang::prelude::*;

#[account]
pub struct Sale {
    pub authority: Pubkey,
    pub is_active: bool,

    pub price_numerator: u64,
    pub price_denominator: u64,
    pub payment_min_amount: u64,

    pub advance_fraction: u16,
    pub release_schedule: Vec<ReleaseSchedule>,

    pub sale_mint: Pubkey,
    pub sale_token: Pubkey,
    pub payment: Pubkey,

    pub signer_bump: u8,
    pub sale_token_bump: u8,
    pub no_sale_just_vesting:bool
}

impl Sale {
    pub fn space(release_schedule: &Vec<ReleaseSchedule>) -> usize {
        8 + 32
            + 1
            + 8
            + 8
            + 8
            + 2
            + 4
            + release_schedule.len() * std::mem::size_of::<ReleaseSchedule>()
            + 32
            + 32
            + 32
            + 1
            + 1
            + 1
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ReleaseSchedule {
    pub release_time: u64,
    pub fraction: u16, // Base points - 100% = 10000
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct VestingSchedule {
    pub release_time: u64,
    pub amount: u64,
}

#[account]
pub struct Vesting {
    pub user: Pubkey,
    pub sale_mint: Pubkey,
    pub first_sale: Pubkey,

    pub total_amount: u64,
    pub vesting_bump: u8,

    pub schedule: Vec<VestingSchedule>,
}

impl Vesting {
    pub fn space(release_schedule: &Vec<ReleaseSchedule>) -> usize {
        8 + 32
            + 32
            + 32
            + 8
            + 1
            + 4
            + release_schedule.len() * std::mem::size_of::<VestingSchedule>()
    }
}
