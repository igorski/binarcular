import { types } from '@/definitions/types';
import { write } from '@/writer/writer';
import { parse } from '@/parser/parser';

import { headerDefinition, binaryFile, binaryAsJson } from '../_data';

describe('Writer', () => {
    describe('when converting JSON values into a binary representation', () => {
        describe('and handling the char type', () => {
            it('should be able to convert a single character String to a single byte', () => {
                const byteArray = new Uint8Array( 1 );
                const result = write( byteArray, { foo: 'CHAR' }, { foo: 'S' }, 0 );
                expect( result.error ).toBe( false );
                expect( result.end ).toEqual( 1 );
                expect( result.byteArray ).toEqual( new Uint8Array([ 83 ]));
            });

            it('should be able to convert a multiple character String to multiple bytes', () => {
                const byteArray = new Uint8Array( 6 );
                const result = write( byteArray, { foo: 'CHAR[6]' }, { foo: 'STRING' }, 0 );
                expect( result.error ).toBe( false );
                expect( result.end ).toEqual( 6 );
                expect( result.byteArray ).toEqual( new Uint8Array([ 83, 84, 82, 73, 78, 71 ]));
            });
        });

        describe('and handling any of the 8-bit numerical types', () => {
            it('should be able to convert a single Number to a single byte', () => {
                const expected = new Uint8Array([ 0xf0 ]);
                [ types.BYTE, types.INT8 ].forEach(type => {
                    const byteArray = new Uint8Array( 1 );
                    const result = write( byteArray, { foo: type }, { foo: 240 }, 0 );
                    expect( result.error ).toBe( false );
                    expect( result.end ).toEqual( 1 );
                    expect( result.byteArray ).toEqual( expected );
                });
            });

            it('should be able to convert multiple Numbers to multiple bytes', () => {
                const expected = new Uint8Array([ 0xf0, 0xff, 0x00, 0xdd ]);
                [ types.BYTE, types.INT8 ].forEach(type => {
                    const byteArray = new Uint8Array( 4 );
                    const result = write( byteArray, { foo: `${type}[4]` }, { foo: [ 240, 255, 0, 221 ] }, 0 );
                    expect( result.error ).toBe( false );
                    expect( result.end ).toEqual( 4 );
                    expect( result.byteArray ).toEqual( expected );
                });
            });
        });

        describe('and handling any of the 16-bit numerical types', () => {
            it('should be able to convert a single Number to two bytes', () => {
                const expected = new Uint8Array([ 0xf0, 0xff ]);
                [ types.SHORT, types.INT16 ].forEach(type => {
                    const byteArray = new Uint8Array( 2 );
                    const result = write( byteArray, { foo: type }, { foo: 65520 }, 0 );
                    expect( result.error ).toBe( false );
                    expect( result.end ).toEqual( 2 );
                    expect( result.byteArray ).toEqual( expected );
                });
            });

            it('should be able to convert multiple Numbers to a multiple of two bytes', () => {
                const expected = new Uint8Array([ 0xf0, 0xff, 0x0f, 0xdd ]);
                [ types.SHORT, types.INT16 ].forEach(type => {
                    const byteArray = new Uint8Array( 4 );
                    const result = write( byteArray, { foo: `${type}[2]` }, { foo: [ 65520, 56591 ] }, 0 );
                    expect( result.error ).toBe( false );
                    expect( result.end ).toEqual( 4 );
                    expect( result.byteArray ).toEqual( expected );
                });
            });

            it('should be able to convert both Little Endian and Big Endian values', () => {
                [ types.SHORT, types.INT16 ].forEach( type => {
                    const byteArray = new Uint8Array( 2 );
                    expect(
                        write( byteArray, { foo: `${type}|LE` }, { foo: 61695 }, 0 ).byteArray
                    ).toEqual( new Uint8Array([ 0xff, 0xf0 ]));
                    expect(
                        write( byteArray, { foo: `${type}|BE` }, { foo: 61695 }, 0 ).byteArray
                    ).toEqual( new Uint8Array([ 0xf0, 0xff ]));
                });
            });
        });

        describe('and handling any of the 24-bit numerical types', () => {
            it('should be able to convert a single Number to three bytes', () => {
                const expected = new Uint8Array([ 0xf0, 0xff, 0xdd ]);
                const byteArray = new Uint8Array( 3 );
                const result = write( byteArray, { foo: types.INT24 }, { foo: 14548976 }, 0 );
                expect( result.error ).toBe( false );
                expect( result.end ).toEqual( 3 );
                expect( result.byteArray ).toEqual( expected );
            });

            it('should be able to convert multiple Numbers to a multiple of three bytes', () => {
                const expected = new Uint8Array([ 0xf0, 0xff, 0xdd, 0x0f, 0x00, 0x0a ]);
                const byteArray = new Uint8Array( 6 );
                const result = write( byteArray, { foo: 'INT24[2]' }, { foo: [ 14548976, 655375 ] }, 0 );
                expect( result.error ).toBe( false );
                expect( result.end ).toEqual( 6 );
                expect( result.byteArray ).toEqual( expected );
            });

            it('should be able to convert both Little Endian and Big Endian values', () => {
                const byteArray = new Uint8Array( 3 );
                expect(
                    write( byteArray, { foo: 'INT24|LE' }, { foo: 14545151 }, 0 ).byteArray
                ).toEqual( new Uint8Array([ 0xff, 0xf0, 0xdd ]));
                expect(
                    write( byteArray, { foo: 'INT24|BE' }, { foo: 14545151 }, 0 ).byteArray
                ).toEqual( new Uint8Array([ 0xdd, 0xf0, 0xff ]));
            });
        });

        describe('and handling any of the 32-bit numerical types', () => {
            describe('of the integer kind', () => {
                it('should be able to convert a single Number to four bytes', () => {
                    const expected = new Uint8Array([ 0x88, 0x54, 0x00, 0x00 ]);
                    [ types.LONG, types.INT32 ].forEach( type => {
                        const byteArray = new Uint8Array( 4 );
                        const result = write( byteArray, { foo: type }, { foo: 21640 }, 0 );
                        expect( result.error ).toBe( false );
                        expect( result.end ).toEqual( 4 );
                        expect( result.byteArray ).toEqual( expected );
                    });
                });

                it('should be able to convert multiple Numbers to a multiple of four bytes', () => {
                    const expected = new Uint8Array([ 0x88, 0x54, 0x00, 0x00, 0x0d, 0x0c, 0x0b, 0x0a ]);
                    [ types.LONG, types.INT32 ].forEach( type => {
                        const byteArray = new Uint8Array( 8 );
                        const result = write( byteArray, { foo: `${type}[2]` }, { foo: [ 21640, 168496141 ] }, 0 );
                        expect( result.error ).toBe( false );
                        expect( result.end ).toEqual( 8 );
                        expect( result.byteArray ).toEqual( expected );
                    });
                });

                it('should be able to convert both Little Endian and Big Endian values', () => {
                    [ types.LONG, types.INT32 ].forEach( type => {
                    const byteArray = new Uint8Array( 4 );
                        expect(
                            write( byteArray, { foo: `${type}|LE` }, { foo: 168496141 }, 0 ).byteArray
                        ).toEqual( new Uint8Array([ 0x0d, 0x0c, 0x0b, 0x0a ]));
                        expect(
                            write( byteArray, { foo: `${type}|BE` }, { foo: 168496141 }, 0 ).byteArray
                        ).toEqual( new Uint8Array([ 0x0a, 0x0b, 0x0c, 0x0d ]));
                    });
                });
            });

            describe('of the floating point kind', () => {
                it('should be able to convert a single Number to four bytes', () => {
                    const expected = new Uint8Array([ 0xdb, 0x0f, 0x49, 0x40 ]);
                    [ types.FLOAT, types.FLOAT32 ].forEach( type => {
                        const byteArray = new Uint8Array( 4 );
                        const result = write( byteArray, { foo: type }, { foo: 3.1415927410125732 }, 0 );
                        expect( result.error ).toBe( false );
                        expect( result.end ).toEqual( 4 );
                        expect( result.byteArray ).toEqual( expected );
                    });
                });

                it('should be able to convert both Little Endian and Big Endian values', () => {
                    [ types.FLOAT, types.FLOAT32 ].forEach( type => {
                    const byteArray = new Uint8Array( 4 );
                        expect(
                            write( byteArray, { foo: `${type}|LE` }, { foo: 0.3333333432674408 }, 0 ).byteArray
                        ).toEqual( new Uint8Array([ 0xab, 0xaa, 0xaa, 0x3e ]));
                        expect(
                            write( byteArray, { foo: `${type}|BE` }, { foo: 0.3333333432674408 }, 0 ).byteArray
                        ).toEqual( new Uint8Array([ 0x3e, 0xaa, 0xaa, 0xab ]));
                    });
                });
            });
        });

        describe('and handling any of the 64-bit numerical types', () => {
            describe('of the integer kind', () => {
                it('should be able to convert a single Number to eight bytes', () => {
                    const expected = new Uint8Array([ 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00 ]);
                    [ types.LONGLONG, types.INT64 ].forEach( type => {
                        const byteArray = new Uint8Array( 8 );
                        const result = write( byteArray, { foo: type }, { foo: Number.MAX_SAFE_INTEGER }, 0 );
                        expect( result.error ).toBe( false );
                        expect( result.end ).toEqual( 8 );
                        expect( result.byteArray ).toEqual( expected );
                    });
                });

                it('should be able to convert multiple Numbers to a multiple of eight bytes', () => {
                    const expected = new Uint8Array([ 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00, 0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00  ]);
                    [ types.LONGLONG, types.INT64 ].forEach( type => {
                        const byteArray = new Uint8Array( 16 );
                        const result = write( byteArray, { foo: `${type}[2]` }, { foo: [ Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1 ] }, 0 );
                        expect( result.error ).toBe( false );
                        expect( result.end ).toEqual( 16 );
                        expect( result.byteArray ).toEqual( expected );
                    });
                });

                it('should be able to convert both Little Endian and Big Endian values', () => {
                    [ types.LONGLONG, types.INT64 ].forEach( type => {
                        const byteArray = new Uint8Array( 8 );
                        expect(
                            write( byteArray, { foo: `${type}|LE` }, { foo: Number.MAX_SAFE_INTEGER }, 0 ).byteArray
                        ).toEqual( new Uint8Array([ 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00 ]));
                        expect(
                            write( byteArray, { foo: `${type}|BE` }, { foo: Number.MAX_SAFE_INTEGER }, 0 ).byteArray
                        ).toEqual( new Uint8Array([ 0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff ]));
                    });
                });
            });

            describe('of the floating point kind', () => {
                it('should be able to convert a single Number to eight bytes', () => {
                    const expected = new Uint8Array([ 0x00, 0x2c, 0x44, 0x54, 0xfb, 0x21, 0x09, 0x40 ]);
                    [ types.DOUBLE, types.FLOAT64 ].forEach( type => {
                        const byteArray = new Uint8Array( 8 );
                        const result = write( byteArray, { foo: type }, { foo: 3.1415926535896688 }, 0 );
                        expect( result.error ).toBe( false );
                        expect( result.end ).toEqual( 8 );
                        expect( result.byteArray ).toEqual( expected );
                    });
                });

                it('should be able to convert both Little Endian and Big Endian values', () => {
                    [ types.DOUBLE, types.FLOAT64 ].forEach( type => {
                        const byteArray = new Uint8Array( 8 );
                        expect(
                            write( byteArray, { foo: `${type}|LE` }, { foo: 0.3333333432674408 }, 0 ).byteArray
                        ).toEqual( new Uint8Array([ 0x00, 0x00, 0x00, 0x60, 0x55, 0x55, 0xd5, 0x3f ]));
                        expect(
                            write( byteArray, { foo: `${type}|BE` }, { foo: 0.3333333432674408 }, 0 ).byteArray
                        ).toEqual( new Uint8Array([ 0x3f, 0xd5, 0x55, 0x55, 0x60, 0x00, 0x00, 0x00 ]));
                    });
                });
            });
        });
    });

    describe('when writing binary data', () => {
        it('should be able to convert JSON values into bytes', () => {
            const byteArray = new Uint8Array( 44 );
            const result = write( byteArray, headerDefinition, binaryAsJson, 0 );
            expect( result.error ).toBe( false );
            expect( result.end ).toEqual( 44 );
            expect( result.byteArray ).toEqual( binaryFile );
        });

        it('should be able to convert JSON values converted into bytes back into JSON without loss of precision', () => {
            const byteArray = new Uint8Array( 44 );
            const result = write( byteArray, headerDefinition, binaryAsJson, 0 );
            expect( parse( result.byteArray, headerDefinition ).data ).toEqual( binaryAsJson );
        });
    });
});
