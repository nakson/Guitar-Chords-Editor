var http = require("http"); //need to http
var fs = require("fs"); //need to read static files
var url = require("url"); //to parse url strings

var ROOT_DIR = "html";
var SONGS_DIR = "html/songs";
var songs = ["Brown Eyed Girl", "Sister Golden Hair", "Peaceful Easy Feeling"];

var MIME_TYPES = {
    css: "text/css",
    gif: "image/gif",
    htm: "text/html",
    html: "text/html",
    ico: "image/x-icon",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "text/javascript", //should really be application/javascript
    json: "application/json",
    png: "image/png",
    txt: "text/plain"
};

var get_mime = function(filename) {
    var ext, type;
    for (ext in MIME_TYPES) {
        type = MIME_TYPES[ext];
        if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
            return type;
        }
    }
    return MIME_TYPES["txt"];
};

http.createServer(function(request, response) {
    var urlObj = url.parse(request.url, true, false);
    console.log("\n============================");
    console.log("PATHNAME: " + urlObj.pathname);
    console.log("REQUEST: " + SONGS_DIR + urlObj.pathname);
    console.log("METHOD: " + request.method);

    var receivedData = "";

    request.on("data", function(chunk) {
        receivedData += chunk;
    });

    request.on("end", function() {
        console.log("received data: ", receivedData);
        console.log("type: ", typeof receivedData);

        if (request.method == "POST") {
            var dataObj = JSON.parse(receivedData);
            console.log("received data object: ", dataObj);
            console.log("type: ", typeof dataObj);

            console.log("USER REQUEST: " + dataObj.text);
            var returnObj = {};

			// If the client provided text to write to a file, write it to the file.
            if (dataObj.hasOwnProperty('fileTitle')) {
                fs.writeFile(SONGS_DIR + "/"+dataObj.fileTitle+'.txt', dataObj.fileText, (err) => {
                    if (err) throw err;
                });

				// Add this new song to an array of songs.
                songs.push(dataObj.fileTitle);
            } else {

				// if the user is requesting a song based on a name
				// and its a song we have saved
                if (songs.includes(dataObj.text)) {
                    var filePath = SONGS_DIR + "/" + dataObj.text +".txt";
                    var lines = [];

					// Read that songs file and return it to the user
                    fs. readFile(filePath, function(err, data) {
                        if (err) {
                            console.log("ERROR: " + JSON.stringify(err));
                            response.writeHead(404);
                            response.end(JSON.stringify(err));
                            return;
                        }

						// Split the song file into lines then return them
                        lines = data.toString().split("\n");
                        returnObj.lineArray = lines;

                        response.writeHead(200, { "Content-Type": get_mime(filePath) });
                        response.end(JSON.stringify(returnObj));
                    });
                } else {
                    // if the requested song does not exist, return
                    // an empty object
                    response.writeHead(200);
                    response.end(JSON.stringify(returnObj));
                }
            }
        }

		// Load the user's specified URL
        if (request.method == "GET") {
            var filePath = ROOT_DIR + urlObj.pathname;

            fs.readFile(filePath, function(err, data) {
                if (err) {
                    console.log("ERROR: " + JSON.stringify(err));
                    response.writeHead(404);
                    response.end(JSON.stringify(err));
                    return;
                }

                response.writeHead(200, { "Content-Type": get_mime(filePath) });
                response.end(data);
            });
        }
    });
}).listen(3000);

  console.log("Server Running at http://localhost:3000/index.html CNTL-C to quit");
