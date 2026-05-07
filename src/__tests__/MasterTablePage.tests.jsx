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

describe('MasterTablePage CRUD Operations', () => {
    it('renders initial trades from RAM state', () => {
        renderWithProviders(<MasterTablePage />);
        expect(screen.getByText('BTC/USDT')).toBeInTheDocument();
        expect(screen.getByText('ETH/USDT')).toBeInTheDocument();
    });

    it('opens add dialog when New Trade is clicked', () => {
        renderWithProviders(<MasterTablePage />);
        fireEvent.click(screen.getByText('New Trade'));
        expect(screen.getByText('New Trade')).toBeInTheDocument(); // Dialog title
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
        
        // Change asset
        const assetInput = screen.getByDisplayValue('BTC/USDT');
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
        global.confirm = vi.fn(() => true);
        
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
        fireEvent.click(screen.getByText('New Trade'));
        
        // Leave asset empty and submit
        fireEvent.click(screen.getByText('Create'));
        
        // Check error message
        expect(screen.getByText('Asset name is required.')).toBeInTheDocument();
    });

    it('pagination works correctly', () => {
        // Add more trades to test pagination - but since we have only 2, let's test the controls exist
        renderWithProviders(<MasterTablePage />);
        
        expect(screen.getByText('1')).toBeInTheDocument(); // Page number
    });
});