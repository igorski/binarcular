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
    types, getSizeForStructure, getDataTypeFromDefinition, getLengthFromDefinition
} from '@/definitions/types';

/* public API */

self.addEventListener( 'message', handleMessage, false );

/* internal methods */

// JavaScript doesn't distinguish between integer or floating point values in its
// Number type, here we list the types that should be converted to floating point

const FLOATING_POINT_TYPES = [
    types.FLOAT, types.FLOAT32, types.DOUBLE, types.FLOAT64
];

/**
 * We'll be using TypedArrays meaning read data will be converted to the
 * endianness of the environment. We lazily calculate this when required.
 */
let _isLittleEndian = undefined;
function isLittleEndian() {
    if ( _isLittleEndian === undefined ) {
        const b = new ArrayBuffer( 4 );
        const a = new Uint32Array( b );
        const c = new Uint8Array (b );
        a[ 0 ]  = 0xdeadbeef;

        _isLittleEndian = c[ 0 ] === 0xef;
    }
    return _isLittleEndian;
}

/**
 * For floating point conversions we can leverage the methods of the DataView
 * class. Instead of constantly recreating this we can lazily create and reuse one.
 * Note: this is only pooled for the 32-bit data types.
 */
let _dataView = undefined;
function getDataView() {
    if ( _dataView === undefined ) {
        _dataView = new DataView( new Uint8Array( 4 ).buffer );
    }
    return _dataView;
}

/**
 * The bread and butter of this library.
 * Read the byte(s) starting at given offset from given ByteArray
 * and return the formatted data type.
 */
function getDataForType( typeDefinition, byteArray, offset ) {
     const out = {
         value: undefined,
         offset
     };

     const type   = getDataTypeFromDefinition( typeDefinition );
     const length = getLengthFromDefinition( typeDefinition );

     if ( offset + ( length - 1 ) >= byteArray.length ) {
         return out;
     }
     const littleEndian = isDefinitionForLittleEndian( typeDefinition );
     const isFloat      = FLOATING_POINT_TYPES.includes( type );
     const dataView     = isFloat ? getDataView() : null;

     switch ( type ) {
         default:
             return out;

         // NOTE we duplicate between single and list based values to
         // omit the need for a slicing operation on the ByteArray
         // 8-bit String type
         case types.CHAR:
             if ( length === 1 ) {
                 out.value = String.fromCharCode( byteArray[ offset ]);
             } else {
                 out.value = [...byteArray.slice( offset, offset + length )].map( byte => String.fromCharCode( byte )).join( '' );
             }
             out.offset += length;
             break;

         // 8-bit Number types
         case types.BYTE:
         case types.INT8:
         case types.UINT8:
             if ( length === 1 ) {
                 out.value = byteArray[ offset ];
             } else {
                 out.value = [...byteArray.slice( offset, offset + length )];
             }
             out.offset += length;
             break;

         // NOTE the large bit shift statements aren't the most readable, but here we
         // take comfort in knowing that their performance is nice enough given
         // that this method is already abstracted behind several subroutines
         // 16-bit Number types
         case types.SHORT:
         case types.INT16:
         case types.UINT16:
             // we will need to combine two bytes into one value
             out.value = combineBytes( offset, length, 2, it => {
                 if ( littleEndian ) {
                     return (byteArray[ it + 1 ] << 8) | byteArray[ it ];
                 } else {
                     return (byteArray[ it ] << 8) | byteArray[ it + 1 ];
                 }
             });
             out.offset += length * 2;
             break;

         // 24-bit Number types (this is more meaningful to those dealing with audio formats)
         case types.INT24:
         case types.UINT24:
             // we will need to combine three bytes into one value
             out.value = combineBytes( offset, length, 3, it => {
                 if ( littleEndian ) {
                     return (byteArray[ it + 2 ] << 16) | (byteArray[ it + 1 ] << 8) | byteArray[ it ];
                 } else {
                     return (byteArray[ it ] << 16) | (byteArray[ it + 1 ] << 8) | byteArray[ it + 2 ];
                 }
             });
             out.offset += length * 3;
             break;

         // 32-bit integer Number types
         case types.INT32:
         case types.UINT32:
         case types.LONG:
         case types.ULONG:
         case types.FLOAT:
         case types.FLOAT32:
             // we will need to combine four bytes into one value
             out.value = combineBytes( offset, length, 4, it => {
                 let value;
                 if ( littleEndian ) {
                     value = (byteArray[ it + 3 ] << 24) | (byteArray[ it + 2 ] << 16) | (byteArray[ it + 1 ] << 8) | byteArray[ it ];
                 } else {
                     value = (byteArray[ it ] << 24) | (byteArray[ it + 1 ] << 16) | (byteArray[ it + 2 ] << 8) | byteArray[ it + 3 ];
                 }
                 if ( isFloat ) {
                     dataView.setInt32( 0, value );
                     return dataView.getFloat32();
                 }
                 return value;
             });
             out.offset += length * 4;
             break;

         // 64-bit Number types
         case types.INT64:
         case types.UINT64:
         case types.LONGLONG:
         case types.ULONGLONG:
         case types.DOUBLE:
         case types.FLOAT64:
             // we will need to combine eight bytes into one value
             out.value = combineBytes( offset, length, 8, it => {
                 // as JavaScripts MAX_SAFE_INTEGER is 53-bits we need to perform some
                 // magic with a custom DataView here (which gives this conversion some overhead)
                 const bytes = byteArray.slice( it, it + 8 );
                 const dataView = new DataView( bytes.buffer );

                 // tiny loss of precision for a max value (8 times 0xff)
                 // this returns 18,446,744,073,709,552,000 instead of 18,446,744,073,709,551,615 (max uint64 value)
                 // also note endianness used here is from the client machine and not from the typeDefinition as DataView handles this
                 const value = dataView.getUint32( 0, _isLittleEndian ) + 2 ** 32 * dataView.getUint32( 4, _isLittleEndian );

                 if ( isFloat ) {
                     dataView.setBigInt64( 0, BigInt( value ));
                     return dataView.getFloat64();
                 }
                 return value;
             });
             out.offset += length * 8;
             break;
     }
     return out;
 }

 /**
  * Combine multiple bytes (defined by amount) from given offset
  * into the amount of values defined by length, where the value(s)
  * is/are transformed by supplied fn
  */
 function combineBytes( offset, length, amount, fn ) {
     const isList = length > 1;
     const max    = offset + ( length * amount );

     let value = isList ? [] : 0;
     for ( let i = offset; i < max; i += amount ) {
         const combinedValue = fn( i );
         if ( isList ) {
             value.push( combinedValue );
         } else {
             value = combinedValue;
         }
     }
     return value;
 }

 const isDefinitionForLittleEndian = typeDefinition => {
     if ( typeDefinition.includes( '|BE' )) {
         return false;
     } else if ( typeDefinition.includes( '|LE' )) {
         return true;
     }
     return isLittleEndian(); // when unspecified, default to client environment
 };

