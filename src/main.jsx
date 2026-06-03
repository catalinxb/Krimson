import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { TradeProvider } from './context/TradeContext'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <AuthProvider>
            <ThemeProvider>
                <TradeProvider>
                    <App />
                </TradeProvider>
            </ThemeProvider>
        </AuthProvider>
    </BrowserRouter>,
)