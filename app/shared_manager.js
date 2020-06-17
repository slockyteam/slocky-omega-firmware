const fs = require('fs');
const { exec, execSync } = require('child_process');
const checkInternetConnected = require('check-internet-connected');
const merge = require('merge');

/*
 * Constants
 */

module.exports.deviceSettingsFilePath = '/root/device_settings.json';
module.exports.bootloaderSettingsFilePath = '/root/bootloader/settings.json';
module.exports.firmwareSettingsFilePath = 'settings.json';

module.exports.newFirmwareFolderPath = '/root/new_firmware';
module.exports.firmwareFolderPath = '/root/firmware';
module.exports.firmwareZipFilePath = '/root/firmware.zip';
module.exports.firmwareBinFilePath = '/root/firmware.bin';

module.exports.newBootloaderFolderPath = '/root/new_bootloader';
module.exports.bootloaderFolderPath = '/root/bootloader';
module.exports.bootloaderZipFilePath = '/root/bootloader.zip';
module.exports.bootloaderBinFilePath = '/root/bootloader.bin';

module.exports.servicesFolderPath = '/root/services';

/*
 * Variables
 */

var hardwareInfo = {};

module.exports.hardwareInfo = hardwareInfo;

/*
 * Methods
 */

module.exports.checkInternetConnection = function(callback) {
    const config = {
    	timeout: 2000,
		retries: 3,
		domain: 'google.com'
	};
	
    checkInternetConnected(config).then(() => {
		callback();        
    }).catch((error) => {
		callback(error);
    });
};

module.exports.readDeviceSettings = function() {
	if (fs.existsSync(module.exports.deviceSettingsFilePath)) {
		try {
			const rawdata = fs.readFileSync(module.exports.deviceSettingsFilePath, 'utf8');
			module.exports.deviceSettings = (rawdata != null) ? JSON.parse(rawdata) : null;
		} catch (exception) {
		}
	}

	if (module.exports.deviceSettings == null) {
		throw new Error('Error reading device settings!');
	}
};

module.exports.readBootloaderSettings = function() {
	if (fs.existsSync(module.exports.bootloaderSettingsFilePath)) {
		try {
			const rawdata = fs.readFileSync(module.exports.bootloaderSettingsFilePath, 'utf8');
			module.exports.bootloaderSettings = (rawdata != null) ? JSON.parse(rawdata) : null;
		} catch (exception) {
		}
	}

	if (module.exports.bootloaderSettings == null) {
		throw new Error('Error reading bootloader settings!');
	}
};

module.exports.readFirmwareSettings = function() {
	if (fs.existsSync(module.exports.firmwareSettingsFilePath)) {
		try {
			const rawdata = fs.readFileSync(module.exports.firmwareSettingsFilePath, 'utf8');
			module.exports.firmwareSettings = (rawdata != null) ? JSON.parse(rawdata) : null;
		} catch (exception) {
		}
	}

	if (module.exports.firmwareSettings == null) {
		throw new Error('Error reading firmware settings!');
	}
};

module.exports.writeDeviceSettings = function(data) {
	module.exports.deviceSettings = merge(module.exports.deviceSettings, data);
	
	fs.writeFile(module.exports.deviceSettingsFilePath, JSON.stringify(module.exports.deviceSettings), function(error) {
		execSync('sync');
	});
};

module.exports.writeServiceSettings = function(data) {
	var deviceSettings = module.exports.deviceSettings;
		
	var newService = module.exports.service;
	newService.settings = merge(module.exports.service.settings, data);
	
	var services = deviceSettings.services;
	var index = null;
	
	for (var i = 0; i < services.length; i++) {
		if (services[i].service_folder == module.exports.service.service_folder) {
			index = i;
			break;
		}
	}
	
	if (index != null) {
		services.splice(index, 1);
		
		services.push(newService);
		
		deviceSettings.services = services;
		
		module.exports.writeDeviceSettings(deviceSettings);
	}
};