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
        conn.on("data", function(buff) {
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
                var stack = err.stack.split("\n");
                for(var e = 0;e < stack.length;e++)
                {
                    conn.write("3" + stack[e] + "\tlocalhost\70\n\r");
                }
                conn.write(".")
                conn.end();
            }
            if(fileExists)
            {
                var path = getConfig("root","doc") + selector;
                logger.info("Path: " + path);
                var selStat = fs.lstatSync(path);
                if(selStat.isDirectory())
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
                            var fileType = "9";
                            switch(pathMod.extname(fileName))
                            {
                                case ".txt":
                                    fileType = "0";
                                    break;
                                case ".gif":
                                    fileType = "g";
                                    break;
                                case ".mp3":
                                    if(!getConfig("allowMp3", false)) 
                                    {
                                        break;
                                    }
                                case ".wav":
                                    fileType = "s";
                                    break;
                            }
                            conn.write(fileType+fileName.substr(1)+"\t"+selector+fileName+"\tlocalhost\t70\n\r");
                        }
                    }
                    conn.write(".")
                }
                if(selStat.isFile())
                {
                    switch(pathMod.extname(path))
                    {
                        case ".txt":
                            var data = fs.readFileSync(path,{encoding: "utf-8"});
                            conn.write(data);
                            break;
                        default:
                            var data = fs.readFileSync(path);
                            conn.write(data)
                            break;
                    }
                }
                conn.end();
            }
        });
    });

    server.listen(getConfig("port", 70), function() {
        logger.info("Server bound");
    });
}

module.exports = createServer;