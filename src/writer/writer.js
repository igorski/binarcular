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
import {
    types, floatingPointTypes, unsignedTypes, sixtyFourBitTypes,
    getSizeForStructure, getDataTypeFromDefinition, getLengthFromDefinition,
    isDefinitionForLittleEndian
} from '@/definitions/types';

/* internal methods */

/**
 * The bread and butter of this library.
 * Format given value into bytes using its typeDefinition for conversion and
 * write the byte(s) starting at given offset into given ByteArray.
 * Returns offset at which writing has ended
 */
function writeDataForType( typeDefinition, value, byteArray, offset ) {
    const type   = getDataTypeFromDefinition( typeDefinition );
    const length = getLengthFromDefinition( typeDefinition );

    let writeOffset = offset;

    if ( offset + ( length - 1 ) >= byteArray.length ) {
        return 0;
    }
    const littleEndian      = isDefinitionForLittleEndian( typeDefinition );
    const isFloat           = floatingPointTypes.includes( type );
    const isUnsigned        = unsignedTypes.includes( type );
    const dataView          = isFloat || sixtyFourBitTypes.includes( type ) ? new DataView( byteArray.buffer ) : null;

    switch ( type ) {
        default:
            return writeOffset;

         // NOTE we duplicate between single and list based values to
         // omit the need for a slicing operation on the ByteArray
         // 8-bit String type
         case types.CHAR:
             if ( length === 1 ) {
                 byteArray[ writeOffset ] = value.charCodeAt( 0 );
             } else {
                for ( let i = 0; i < length; ++i ) {
                    byteArray[ writeOffset + i ] = value.charCodeAt( i );
                }
             }
             writeOffset += length;
             break;

         // 8-bit Number types
         case types.BYTE:
         case types.INT8:
         case types.UINT8:
             if ( length === 1 ) {
                 byteArray[ writeOffset ] = value;
             } else {
                for ( let i = 0; i < length; ++i ) {
                    byteArray[ writeOffset + i ] = value[ i ];
                }
             }
             writeOffset += length;
             break;

         // NOTE the large bit shift statements aren't the most readable, but here we
         // take comfort in knowing that their performance is nice enough given
         // that this method is already abstracted behind several subroutines
         // 16-bit Number types
         case types.SHORT:
         case types.INT16:
         case types.UINT16:
             writeMultiple( writeOffset, length, 2, ( i, w ) => {
                 const valueToWrite = length === 1 ? value : value[ i ];
                 if ( littleEndian ) {
                     byteArray[ w + 1 ] = ( valueToWrite >> 8 ) & 0xff;
                     byteArray[ w ]     = ( valueToWrite & 0xff );
                 } else {
                     byteArray[ w ]     = ( valueToWrite >> 8 ) & 0xff;
                     byteArray[ w + 1 ] = ( valueToWrite & 0xff );
                 }
             });
             writeOffset += length * 2;
             break;

         // 24-bit Number types (this is more meaningful to those dealing with audio formats)
         case types.INT24:
         case types.UINT24:
             writeMultiple( writeOffset, length, 3, ( i, w ) => {
                 const valueToWrite = length === 1 ? value : value[ i ];
                 if ( littleEndian ) {
                     byteArray[ w + 2 ] = ( valueToWrite >> 16 ) & 0xff;
                     byteArray[ w + 1 ] = ( valueToWrite >> 8 ) & 0xff;
                     byteArray[ w ]     = ( valueToWrite & 0xff );
                 } else {
                     byteArray[ w ]     = ( valueToWrite >> 16 ) & 0xff;
                     byteArray[ w + 1 ] = ( valueToWrite >> 8 ) & 0xff;
                     byteArray[ w + 2 ] = ( valueToWrite & 0xff );
                 }
             });
             writeOffset += length * 3;
             break;

         // 32-bit integer Number types
         case types.INT32:
         case types.UINT32:
         case types.LONG:
         case types.ULONG:
         case types.FLOAT:
         case types.FLOAT32:
             writeMultiple( writeOffset, length, 4, ( i, w ) => {
                 const valueToWrite = length === 1 ? value : value[ i ];
                 if ( isFloat ) {
                     dataView.setFloat32( w, valueToWrite, littleEndian );
                 } else {
                     if ( littleEndian ) {
                         byteArray[ w + 3 ] = ( valueToWrite & 0xff000000 ) >> 24;
                         byteArray[ w + 2 ] = ( valueToWrite & 0x00ff0000 ) >> 16;
                         byteArray[ w + 1 ] = ( valueToWrite & 0x0000ff00 ) >> 8;
                         byteArray[ w  ]    = ( valueToWrite & 0x000000ff );
                     } else {
                         byteArray[ w ]     = ( valueToWrite & 0xff000000 ) >> 24;
                         byteArray[ w + 1 ] = ( valueToWrite & 0x00ff0000 ) >> 16;
                         byteArray[ w + 2 ] = ( valueToWrite & 0x0000ff00 ) >> 8;
                         byteArray[ w + 3 ] = ( valueToWrite & 0x000000ff );
                     }
                 }
             });
             writeOffset += length * 4;
             break;

         // 64-bit Number types
         case types.INT64:
         case types.UINT64:
         case types.LONGLONG:
         case types.ULONGLONG:
         case types.DOUBLE:
         case types.FLOAT64:
             writeMultiple( writeOffset, length, 8, ( i, w ) => {
                 const valueToWrite = length === 1 ? value : value[ i ];
                 if ( isFloat ) {
                     dataView.setFloat64( w, valueToWrite, littleEndian );
                 } else {
                     dataView[ isUnsigned ? 'setBigUint64' : 'setBigInt64' ]( w, BigInt( valueToWrite ), littleEndian );
                 }
             });
             writeOffset += length * 8;
             break;
    }
    return writeOffset;
}

/**
 * Write one or more Numbers (defined by length)
 * at given writeOffset for the amount of bytes defined by size
 * where the value(s) is/are transformed by supplied fn
 */
function writeMultiple( writeOffset, length, size, fn ) {
    for ( let i = 0; i < length; i++ ) {
        fn( i, writeOffset + ( i * size ));
    }
}

/* public API */

export function write( byteArray, structureDefinition, dataToWrite, optWriteOffset = 0 ) {
    const total         = optWriteOffset + getSizeForStructure( structureDefinition );
    const structureKeys = Object.keys( structureDefinition );
    const totalKeys     = structureKeys.length;
    let keyIndex        = 0;

    const out = {
        byteArray,
        end: optWriteOffset,
        error: false
    };

    let i = Math.max( 0, optWriteOffset );
    for ( i; i < total && keyIndex < totalKeys; ) {
        const key            = structureKeys[ keyIndex ];
        const typeDefinition = structureDefinition[ key ];

        const newOffset = writeDataForType( typeDefinition, dataToWrite[ key ], byteArray, i );

        if ( newOffset === 0 ) {
            out.error = true;
            return out;
        }

        i = newOffset;
        ++keyIndex;
    }
    out.end   = i;
    out.error = out.end !== total;

    return out;
}
