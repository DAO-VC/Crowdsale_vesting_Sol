use anchor_lang::prelude::*;

#[error_code]
pub enum SaleError {
    ZeroPrice,
    FractionsAreNot100Percents,
    BumpSeedNotInHashMap,
    SaleNotActive,
    SaleAlreadyActive,
    AmountMinimum,
    CalculationOverflow,
    IncompatibleVesting,
    NothingToClaim,
}