function handleMessage({ data }) {
    let result;
    switch ( data.cmd ) {
        default:
            throw new Error( 'unknown cmd' );

        // note we return the byteArrays to restore ownership
        // to the main execution context

        case 'parse':
            self.postMessage({
                ...parseByteArray( data ),
                byteArray: data.byteArray },
                [ data.byteArray.buffer ]
            );
            break;

        case 'scan':
            self.postMessage({
                offset: scanByteArray( data ),
                byteArray: data.byteArray
            }, [ data.byteArray.buffer ]);
            break;
    }
}

function parseByteArray({ byteArray, structureDefinition, offset }) {
    const total         = byteArray.length;
    const structureKeys = Object.keys( structureDefinition );
    const totalKeys     = structureKeys.length;
    let keyIndex        = 0;

    const out = {
        data: {},
        end: offset,
        error: false
    };

    let i = Math.max( 0, offset );
    for ( i; i < total && keyIndex < totalKeys; ) {
        const key            = structureKeys[ keyIndex ];
        const typeDefinition = structureDefinition[ key ];
        const result         = getDataForType( typeDefinition, byteArray, i );

        if ( result.value === undefined ) {
            out.error = true;
            return out; // failed to read data
        }

        out.data[ key ] = result.value;
        i = result.offset;
        ++keyIndex;
    }
    out.end   = i;
    out.error = out.end !== offset + getSizeForStructure( structureDefinition );

    return out;
}

function scanByteArray({ byteArray, compareByteArray, offset }) {
    const total        = byteArray.length;
    const searchLength = compareByteArray.length;

    for ( let i = offset; i < total; ++i ) {
        if ( byteArray[ i ] !== compareByteArray[ 0 ]) {
            continue;
        }
        const block = byteArray.slice( i, i + searchLength );

        if ( block.every(( value, index ) => value === compareByteArray[ index ])) {
            return i;
        }
    }
    return Infinity;
}
