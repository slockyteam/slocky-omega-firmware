const ws = require('ws');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

const SharedManager = require('./shared_manager.js');
const SharedFunctions = require('./shared_functions.js');

/*
 * Variables
 */

var lastPongDate;
var webSocketConnection;

module.exports.webSocketStatus = null;
module.exports.connectedAt = null;
module.exports.disconnectedAt = null;
module.exports.heartbeatAt = null;

/*
 * Methods
 */

module.exports.webSocketSend = function(json) {
	if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
		var cipher = crypto.createCipher('aes-256-cbc', SharedManager.firmwareSettings.crypto_key, SharedManager.firmwareSettings.crypto_iv);
		var encrypted = Buffer.concat([cipher.update(JSON.stringify(json)), cipher.final()]);
		
		webSocketConnection.send(encrypted.toString('hex'));
		
		return true;
	} else {
		return false;
	}
};

module.exports.init = function() {
	module.exports.connect();
	
	setInterval(function() {
		if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
			module.exports.webSocketSend({
				command: 'device_ping',
				device_alias: SharedManager.deviceSettings.device_alias,
				device_identifier: SharedManager.deviceSettings.device_identifier
			});
		}
	}, SharedManager.firmwareSettings.web_socket_ping_interval);
	
	setInterval(function() {
		if (lastPongDate != null) {
			const seconds = (((new Date()).getTime() - lastPongDate.getTime()) / 1000);
				
			if (seconds > 30) {
				lastPongDate = null;
				
				if (webSocketConnection != null) {
					webSocketConnection.terminate();
					webSocketConnection = null;
				}
			}
		}
	
		if (webSocketConnection == null) {
			module.exports.connect();
		}
	}, SharedManager.firmwareSettings.web_socket_reconnect_interval);
};

