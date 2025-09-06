// @ts-check

import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const BULLET_PATH = resolve('./bullet3')
const options = { encoding: 'utf-8' }

/**
 *
 * @param {string} file
 */
function get_license_header(file) {
  let m = file.match(/^(\/\*\*?)(.*?)(?=\*\/)(\*\/)/s)
  if (!m) throw 'No License Header found!'
  return m[2]
}

function comment_lines(file) {
  let lines = file.split(/\r?\n/)
  lines = lines.map(l => '// ' + l)
  return lines.join('\n')
}

// ## modify front-matter.js
{
  const LICENSE = await readFile('LICENSE', options)
  const AUTHORS = await readFile('AUTHORS', options)
  const HACD = await readFile(join(BULLET_PATH, 'Extras', 'HACD', 'hacdHACD.h'), options)

  let version = 'UNKNOWN'
  {
    const filePath = join(BULLET_PATH, 'VERSION')
    let file = await readFile(filePath, options)
    version = file.split('\n')[0]
  }
  const text = `// This is ammo.js, a port of Bullet Physics to JavaScript. zlib licensed.

// -- About --
// This version of ammo.js was built by @yandeu (https://github.com/yandeu/ammo.js)
// and is based on Bullet version ${version}, and it includes one or more Bullet Physics Extras.

// -- LICENSE --
${comment_lines(LICENSE)}

// -- AUTHORS --
${comment_lines(AUTHORS)}

// -- HACD Extra --
${comment_lines(get_license_header(HACD))}
`

  const filePath = 'front-matter.js'
  // let file = await readFile(filePath, options)
  await writeFile(filePath, text, options)
}

// ## AMMO Changed CMAKE_SOURCE_DIR to CMAKE_CURRENT_SOURCE_DIR in bullet3/CMakeLists.txt
// (see: https://github.com/kripken/ammo.js/commit/36e4612a098f71e147f08c8a4c42cbdbb48429f9)
{
  const filePath = join(BULLET_PATH, 'CMakeLists.txt')
  let file = await readFile(filePath, options)
  file = file.replaceAll('CMAKE_SOURCE_DIR', 'CMAKE_CURRENT_SOURCE_DIR')
  await writeFile(filePath, file, options)
}

// ## add the following to btDiscreteDynamicsWorld.h
// (see: https://github.com/kripken/ammo.js/commit/5eb3b2c3ee47b0719fe1c4ddcc080a429d4f54aa && https://github.com/kripken/ammo.js/commit/11b2af2b81529904db70f3bcbedaad60d3b03d48)
{
  const filePath = join(BULLET_PATH, 'src', 'BulletDynamics', 'Dynamics', 'btDiscreteDynamicsWorld.h')
  let file = await readFile(filePath, options)
  const replaceValue = `
  // XXX EMSCRIPTEN: Contact callback support
 	void setContactAddedCallback(unsigned long callbackFunction) {
 	  gContactAddedCallback = (ContactAddedCallback)callbackFunction;
 	}
 	void setContactProcessedCallback(unsigned long callbackFunction) {
 		gContactProcessedCallback = (ContactProcessedCallback)callbackFunction;
 	}
 	void setContactDestroyedCallback(unsigned long callbackFunction) {
 		gContactDestroyedCallback = (ContactDestroyedCallback)callbackFunction;
 	}
};

#endif //BT_DISCRETE_DYNAMICS_WORLD_H`
  const searchValue = new RegExp(
    `
};

#endif //BT_DISCRETE_DYNAMICS_WORLD_H`,
    'gm'
  )

  if (!file.includes('XXX EMSCRIPTEN')) {
    if (!file.match(searchValue)) throw 'searchValue not found! [btDiscreteDynamicsWorld.h]'
    file = file.replace(searchValue, replaceValue)
    await writeFile(filePath, file, options)
  }
}

// ## add the follwoing to "btDynamicsWorld.h" after "void setInternalTickCallback(btInternalTickCallback cb,	void* worldUserInfo=0,bool isPreTick=false) "
// (see:https://github.com/kripken/ammo.js/commit/ba89a9665650064dbe52dd8410f05256597fd3e0)
{
  const filePath = join(BULLET_PATH, 'src', 'BulletDynamics', 'Dynamics', 'btDynamicsWorld.h')
  let file = await readFile(filePath, options)
  const replaceValue = `		// XXX AMMO overloaded for callback type compatibility with emscripten WebIDL
		void setInternalTickCallback(void* cb, void* worldUserInfo=0, bool isPreTick=false) {
			setInternalTickCallback((btInternalTickCallback)cb, worldUserInfo, isPreTick);
		}

		void	setWorldUserInfo(void* worldUserInfo)`
  const searchValue = `		void	setWorldUserInfo(void* worldUserInfo)`

  if (!file.includes('XXX AMMO')) {
    if (!file.includes(searchValue)) throw 'searchValue not found! [btDynamicsWorld.h]'
    file = file.replace(searchValue, replaceValue)
    await writeFile(filePath, file, options)
  }
}
