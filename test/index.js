var expect = require("chai").expect;
var proxyquire = require("proxyquire");
var util = require("util");
var EventEmitter = require("events").EventEmitter;



//**********************************************************
// We write a custom stream to mock the fs WriteStream
// to track all the requests we expect to come out of the
// usage of the safe stream
//**********************************************************
function StubbedWriteStream() {

    EventEmitter.call(this);

    this.data = "";

    this.writeReturnValue = true;

    this.fireDrain = function() {
        this.emit("drain", {});
    };

}
util.inherits(StubbedWriteStream, EventEmitter);


Object.defineProperty(StubbedWriteStream.prototype, "write", {
    value: function(data, options, callback) {
        this.data += data;
        return this.writeReturnValue;
    }
});
Object.defineProperty(StubbedWriteStream.prototype, "end", {
    value: function(data, options, callback) {
        if (data) {
            this.data += data;
        }
    }
});
//**********************************************************



// We have proxyquire return the stubbed out stream that the
// safe stream inherits from.
var WriteStream = proxyquire("../", {
    "fs": {
        "WriteStream": StubbedWriteStream
    }
}).WriteStream;



describe("Write Stream Test Suite", function() {


    it("Test open and end to the stream", function() {

        var value = "OpenAndEnd";
        var stream = new WriteStream(".tmp-file");
        stream.end(value);

        // Should be value
        expect(stream.data).to.equal(value);

        // Now the next write should throw an exception
        expect(stream.write.bind(stream,"foo")).to.throw("Stream has ended");

    });

    it("Test writing to an ended stream", function() {

        var value = "OpenAndEnd";
        var stream = new WriteStream(".tmp-file");
        stream.end(value);

        // Should be value
        expect(stream.data).to.equal(value);
    });

    it("Test a few writes and an end to the stream", function() {

        var value = "Open-And-Dont-End-Foo";
        var stream = new WriteStream(".tmp-file");
        value.split("-").forEach(function(p, i, arr) {
            if (i + 1 !== arr.length) {
                stream.write(p + "-");
            } else {
                stream.end(p);
            }
        });

        // Should be value
        expect(stream.data).to.equal(value);
    });


    it("Test drain on the stream", function() {

        var values = ["ImmediateWrite","Queue"];
        var stream = new WriteStream(".tmp-file");
        stream.writeReturnValue = false;
        stream.write(values[0]);
        stream.end(values[1]);

        // Should be waiting on the drain to process the last value.
        expect(stream.data).to.equal(values[0]);

        // Fire the drain event
        stream.fireDrain();

        // Should be value
        expect(stream.data).to.equal(values.join(""));
    });

});
