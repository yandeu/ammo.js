/// <reference types="../../builds/ammo.d.ts" />

const { resolve } = require('path');

/**
 * 
 * @param {*} options 
 * @returns {Promise<Ammo>} ammo
 */
async function loadAmmo(options) {
  const { AMMO_PATH, PWD } = process.env;
  const path = AMMO_PATH ? resolve(PWD, AMMO_PATH) : '../../builds/ammo.js';
  const Ammo = require(path);
  return Ammo(options);
}

module.exports = loadAmmo;
