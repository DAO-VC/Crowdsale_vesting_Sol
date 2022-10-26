use anchor_lang::prelude::*;

#[error_code]
pub enum SaleError {
    ZeroPrice,
    AdvanceFractionTooHigh,
    BumpSeedNotInHashMap,
    SaleNotActive,
    SaleAlreadyActive,
}
