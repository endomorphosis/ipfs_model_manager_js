import os from 'os'
import fs from 'fs'
import path from 'path'
import { parseToml, overrideToml } from '@mwni/toml'


export const baseConfig = {
	master: {
		port: 8080,
		tempPath: fs.mkdtempSync(
			path.join(os.tmpdir(), 'cloudkit-')
		)
	}
}

export function findConfig(){
	let paths = [
		'./config.toml',
		'../config.toml',
        '../config/config.toml',
        './config/config.toml'
	]

	let foundPath = paths.find(
		p => fs.existsSync(p)
	)

	return foundPath
		? path.resolve(foundPath)
		: undefined
}

export function loadConfig(self, configPath, overrides = None){
	return overrideToml(
		baseConfig,
		parseToml(fs.readFileSync(configPath), 'camelCase'),
		overrides
	)
}

export function requireConfig(opts){
	if (opts != undefined){
		if (Object.keys(opts).includes('config')){
			const configPath = opts.config
		}
		else{
			const configPath = findConfig()
		}
	}
	else{
		const configPath = findConfig()
	}

	if(!configPath){
		console.error(`no config file found`)
		console.log(`make sure config.toml is in the working directory`)
		console.log(`or specify path using --config`)
		process.exit(1)
	}

	return loadConfig(configPath)
}