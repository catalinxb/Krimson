import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import React from 'react';

// Mock fetch
global.fetch = vi.fn();

describe('AuthContext', () => {
    beforeEach(() => {
        localStorage.clear();
        fetch.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const wrapper = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
    );

    describe('Initial State', () => {
        it('should have isAuthenticated as false by default', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.isAuthenticated).toBe(false);
        });

        it('should have currentUser as null by default', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.currentUser).toBeNull();
        });

        it('should have isLoading as false by default', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('Login', () => {
        it('should login successfully with valid credentials', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                token: 'mock-token-123',
                roles: [{ name: 'trader' }],
                permissions: ['trade:view']
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            let loginResult;
            await act(async () => {
                loginResult = await result.current.login('test@example.com', 'password123');
            });

            expect(loginResult).toEqual(mockUser);
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.currentUser).toEqual(mockUser);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'krimson_auth_user',
                JSON.stringify(mockUser)
            );
        });

        it('should handle login failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Invalid credentials' })
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            let loginResult;
            await act(async () => {
                loginResult = await result.current.login('test@example.com', 'wrongpassword');
            });

            expect(loginResult).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.currentUser).toBeNull();
        });

        it('should set isLoading during login', async () => {
            fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
                ok: true,
                json: async () => ({ token: 'mock-token' })
            }), 100)));

            const { result } = renderHook(() => useAuth(), { wrapper });

            act(() => {
                result.current.login('test@example.com', 'password123');
            });

            expect(result.current.isLoading).toBe(true);
        });
    });

    describe('Register', () => {
        it('should register successfully with valid data', async () => {
            const mockUser = {
                id: 1,
                email: 'newuser@example.com',
                token: 'mock-token-123',
                roles: [{ name: 'trader' }],
                permissions: ['trade:view'],
                profile: { displayName: 'New User' }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            let registerResult;
            await act(async () => {
                registerResult = await result.current.register('newuser@example.com', 'Password123', 'New User');
            });

            expect(registerResult).toEqual(mockUser);
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.currentUser).toEqual(mockUser);
        });

        it('should handle registration failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                json: async () => ({ error: 'Email already exists' })
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            let registerResult;
            await act(async () => {
                registerResult = await result.current.register('existing@example.com', 'Password123');
            });

            expect(registerResult).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.error).toBe('Email already exists');
        });
    });

    describe('Logout', () => {
        it('should clear user data on logout', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                token: 'mock-token-123',
                roles: [],
                permissions: []
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('test@example.com', 'password123');
            });

            expect(result.current.isAuthenticated).toBe(true);

            act(() => {
                result.current.logout();
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.currentUser).toBeNull();
            expect(localStorage.removeItem).toHaveBeenCalledWith('krimson_auth_user');
        });
    });

    describe('Role and Permission Checking', () => {
        it('should correctly check if user has a role', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                token: 'mock-token',
                roles: [{ name: 'admin' }, { name: 'trader' }],
                permissions: []
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('test@example.com', 'password123');
            });

            expect(result.current.hasRole('admin')).toBe(true);
            expect(result.current.hasRole('trader')).toBe(true);
            expect(result.current.hasRole('nonexistent')).toBe(false);
        });

        it('should correctly check if user has a permission', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                token: 'mock-token',
                roles: [],
                permissions: ['trade:create', 'trade:view']
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('test@example.com', 'password123');
            });

            expect(result.current.hasPermission('trade:create')).toBe(true);
            expect(result.current.hasPermission('trade:view')).toBe(true);
            expect(result.current.hasPermission('trade:delete')).toBe(false);
        });

        it('should correctly identify admin users', async () => {
            const mockUser = {
                id: 1,
                email: 'admin@example.com',
                token: 'mock-token',
                roles: [{ name: 'admin' }],
                permissions: []
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('admin@example.com', 'password123');
            });

            expect(result.current.isAdmin()).toBe(true);
        });
    });

    describe('Auth Headers', () => {
        it('should return auth headers with Bearer token when authenticated', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                token: 'mock-token-123',
                roles: [],
                permissions: []
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('test@example.com', 'password123');
            });

            const headers = result.current.authHeaders();
            expect(headers.Authorization).toBe('Bearer mock-token-123');
        });

        it('should return empty headers when not authenticated', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            const headers = result.current.authHeaders();
            expect(headers).toEqual({});
        });
    });

    describe('Token Expiration', () => {
        it('should logout when token is expired', async () => {
            // Create a token that expires in the past
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
                btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })) +
                '.signature';

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                token: expiredToken,
                roles: [],
                permissions: []
            };

            // Simulate stored user with expired token
            localStorage.setItem('krimson_auth_user', JSON.stringify(mockUser));

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Wait for effect to run
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            expect(result.current.isAuthenticated).toBe(false);
        });
    });

    describe('API Fetch', () => {
        it('should include auth headers in API requests when authenticated', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                token: 'mock-token',
                roles: [],
                permissions: []
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('test@example.com', 'password123');
            });

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'test' })
            });

            await act(async () => {
                await result.current.apiFetch('/api/test');
            });

            expect(fetch).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-token'
                    })
                })
            );
        });

        it('should logout when API returns 401', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                token: 'mock-token',
                roles: [],
                permissions: []
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('test@example.com', 'password123');
            });

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' })
            });

            await expect(result.current.apiFetch('/api/test')).rejects.toThrow('Session expired');
        });
    });
});
