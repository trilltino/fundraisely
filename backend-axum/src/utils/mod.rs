// Utility functions

pub fn calculate_bps(amount: u64, bps: u16) -> u64 {
    const BPS_DENOMINATOR: u64 = 10000;
    (amount * bps as u64) / BPS_DENOMINATOR
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_bps() {
        assert_eq!(calculate_bps(10000, 2000), 2000); // 20%
        assert_eq!(calculate_bps(10000, 500), 500);   // 5%
        assert_eq!(calculate_bps(10000, 100), 100);   // 1%
    }
}
