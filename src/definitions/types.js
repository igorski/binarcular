/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 Igor Zinken https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Enumeration of all supported types. Note that there is some duplication
 * in type as they basically specify the same byte size and some variants
 * are meaningless in JavaScript. Their definition functions basically to
 * accurately describe the intent of the file format being read.
 */
const TYPE_NAMES = [
    'CHAR',
    'BYTE', 'INT8', 'UINT8',
    'SHORT', 'INT16', 'UINT16',
    'INT24', 'UINT24',
    'INT32', 'UINT32', 'LONG', 'ULONG', 'FLOAT', 'FLOAT32',
    'INT64', 'UINT64', 'LONGLONG', 'ULONGLONG', 'DOUBLE', 'FLOAT64',
];

export const types = Object.freeze( TYPE_NAMES.reduce(( acc, name ) => {
    acc[ name ] = name;
    return acc;
}, {}));

// JavaScript doesn't distinguish between integer or floating point values in its
// Number type, here we list the types that should be converted to floating point

export const floatingPointTypes = [
    types.FLOAT, types.FLOAT32, types.DOUBLE, types.FLOAT64
];

// and the same for unsigned and 64-bit values

export const unsignedTypes = [
    types.UINT8, types.UINT16, types.UINT24, types.UINT32, types.ULONG, types.UINT64, types.ULONGLONG
];

export const sixtyFourBitTypes = [
    types.INT64, types.UINT64, types.LONGLONG, types.ULONGLONG, types.DOUBLE, types.FLOAT64
];

/**
 * Calculates the size in bytes for given structure's data types
 */
export function getSizeForStructure( structureDefinition ) {
    let size = 0;
    Object.values( structureDefinition ).forEach( typeDefinition => {
        const type   = getDataTypeFromDefinition( typeDefinition );
        const length = getLengthFromDefinition( typeDefinition );

        switch ( type ) {
            case types.CHAR:
            case types.BYTE:
            case types.INT8:
            case types.UINT8:
                size += length;
                break;
            case types.SHORT:
            case types.INT16:
            case types.UINT16:
                size += ( length * 2 );
                break;
            case types.INT24:
            case types.UINT24:
                size += ( length * 3 );
                break;
            case types.INT32:
            case types.UINT32:
            case types.LONG:
            case types.ULONG:
            case types.FLOAT:
            case types.FLOAT32:
                size += ( length * 4 );
                break;
            case types.INT64:
            case types.UINT64:
            case types.LONGLONG:
            case types.ULONGLONG:
            case types.DOUBLE:
            case types.FLOAT64:
                size += ( length * 8 );
                break;
            default:
                throw new Error( `Unsupported data type "${type}"` );
        }
    });
    return size;
}

/**
 * Parse the definition string and retrieve the data type
 */
export const getDataTypeFromDefinition = typeDefinition => typeDefinition.split( /(\[|\|)/ )[0];

/**
 * Parse the requested length (if Array notation is present) for given definition string
 * The correct expression here would be /(?<=\[)\d+(?=\])/
 * but Safari does not support the look behind, the below works fine though for
 * annotations like 'INT16[30]', 'INT16|LE[30]' and 'INT16[30]|LE'
 */
export const getLengthFromDefinition = typeDefinition => parseInt( typeDefinition.match( /\d+(?=\])/ )?.[0] ?? 1 );

export function isDefinitionForLittleEndian( typeDefinition ) {
    if ( typeDefinition.includes( '|BE' )) {
        return false;
    } else if ( typeDefinition.includes( '|LE' )) {
        return true;
    }
    return isLittleEndian(); // when unspecified, default to client environment
};

/**
 * We'll be using TypedArrays meaning read data will be converted to the
 * endianness of the environment. We lazily calculate the environment
 * endianness this when required.
 */
let _isLittleEndian = undefined;
export function isLittleEndian() {
    if ( _isLittleEndian === undefined ) {
        const b = new ArrayBuffer( 4 );
        const a = new Uint32Array( b );
        const c = new Uint8Array (b );
        a[ 0 ]  = 0xdeadbeef;

        _isLittleEndian = c[ 0 ] === 0xef;
    }
    return _isLittleEndian;
}
