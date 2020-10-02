import { isSupported } from '@/index';

describe('Typed File Parser', () => {
    describe('When checking for browser support', () => {
        it('should report false when required functions are missing', () => {
            expect( isSupported( false, {}) ).toBe( false );
        });

        it('should report false when not all required functions are available', () => {
            expect( isSupported( false, { FileReader: () => true })).toBe( false );
            expect( isSupported( false, { atob: () => true })).toBe( false );
            expect( isSupported( false, { Uint8Array: () => true })).toBe( false );
            expect( isSupported( false, { DataView: () => true })).toBe( false );
        });

        it('should report true when all required functions are available for 32-bit use', () => {
            expect( isSupported( false, {
                FileReader: () => true,
                atob: () => true,
                Uint8Array: () => true,
                DataView: () => true,
            })).toBe( true );
        });

        it('should report false when not all required functions are available for 64-bit use', () => {
            expect( isSupported( true, {
                FileReader: () => true,
                atob: () => true,
                Uint8Array: () => true,
                DataView: () => true,
            })).toBe( false );
        });

        it('should report true when all required functions are available for 64-bit use', () => {
            expect( isSupported( true, {
                FileReader: () => true,
                atob: () => true,
                Uint8Array: () => true,
                DataView: () => true,
                BigInt: () => true,
            })).toBe( true );
        });
    });
});
