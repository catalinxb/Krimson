import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { TradeProvider, useTrades } from './TradeContext';

const DummyTerminal = () => {
    const { trades, addTrade, editTrade, deleteTrade } = useTrades();

    return (
        <div>
            <div data-testid="trade-count">{trades.length}</div>
            <div data-testid="first-trade-asset">{trades[0]?.asset}</div>

            <button
                data-testid="btn-add"
                onClick={() => addTrade({ asset: "SOL/USDT", pnl: 500, status: "winner" })}
            >
                Add Trade
            </button>

            <button
                data-testid="btn-edit"
                onClick={() => editTrade({ ...trades[0], asset: "BTC-EDITED" })}
            >
                Edit Trade
            </button>

            <button
                data-testid="btn-delete"
                onClick={() => deleteTrade(trades[0]?.id)}
            >
                Delete Trade
            </button>
        </div>
    );
};

describe('TradeContext CRUD Operations', () => {

    beforeEach(() => {
        window.localStorage.clear();

        render(
            <TradeProvider>
                <DummyTerminal />
            </TradeProvider>
        );
    });

    it('READ: Should load the initial mock trades into RAM', () => {
        // Expect the initial 2 trades to be loaded
        expect(screen.getByTestId('trade-count').textContent).toBe('2');
        expect(screen.getByTestId('first-trade-asset').textContent).toBe('BTC/USDT');
    });

    it('CREATE: Should add a new trade to the top of the array', () => {
        act(() => {
            screen.getByTestId('btn-add').click();
        });

        // The count should go from 2 to 3
        expect(screen.getByTestId('trade-count').textContent).toBe('3');
        // The newest trade should be SOL/USDT at the top
        expect(screen.getByTestId('first-trade-asset').textContent).toBe('SOL/USDT');
    });

    it('UPDATE: Should edit an existing trade in RAM', () => {
        act(() => {
            screen.getByTestId('btn-edit').click();
        });

        // The asset name of the first trade should change
        expect(screen.getByTestId('first-trade-asset').textContent).toBe('BTC-EDITED');
        // The count should remain 2
        expect(screen.getByTestId('trade-count').textContent).toBe('2');
    });

    it('DELETE: Should remove a trade from RAM', () => {
        act(() => {
            screen.getByTestId('btn-delete').click();
        });

        // The count should drop from 2 to 1
        expect(screen.getByTestId('trade-count').textContent).toBe('1');
        // The new first trade should now be ETH/USDT (since BTC was deleted)
        expect(screen.getByTestId('first-trade-asset').textContent).toBe('ETH/USDT');
    });
});