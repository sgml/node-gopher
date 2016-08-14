var config = {}

// Configures the bound host for the Gopher server
// *CURRENTLY NOT FUNCTIONING*
config.host = "localhost";

// Configures the bound port for the Gopher server
config.port = 70;

// The file to load as the "Message Of The Day", a text file.
config.motd = "motd.txt";

// The root document, from which all other static content is derived.
config.root = "doc";

function getConfig(opt, def)
{
    return config[opt] == null ? def : config[opt];
}

module.exports = getConfig;