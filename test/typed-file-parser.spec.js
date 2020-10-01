import { isSupported } from '../src/index';

describe('Typed File Parser', () => {
    describe('When checking for browser support', () => {
        it('should report false when required functions are missing', () => {
            expect( isSupported({}) ).toBe( false );
        });

        it('should report false when not all required functions are available', () => {
            expect( isSupported({ FileReader: () => true })).toBe( false );
            expect( isSupported({ atob: () => true })).toBe( false );
            expect( isSupported({ Uint8Array: () => true })).toBe( false );
        });

        it('should report true when all required functions are available', () => {
            expect( isSupported({
                FileReader: () => true,
                atob: () => true,
                Uint8Array: () => true
            })).toBe( true );
        });
    });
});
