# safe-fs-write-stream


Stream that watches the return from the write call to see if it does not immediately write, and if it doesn't, will wait to make the next write request until the drain event is fired.


````
?> npm install
?> npm test
````
