var util = require("util");
var WriteStream = require("fs").WriteStream;

/**
 * FS Write stream extension that maintains a queue of write
 * requests when a write is not immediately executed. It will
 * start writing again once the 'drain' event has been fired.
 */
function FsSafeWriteStream(path, options) {

    // Super constructor
    WriteStream.call(this, path, options);

    /**
     * Flag for whther or not this is waiting for a
     * write to drain.
     *
     * @private
     * @type {boolean}
     */
    var isWaiting = false;

    /**
     * The queue of write requests.
     *
     * @private
     * @type {object[]}
     */
    var queue = [];

    // Always listen to the drain event so that we know
    // when we can start writing again.
    this.on("drain", function() {
        this.doWrite();
    });


    /**
     * Attempts to take the next write request off the queue
     * and write it to the stream.
     *
     * @private
     */
    Object.defineProperty(this, "doWrite", {
        enumerable: false,
        writable: false,
        value: function doWrite() {

            if (!queue || !queue.length) {
                isWaiting = false;
                return;
            }

            var nextWrite = queue.shift();

            // Check to see if it is a call to end the stream.
            if (nextWrite.isEnd) {
                // For some reson this would never actually write the bytes
                // WriteStream.prototype.end.apply(this, nextWrite.args);
                // So we just do a write then an end with no arguments
                if (nextWrite.args.length) {
                    WriteStream.prototype.write.apply(this, nextWrite.args);
                }
                WriteStream.prototype.end.apply(this);
                queue = null;
                return;
            }

            // Otherwise write the stream as requested and check to 
            // see if we can keep writing
            if (WriteStream.prototype.write.apply(this, nextWrite.args)) {
                this.doWrite();
            }
        }
    });

    /**
     * Adds the write request to the queue and starts writing if this
     * is not already writing requests.
     *
     * @param {object[]} writeArgs - The arguments to pass to the write.
     * @param {boolean} isEnd - True if the request is from a call to the end function, false otherwise.
     */
    Object.defineProperty(this, "requestWrite", {
        enumerable: false,
        writable: false,
        value: function requestWrite(writeArgs, isEnd) {

            if (!queue) {
                throw new Error("Stream has ended");
            }

            queue.push({
                args: writeArgs,
                isEnd: isEnd
            });

            if (!isWaiting) {
                isWaiting = true;
                this.doWrite();
            }
        }

    });

}
util.inherits(FsSafeWriteStream, WriteStream);


/**
 * Requests a write to the stream.
 */
Object.defineProperty(FsSafeWriteStream.prototype, "write", {
    enumerable: true,
    writable: false,
    value: function write() {
        this.requestWrite(Array.prototype.slice.call(arguments, 0));
    }
});

/**
 * Requests an end to the stream.
 */
Object.defineProperty(FsSafeWriteStream.prototype, "end", {
    enumerable: true,
    writable: false,
    value: function end() {
        this.requestWrite(Array.prototype.slice.call(arguments, 0), true);
    }
});


module.exports = {
    WriteStream: FsSafeWriteStream
};
