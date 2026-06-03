// Trade utility functions

export function getAdjustedPnl(trade, profile) {
    if (trade?.pips != null && typeof profile?.pipValue === 'number') {
        return trade.pips * profile.pipValue;
    }
    return trade?.pnl ?? 0;
}
