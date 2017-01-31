var net = require("net");
var fs = require("fs");
var pathMod = require("path");
var log4js = require('log4js');
var getConfig = require("../config.js");

var logger = log4js.getLogger();

function createServer()
{
    var server = net.createServer(function(conn) {
        logger.info("Client has connected");
        conn.on("end", function() {
            logger.info("Client disconnected");
        });
        conn.on("data", dataHandler);
    });

    server.listen(getConfig("port", 70), function() {
        logger.info("Server bound");
    });
}

function dataHandler(buff)
{
    var selector = buff.toString("utf-8",0,buff.byteLength-2);
    var fileExists = true;
    try
    {
        var motd = fs.readFileSync(getConfig("motd","motd.txt"),{encoding: "utf-8"}).split("\n");
        if(selector === "")
        {
            for(var m = 0;m < motd.length;m++)
            {
                conn.write("i"+motd[m]+"\tlocalhost\t70\n\r");
            }
        }
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
            directoryReader(conn, path);
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
        case ".txt":
        {
            data = fs.readFileSync(path,{encoding: "utf-8"});
            break;
        }
        default:
        {
            data = fs.readFileSync(path);
            break;
        }
    }
    conn.write(data);
}

function directoryReader(conn, path)
{
    var files = fs.readdirSync(path);
    for(var i = 0;i < files.length;i++)
    {
        var fileName = "/" + files[i];
        var fStat = fs.lstatSync(path + fileName);
        if(fStat.isDirectory())
        {
            conn.write("1"+fileName.substr(1)+"\t"+selector+fileName+"\tlocalhost\t70\n\r");
        }
        else if(fStat.isFile())
        {
            var fileType = fileType();
            conn.write(fileType+fileName.substr(1)+"\t"+selector+fileName+"\tlocalhost\t70\n\r");
        }
    }
    conn.write(".");
}

function fileType(fileName)
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
        conn.write("3" + stack[e] + "\tlocalhost\70\n\r");
    }
    conn.write(".");
    conn.end();
}

module.exports = createServer;