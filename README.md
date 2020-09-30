typed-file-parser
=================

## Defining a structure

Defining a structure is nothing more than declaring an Object where the keys
define a name meaningful to your purpose and the value is either:

* one of the available type enumerations.
* an Array where the first index is an enumerated type and the second is an integer defining the Array length

An example structure that defines the header of a .WAV file (see http://soundfile.sapp.org/doc/WaveFormat/)
would look like:

```
const { CHAR, INT16, INT32 } = TypedFileParser.types;

const wavHeader = Object.freeze({
    type: [ CHAR, 4 ],
    size: INT32,
    format: [ CHAR, 4 ],
    name: [ CHAR, 4 ],
    length: INT32,
    format: INT16,
    channelAmount: INT16,
    sampleRate: INT32,
    bytesPerSecond: INT32,
    blockAlign: INT16,
    bitsPerSample: INT16
});
```

Note that the order of the keys (and more importantly: their type definition) should match
the order of the values as described the particular file's type!

_Object.freeze()_ here is used to indicate that this is a static definition and shouldn't change.

## Reading a chunk of data into an Object of a specific structure type

There are three different methods with which you can supply binary data for parsing:

* _parseFile_ when file data is a reference to a File on the clients machine (async)
* _parseByteArray_ when file data is an Uint8Array
* _parseBase64_ when file data is a base64 encoded String

Each of the methods has the same signature:

```
parseFn( fileReference, structureDefinition, offset )
```

Where:

* _fileReference_ is the file to parse (one of File, Uint8Array or String)
* _structureDefinition_ is an Object defining a structure (as described above)
* _offset_ is a numerical index of where in the file's byte Array reading should start

### Example

If we intend to parse a .WAV audio file using the structure definition as defined
above, we can read the header like so (let's assume here the file has already
been read as a base64 String):

```
const { parseBase64 } = TypedFileParser;

const { data, end } = parseBase64( waveFileAsBase64, wavHeader, 0 );
console.log( data ); // will contain the properties of a WAV file header
console.log( offset ); // will describe the end offset of the header ()
```

If all has been read successfully, _data_ is not null but an Object that follows
the structure of _wavHeader_ and is populated with the actual file data.

_end_ describes at what offset in given file the structure's definition has ended.
This can be used for subsequent read operations where binary data is retrieved.
In the instance of reading a wave file, this basically means that, depending on
WAV file type, an Array consisting of either INT16 or FLOAT32 can be read from
that offset.

#### A note on reading from File reference

Remember when using _parseFile_ that the method is asynchronous:

```
const { parseFile } = TypedFileParser;

async function parseFileHeader() {
    const { data, end } = await parseFile( fileReference, structureDefinition, offset );
    ...do stuff with data (check for null!)
}
```

This can be executed as the callback from an _input[type=file]_ after the user
has selected their file.

## Compatibility

_type-file-parser_ should work fine on Internet Explorer 10 and up. You can
test for this by querying the result of the _isSupported()_-method:

```
import TypedFileParser from 'type-file-parser';

if (TypedFileParser.isSupported()) {
    ...do stuff!
}
```
