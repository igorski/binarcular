import { types, getDataTypeFromDefinition, getLengthFromDefinition } from '@/definitions/types';

describe('Data types', () => {
    describe('when parsing the data type from the type definition', () => {
        it('should be able to retrieve exact matches from the enumeration', () => {
            Object.values( types ).forEach( type => {
                expect( getDataTypeFromDefinition( type )).toEqual( type );
            });
        });

        it('should be able to retrieve the type when Array length is specified', () => {
            Object.values( types ).forEach( type => {
                expect( getDataTypeFromDefinition( `${type}[512]` )).toEqual( type );
            });
        });

        it('should be able to retrieve the type when endianness modifier is specified', () => {
            Object.values( types ).forEach( type => {
                expect( getDataTypeFromDefinition( `${type}|BE` )).toEqual( type );
                expect( getDataTypeFromDefinition( `${type}|LE` )).toEqual( type );
            });
        });

        it('should be able to retrieve the type when modifiers and Array length are specified', () => {
            Object.values( types ).forEach( type => {
                expect( getDataTypeFromDefinition( `${type}[512]|BE` )).toEqual( type );
                expect( getDataTypeFromDefinition( `${type}|LE[512]` )).toEqual( type );
            });
        });
    });

    describe('when parsing the optional length from the definition', () => {
        it('should default to 1 (no Array) when none specified', () => {
            Object.values( types ).forEach( type => {
                expect( getLengthFromDefinition( type )).toEqual( 1 );
                expect( getLengthFromDefinition( `${type}|BE` )).toEqual( 1 );
                expect( getLengthFromDefinition( `${type}|LE` )).toEqual( 1 );
            });
        });

        it('should be able the retrieve the length when a numerical value between brackets is specified', () => {
            Object.values( types ).forEach( type => {
                expect( getLengthFromDefinition( `${type}[512]` )).toEqual( 512 );
            });
        });

        it('should be able to retrieve the length when endianness modifiers are specified', () => {
            Object.values( types ).forEach( type => {
                expect( getLengthFromDefinition( `${type}[512]|BE` )).toEqual( 512 );
                expect( getLengthFromDefinition( `${type}|LE[1024]` )).toEqual( 1024 );
            });
        });
    });
});
