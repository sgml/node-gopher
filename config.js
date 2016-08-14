var config = {}

config.host = "localhost";
config.port = 70;
config.motd = "motd.txt";
config.root = "doc";

function getConfig(opt, def)
{
    return config[opt] == null ? def : config[opt];
}

module.exports = getConfig;