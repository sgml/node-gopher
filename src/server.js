var net = require("net");
var fs = require("fs");
var pathMod = require("path");
var log4js = require('log4js');
var getConfig = require("../config.js");

var logger = log4js.getLogger();

// moved 'port' out of createServer() to make 
// available to server's conn.write() actions
var port = getConfig("port", 70);


function createServer()
{
    var server = net.createServer(function(conn) {
        logger.debug("Client has connected");
        conn.on("end", function() {
            logger.debug("Client disconnected");
        });
        conn.on("data", function(buff) {
            dataHandler(buff, conn);
        });
    });

    server.listen(port, function() {
        logger.info("Server bound");
    });
}


function dataHandler(buff, conn)
{
    var selector = buff.toString("utf-8",0,buff.byteLength-2);
    // Both "" and "/" requests from clients are treated
    //  as "", else file paths are preceded by "//"
    if (selector === "/") selector = "";  
    var fileExists = true;
    try
    {
        messageOfTheDay(conn, selector);
        fs.accessSync(getConfig("root","doc"));
    }
    catch(err)
    {
        fileExists = false;
        error(conn, err);
    }
    
    if(fileExists)
    {
        var path = getConfig("root","doc") + selector;

        logger.debug("Path: " + path);

        var selStat = fs.lstatSync(path);

        if(selStat.isDirectory())
        {
            directoryReader(conn, path, selector);
        }
        if(selStat.isFile())
        {
            fileReader(conn, path);
        }
        conn.end();
    }
}

function fileReader(conn, path)
{
    var data = null;
    switch(pathMod.extname(path))
    {
        // If a file has the ending .txt, we wanna read it as a utf-8 file.
        case ".txt":
        {
            data = fs.readFileSync(path,{encoding: "utf-8"});
            break;
        }
        // Otherwise, it's probably a binary blob, so just transmit it raw.
        default:
        {
            data = fs.readFileSync(path);
            break;
        }
    }
    conn.write(data);
}

// TODO:  Add code to exclude motd and 
// gophermap files from listing
function directoryReader(conn, path, selector)
{
    var files = fs.readdirSync(path);
    for(var i = 0;i < files.length;i++)
    {
        var fileName = "/" + files[i];
        var fStat = fs.lstatSync(path + fileName);
        if(fStat.isDirectory())
        {
            conn.write("1"+fileName.substr(1)+"\t"+selector+fileName+"\tlocalhost\t"+port+"\r\n");
        }
        else if(fStat.isFile())
        {
            var fileType = fileTypeSelector(fileName);
            conn.write(fileType+fileName.substr(1)+"\t"+selector+fileName+"\tlocalhost\t"+port+"\r\n");
        }
    }
    conn.write(".");
}

// TODO: determine filetype by means other than
// matching extension.
function fileTypeSelector(fileName)
{
    var ft = "9";
    switch(pathMod.extname(fileName))
    {
        case ".txt":
            ft = "0";
            break;
        case ".gif":
            ft = "g";
            break;
        case ".mp3":
            if(getConfig("allowMp3", false)) 
                ft = "s";
            break;
        case ".wav":
            ft = "s";
            break;
    }
    return ft;
}

function error(conn, err)
{
    var stack = err.stack.split("\n");
    for(var e = 0;e < stack.length;e++)
    {
        conn.write("3" + stack[e] + "\tlocalhost\t"+port+"\r\n");
    }
    conn.write(".");
    conn.end();
}

function messageOfTheDay(conn, selector)
{
    var motd = fs.readFileSync(getConfig("motd","motd.txt"),{encoding: "utf-8"}).split("\n");

    if(selector === "")
    {
        for(var m = 0;m < motd.length;m++)
        {
            // Invalid directory entities may be ignored by
            // some clients. The three tab characters make 
            // this a valid, if null, directory entity.
            conn.write("i"+motd[m]+"\t\t\t\r\n");
        }
    }
}

module.exports = createServer;