module.exports.connect = function() {
	function webSocketConnect() {
		module.exports.webSocketStatus = 'disconnected';
		
		webSocketConnection = new ws(SharedManager.deviceSettings.web_socket_url, {
			origin: SharedManager.deviceSettings.api_server_url
		});
		
		webSocketConnection.on('open', function() {
			console.log('WebSocket: connected to server.');
			
			module.exports.connectedAt = new Date();
			module.exports.disconnectedAt = null;
			
			module.exports.webSocketStatus = 'connected';
			
			module.exports.webSocketSend({
				command: 'device_connect',
				device_alias: SharedManager.deviceSettings.device_alias,
			  	device_identifier: SharedManager.deviceSettings.device_identifier,
			  	hardware: SharedManager.deviceSettings.hardware,
			  	hardware_info: SharedManager.hardwareInfo,
			  	firmware_version: SharedManager.firmwareSettings.firmware_version,
			  	hardware_version: SharedManager.deviceSettings.hardware_version,
			  	bootloader_version: SharedManager.bootloaderSettings.bootloader_version,
			  	local_api_server_port: SharedManager.deviceSettings.local_api_server_port,
			  	services: SharedManager.deviceSettings.services.map(function(service) {
			  		return {
				  		service_alias: service.service_alias,
				  		service_type: service.service_type,
				  		service_folder: service.service_folder,
				  		local_api_server_port: service.local_api_server_port,
				  		manufacturer: service.manufacturer
			  		};
			  	})
			});
			
			lastPongDate = new Date();
		});
	
		webSocketConnection.on('close', function(error) {
			if (error == 3001) {
				console.error('WebSocket: device already exists.');
			} else if (error == 3002) {
				console.error('WebSocket: error adding device.');
			} else {
				console.error('WebSocket: closed.');
			}
			
			webSocketConnection = null;
			
			module.exports.disconnectedAt = new Date();
		});
		
		webSocketConnection.on('error', function(error) {
		    console.error('WebSocket: ' + error);
		});
	
		webSocketConnection.on('message', function(message) {
			var json;
			
			try {
				var decipher = crypto.createDecipher('aes-256-cbc', SharedManager.firmwareSettings.crypto_key, SharedManager.firmwareSettings.crypto_iv);
				var decrypted = Buffer.concat([decipher.update(Buffer.from(message, 'hex')), decipher.final()]);
				
				json = JSON.parse(decrypted.toString());
			} catch (error) {
			}

	 		if (json != null) {
				if (command = json.command) {
					json.device_identifier = SharedManager.deviceSettings.device_identifier;
					
					switch (command) {
						case 'pong': {
							//console.log('pong');
							
							lastPongDate = new Date();
							module.exports.heartbeatAt = new Date();
							break;
						}
						case 'load_network_info': {
							SharedFunctions.loadNetworkInfo(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.results =  results;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'load_wifi_access_point_settings': {
							SharedFunctions.loadWifiAccessPointSettings(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.results =  results;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'save_wifi_access_point_settings': {
							SharedFunctions.saveWifiAccessPointSettings(json.data, function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'load_cellular_settings': {
							SharedFunctions.loadCellularSettings(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.results =  results;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'save_cellular_settings': {
							SharedFunctions.saveCellularSettings(json.data, function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'cellular_on': {
							SharedFunctions.cellularOn(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'cellular_off': {
							SharedFunctions.cellularOff(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'save_device_settings': {
							SharedFunctions.saveDeviceSettings(json.data, function(error, results) {
								if (error) {
									json.error = error;
									
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'load_device_settings': {
							SharedFunctions.loadDeviceSettings(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.results =  results;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'reboot_device': {
							module.exports.webSocketSend(json);
							
							SharedFunctions.rebootDevice();
							break;
						}
						case 'update_device_firmware': {
							if (json.data != null && json.data.file_url != null) {
								module.exports.webSocketSend(json);
								
								console.log('Firmware file downloading...');
								
								if (fs.existsSync(SharedManager.firmwareBinFilePath)) {
									fs.unlinkSync(SharedManager.firmwareBinFilePath);
								}
								
								var file = fs.createWriteStream(SharedManager.firmwareBinFilePath);
								
								var request = https.get(json.data.file_url, function(response) {
									response.pipe(file);
									
									file.on('finish', function() {
								  		file.close(function() {
								  			console.log('Firmware file download finished.');
								  			
								  			module.exports.closeConnection();
								  			
								  			SharedFunctions.rebootDevice();
								  		});
								  	});
								}).on('error', function(error) {
									console.log(error);
									
							    	if (fs.existsSync(SharedManager.firmwareBinFilePath)) {
										fs.unlinkSync(SharedManager.firmwareBinFilePath);
									}
								});
							} else {
								json.error = "File url error.";
								
								module.exports.webSocketSend(json);
							}
							break;
						}
						case 'update_device_bootloader': {
							if (json.data != null && json.data.file_url != null) {
								module.exports.webSocketSend(json);
								
								console.log('Bootloader file downloading...');
								
								if (fs.existsSync(SharedManager.bootloaderBinFilePath)) {
									fs.unlinkSync(SharedManager.bootloaderBinFilePath);
								}
								
								var file = fs.createWriteStream(SharedManager.bootloaderBinFilePath);
								
								var request = https.get(json.data.file_url, function(response) {
									response.pipe(file);
									
									file.on('finish', function() {
								  		file.close(function() {
								  			console.log('Bootloader file download finished.');
								  			
								  			module.exports.closeConnection();
								  			
								  			SharedFunctions.rebootDevice();
								  		});
								  	});
								}).on('error', function(error) {
									console.log(error);
									
							    	if (fs.existsSync(SharedManager.bootloaderBinFilePath)) {
										fs.unlinkSync(SharedManager.bootloaderBinFilePath);
									}
								});
							} else {
								json.error = "File url error.";
								
								module.exports.webSocketSend(json);
							}
							break;
						}
						case 'wifi_scan': {
							SharedFunctions.wifiScan(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.results =  results;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'load_wifi_connections': {
							SharedFunctions.loadWifiConnections(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.results =  results;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'delete_wifi_connection': {
							SharedFunctions.deleteWifiConnection(data, function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'connect_wifi_connection': {
							SharedFunctions.connectWifiConnection(data, function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'disconnect_wifi_connection': {
							SharedFunctions.disconnectWifiConnection(data, function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						default: {
							json.error = "Wrong command."
							
							module.exports.webSocketSend(json);
							break;
						}
					}
				}
			}
		});
	};
	
	SharedManager.checkInternetConnection(function(error) {
		if (error == null) {
			webSocketConnect();
		} else {
			webSocketConnection == null;
			
			module.exports.webSocketStatus = 'no_internet';
		}
	});
};

module.exports.closeConnection = function() {
	if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
		webSocketConnection.close();
		webSocketConnection = null;
	}
};

module.exports.sendUpdateData = function() {
	if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
		module.exports.webSocketSend({
			command: 'update_device_data',
		  	hardware_info: SharedManager.hardwareInfo
		});
	}
};

module.exports.isConnected = function() {
	if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
		return true;
	} else {
		return false;
	}
};