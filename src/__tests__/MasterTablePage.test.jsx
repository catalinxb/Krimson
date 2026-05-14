import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { MasterTablePage } from '../pages/MasterTablePage';
import { TradeProvider } from '../context/TradeContext';
import { vi } from 'vitest';

// Helper to wrap component with Router and Context
const renderWithProviders = (ui) => {
    return render(
        <BrowserRouter>
            <TradeProvider>
                {ui}
            </TradeProvider>
        </BrowserRouter>
    );
};

beforeEach(() => {
    window.localStorage.clear();
    if (typeof window.navigator !== 'undefined') {
        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    }
    window.fetch = vi.fn(() => Promise.reject(new Error('Network unavailable')));
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('MasterTablePage CRUD Operations', () => {
    it('renders initial trades from RAM state', () => {
        renderWithProviders(<MasterTablePage />);
        expect(screen.getByText('BTC/USDT')).toBeInTheDocument();
        expect(screen.getByText('ETH/USDT')).toBeInTheDocument();
    });

    it('opens add dialog when New Trade is clicked', () => {
        renderWithProviders(<MasterTablePage />);
        const newTradeButton = screen.getByRole('button', { name: /new trade/i });
        fireEvent.click(newTradeButton);
        expect(screen.getByText('Enter your trade details')).toBeInTheDocument(); // Dialog description
    });

    it('adds a new trade successfully', async () => {
        renderWithProviders(<MasterTablePage />);
        
        // Click New Trade
        fireEvent.click(screen.getByText('New Trade'));
        
        // Fill form
        fireEvent.change(screen.getByPlaceholderText('e.g., BTC/USDT'), { target: { value: 'SOL/USDT' } });
        fireEvent.change(screen.getAllByPlaceholderText('0.00')[0], { target: { value: '100' } }); // entry
        fireEvent.change(screen.getAllByPlaceholderText('0.00')[1], { target: { value: '120' } }); // exit
        
        // Submit
        fireEvent.click(screen.getByText('Create'));
        
        // Check if new trade appears
        await waitFor(() => {
            expect(screen.getByText('SOL/USDT')).toBeInTheDocument();
        });
    });

    it('opens edit dialog when edit button is clicked', () => {
        renderWithProviders(<MasterTablePage />);
        
        // Find edit button for first trade
        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);
        
        expect(screen.getByText('Edit Trade')).toBeInTheDocument();
    });

    it('edits a trade successfully', async () => {
        renderWithProviders(<MasterTablePage />);
        
        // Click edit for BTC/USDT
        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);
        
        // Wait for the edit dialog and change asset by placeholder
        const assetInput = await screen.findByPlaceholderText('e.g., BTC/USDT');
        fireEvent.change(assetInput, { target: { value: 'BTC/USDT-EDITED' } });
        
        // Submit
        fireEvent.click(screen.getByText('Update'));
        
        // Check if updated
        await waitFor(() => {
            expect(screen.getByText('BTC/USDT-EDITED')).toBeInTheDocument();
        });
    });

    it('deletes a trade successfully', async () => {
        renderWithProviders(<MasterTablePage />);
        
        // Confirm initial count
        expect(screen.getByText('BTC/USDT')).toBeInTheDocument();
        
        // Mock window.confirm
        window.confirm = vi.fn(() => true);
        global.confirm = window.confirm;
        
        // Click delete
        const deleteButtons = screen.getAllByTitle('Delete');
        fireEvent.click(deleteButtons[0]);
        
        // Check if deleted
        await waitFor(() => {
            expect(screen.queryByText('BTC/USDT')).not.toBeInTheDocument();
        });
    });

    it('shows validation error for invalid data', async () => {
        renderWithProviders(<MasterTablePage />);
        
        // Click New Trade
        const newTradeButton = screen.getByRole('button', { name: /new trade/i });
        fireEvent.click(newTradeButton);
        
        // Fill with invalid data (negative entry)
        fireEvent.change(screen.getByPlaceholderText('e.g., BTC/USDT'), { target: { value: 'TEST' } });
        fireEvent.change(screen.getAllByPlaceholderText('0.00')[0], { target: { value: '-100' } }); // negative entry
        fireEvent.change(screen.getAllByPlaceholderText('0.00')[1], { target: { value: '120' } }); // exit
        
        // Submit
        fireEvent.click(screen.getByText('Create'));
        
        // Check error message
        expect(screen.getByText('Entry price must be a valid positive number.')).toBeInTheDocument();
    });

    it('pagination works correctly', () => {
        // Test that pagination component is rendered
        renderWithProviders(<MasterTablePage />);
        
        expect(screen.getByText('Previous')).toBeInTheDocument(); // Pagination previous button
        expect(screen.getByText('Next')).toBeInTheDocument(); // Pagination next button
    });
});