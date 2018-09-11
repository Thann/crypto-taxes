// Entry point for your plugin
// This should expose your plugin's modules
/* START IMPORTS */
import modules from './plugins';
/* END IMPORTS */

const plugins = Object.keys(modules).map(name => modules[name]);

/* START EXPORTS */

export const metadata = {
  name: 'crypto-taxes',
  author: 'Jonathan Knapp',
  description: '',
  version: require('../package.json').version
};

export const pluginConfig = {plugins};

/* END EXPORTS */
