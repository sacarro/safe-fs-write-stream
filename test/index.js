var WriteStream =  require("../").WriteStream;


var stream = new WriteStream("/tmp/sam-test");
for(var i = 0; i < 5000; i++){
    stream.write("Hey you there standing on the wall with your feet turned.\n");
}
stream.end("And so it ends\n");
