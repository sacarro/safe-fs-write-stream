var util = require("util");
var WriteStream = require("fs").WriteStream;

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


    this.on("drain", function() {

        console.warn("DRAINING");
        setImmediate(function() {
            this.doWrite();
        }.bind(this));
    });


    this.on("finish", function() {
        console.warn("FINISHED");
    });


    this.on("error", function() {
        console.log("EEEEEEEEEEEEEEEEEEEERRRRRRORRRR", arguments);
    });


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
                console.log("Doing end", nextWrite.args);
                WriteStream.prototype.end.apply(this, nextWrite.args);
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


Object.defineProperty(FsSafeWriteStream.prototype, "write", {

    enumerable: true,
    writable: false,
    value: function write() {
        this.requestWrite(Array.prototype.slice.call(arguments, 0));

    }
});

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
