import { types }       from '@/definitions/types';
import { parse, seek } from '@/parser/parser';

import { headerDefinition, binaryFile, binaryAsJson } from '../_data';

describe('Parser', () => {
    describe('When working with typed data types', () => {
        it('should provide enumerated data types', () => {
            expect( Object.values( types )).toHaveLength( 21 );
        });

        it('should throw an Error when an unsupported type is requested', () => {
            expect(() => {
                parse( new Uint8Array(), { foo: 'NONEXISTENT' });
            }).toThrow( 'Unsupported data type "NONEXISTENT"');

            expect(() => {
                parse( new Uint8Array(), { foo: types.CHAR });
            }).not.toThrow();
        });
    });

    describe('When parsing binary data into predefined types', () => {
        it('should report an error occurred when data could not be read (without throwing)', () => {
            let result;
            expect(() => {
                result = parse( {}, { value: types.CHAR });
            }).not.toThrow();
            expect( result.error ).toBe( true );
        });

        describe('and handling the char type', () => {
            it('should be able to parse char types to Strings', () => {
                const byteArray = new Uint8Array([ 0x66 ]);
                const { data, end, error } = parse( byteArray, { value: types.CHAR });
                expect( error ).toBe( false );
                expect( data.value ).toEqual( 'f' );
                expect( end ).toEqual( 1 ); // read a single value of one byte in size
            });

            it('should be able to parse multiple chars into a single String of equal length', () => {
                const byteArray = new Uint8Array([ 0x66, 0x6f, 0x6f ]);
                const { data, end, error } = parse( byteArray, { value: `${types.CHAR}[3]` });
                expect( error ).toBe( false );
                expect( data.value ).toEqual( 'foo' );
                expect( end ).toEqual( 3 ); // read three values each one byte in size
            });
        });

        describe('and handling any of the 8-bit numerical types', () => {
            it('should be able to parse them to Number values', () => {
                const byteArray = new Uint8Array([ 0xf0 ]);
                [ types.BYTE, types.INT8 ].forEach( type => {
                    const { data, end, error } = parse( byteArray, { value: type });
                    expect( error ).toBe( false );
                    expect( data.value ).toEqual( 240 );
                    expect( end ).toEqual( 1 ); // read a single value of one byte in size
                });
            });

            it('should be able to parse multiple entries to Arrays of Number values', () => {
                const byteArray = new Uint8Array([ 0xf0, 0xff, 0x00, 0xdd ]);
                [ types.BYTE, types.INT8 ].forEach( type => {
                    const { data, end, error } = parse( byteArray, { value: `${type}[4]` });
                    expect( error ).toBe( false );
                    expect( data.value ).toEqual([ 240, 255, 0, 221 ]);
                    expect( end ).toEqual( 4 ); // read four values each one byte in size
                });
            });
        });

        describe('and handling any of the 16-bit numerical types', () => {
            it('should be able to parse them to Number values', () => {
                const byteArray = new Uint8Array([ 0xf0, 0xff ]);
                [ types.SHORT, types.INT16 ].forEach( type => {
                    const { data, end, error } = parse( byteArray, { value: type });
                    expect( error ).toBe( false );
                    expect( data.value ).toEqual( 65520 );
                    expect( end ).toEqual( 2 ); // read a single value of two bytes in size
                });
            });

            it('should be able to parse multiple entries to Arrays of Number values', () => {
                const byteArray = new Uint8Array([ 0xf0, 0xff, 0x0f, 0xdd ]);
                [ types.SHORT, types.INT16 ].forEach( type => {
                    const { data, end, error } = parse( byteArray, { value: `${type}[2]` });
                    expect( error ).toBe( false );
                    expect( data.value ).toEqual([ 65520, 56591 ]);
                    expect( end ).toEqual( 4 ); // read two values each two bytes in size
                });
            });

            it('should be able to parse both Little Endian and Big Endian values', () => {
                const byteArrayLE = new Uint8Array([ 0xff, 0xf0 ]);
                const byteArrayBE = new Uint8Array([ 0xf0, 0xff ]);
                [ types.SHORT, types.INT16 ].forEach( type => {
                    expect( parse( byteArrayLE, { value: `${type}|LE` }).data.value ).toEqual( 61695 );
                    expect( parse( byteArrayBE, { value: `${type}|BE` }).data.value ).toEqual( 61695 );
                });
            });
        });

        describe('and handling any of the 24-bit numerical types', () => {
            it('should be able to parse them to Number values', () => {
                const byteArray = new Uint8Array([ 0xf0, 0xff, 0xdd ]);
                const { data, end, error } = parse( byteArray, { value: types.INT24 });
                expect( error ).toBe( false );
                expect( data.value ).toEqual( 14548976 );
                expect( end ).toEqual( 3 ); // read a single value of three bytes in size
            });

            it('should be able to parse multiple entries to Arrays of Number values', () => {
                const byteArray = new Uint8Array([ 0xf0, 0xff, 0xdd, 0x0f, 0x00, 0x0a ]);
                const { data, end, error } = parse( byteArray, { value: 'INT24[2]' });
                expect( error ).toBe( false );
                expect( data.value ).toEqual([ 14548976, 655375 ]);
                expect( end ).toEqual( 6 ); // read two values each three bytes in size
            });

            it('should be able to parse both Little Endian and Big Endian values', () => {
                const byteArrayLE = new Uint8Array([ 0xff, 0xf0, 0xdd ]);
                const byteArrayBE = new Uint8Array([ 0xdd, 0xf0, 0xff ]);
                expect( parse( byteArrayLE, { value: 'INT24|LE' }).data.value ).toEqual( 14545151 );
                expect( parse( byteArrayBE, { value: 'INT24|BE' }).data.value ).toEqual( 14545151 );
            });
        });

        describe('and handling any of the 32-bit numerical types', () => {
            describe('of the integer kind', () => {
                it('should be able to parse them to Number values', () => {
                    const byteArray = new Uint8Array([ 0x88, 0x54, 0x00, 0x00 ]);
                    [ types.LONG, types.INT32 ].forEach( type => {
                        const { data, end, error } = parse( byteArray, { value: type });
                        expect( error ).toBe( false );
                        expect( data.value ).toEqual( 21640 );
                        expect( end ).toEqual( 4 ); // read a single value of four bytes in size
                    });
                });

                it('should be able to parse multiple entries to Arrays of Number values', () => {
                    const byteArray = new Uint8Array([ 0x88, 0x54, 0x00, 0x00, 0x0d, 0x0c, 0x0b, 0x0a ]);
                    [ types.LONG, types.INT32 ].forEach( type => {
                        const { data, end, error } = parse( byteArray, { value: `${type}[2]` });
                        expect( error ).toBe( false );
                        expect( data.value ).toEqual([ 21640, 168496141 ]);
                        expect( end ).toEqual( 8 ); // read two values each four bytes in size
                    });
                });

                it('should be able to parse both Little Endian and Big Endian values', () => {
                    const byteArrayLE = new Uint8Array([ 0x0d, 0x0c, 0x0b, 0x0a ]);
                    const byteArrayBE = new Uint8Array([ 0x0a, 0x0b, 0x0c, 0x0d ]);
                    [ types.LONG, types.INT32 ].forEach( type => {
                        expect( parse( byteArrayLE, { value: `${type}|LE` }).data.value ).toEqual( 168496141 );
                        expect( parse( byteArrayBE, { value: `${type}|BE` }).data.value ).toEqual( 168496141 );
                    });
                });
            });

            describe('of the floating point kind', () => {
                it('should be able to parse them to Number values', () => {
                    const byteArray = new Uint8Array([ 0xdb, 0x0f, 0x49, 0x40 ]);
                    [ types.FLOAT, types.FLOAT32 ].forEach( type => {
                        const { data, end, error } = parse( byteArray, { value: type });
                        expect( error ).toBe( false );
                        expect( data.value ).toEqual( 3.1415927410125732 );
                        expect( end ).toEqual( 4 ); // read a single value of four bytes in size
                    });
                });

                it('should be able to parse both Little Endian and Big Endian values', () => {
                    const byteArrayLE = new Uint8Array([ 0xab, 0xaa, 0xaa, 0x3e ]);
                    const byteArrayBE = new Uint8Array([ 0x3e, 0xaa, 0xaa, 0xab ]);
                    [ types.FLOAT, types.FLOAT32 ].forEach( type => {
                        expect( parse( byteArrayLE, { value: `${type}|LE` }).data.value ).toEqual( 0.3333333432674408 );
                        expect( parse( byteArrayBE, { value: `${type}|BE` }).data.value ).toEqual( 0.3333333432674408 );
                    });
                });
            });
        });

        describe('and handling any of the 64-bit numerical types', () => {
            describe('of the integer kind', () => {
                it('should be able to parse them to Number values', () => {
                    const byteArray = new Uint8Array([ 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff ]);
                    [ types.INT64, types.LONGLONG ].forEach( type => {
                        const { data, end, error } = parse( byteArray, { value: type });
                        expect( error ).toBe( false );
                        expect( data.value ).toEqual( 18446744073709552000 );
                        expect( end ).toEqual( 8 ); // read a single value of eight bytes in size
                    });
                });

                it('should be able to parse multiple entries to Arrays of Number values', () => {
                    const byteArray = new Uint8Array([ 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x88, 0x54, 0x00, 0x00, 0x0d, 0x0c, 0x0b, 0x0a ]);
                    [ types.INT64, types.LONGLONG ].forEach( type => {
                        const { data, end, error } = parse( byteArray, { value: `${type}[2]` });
                        expect( error ).toBe( false );
                        expect( data.value ).toEqual([ 18446744073709552000, 723685415097226400 ]);
                        expect( end ).toEqual( 16 ); // read two values each eight bytes in size
                    });
                });

                it('should be able to parse both Little Endian and Big Endian values', () => {
                    const byteArrayLE = new Uint8Array([ 0x88, 0x54, 0x00, 0x00, 0x0d, 0x0c, 0x0b, 0x0a ]);
                    const byteArrayBE = new Uint8Array([ 0x0a, 0x0b, 0x0c, 0x0d, 0x00, 0x00, 0x54, 0x88 ]);
                    [ types.INT64, types.LONGLONG ].forEach( type => {
                        expect( parse( byteArrayLE, { value: `${type}|LE` }).data.value ).toEqual( 723685415097226400 );
                        expect( parse( byteArrayBE, { value: `${type}|BE` }).data.value ).toEqual( 723685415097226400 );
                    });
                });
            });

            describe('of the floating point kind', () => {
                it('should be able to parse them to Number values', () => {
                    const byteArray = new Uint8Array([ 0x18, 0x2d, 0x44, 0x54, 0xfb, 0x21, 0x09, 0x40 ]);
                    [ types.DOUBLE, types.FLOAT64 ].forEach( type => {
                        const { data, end, error } = parse( byteArray, { value: type });
                        expect( error ).toBe( false );
                        expect( data.value ).toEqual( 3.1415926535896688 );
                        expect( end ).toEqual( 8 ); // read a single value of eight bytes in size
                    });
                });

                it('should be able to parse both Little Endian and Big Endian values', () => {
                    const byteArrayLE = new Uint8Array([ 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0xd5, 0x3f ]);
                    const byteArrayBE = new Uint8Array([ 0x3f, 0xd5, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55 ]);
                    [ types.DOUBLE, types.FLOAT64 ].forEach( type => {
                        expect( parse( byteArrayLE, { value: `${type}|LE` }).data.value ).toEqual( 0.3333333333333428 );
                        expect( parse( byteArrayBE, { value: `${type}|BE` }).data.value ).toEqual( 0.3333333333333428 );
                    });
                });
            });
        });
    });

    describe('when parsing a file', () => {
        it('should be able to fill a structure with all appropriate types', () => {
            const parsedResult = parse( binaryFile, headerDefinition );
            expect( parsedResult ).toEqual({
                data: binaryAsJson,
                end: 44,
                error: false
            });
        });

        describe('and when seeking specific content', () => {
            it('should return Infinity when content could not be found', () => {
                const result = seek( binaryFile, new Uint8Array([ 0xff ])); // 0xff/255 not listed
                expect( result ).toEqual( Infinity );
            });

            it('should be able to find the entry, searching from the start by default', () => {
                const result = seek( binaryFile, new Uint8Array([ 16, 0 ]) );
                expect( result ).toEqual( 16 );
            });

            it('should be able to find the entry when searching from a custom offset', () => {
                const result = seek( binaryFile, new Uint8Array([ 16, 0 ]), 20 );
                expect( result ).toEqual( 34 );
            });
        });
    });
});
