const dgram = require('dgram');

const SharedManager = require('./shared_manager.js');
const WebSocket = require('./web_socket.js');
		
		
/*
 * Variables
 */

var udpServer;

/*
 * Methods
 */

module.exports.udpSend = function(remoteAddress, remotePort, json, callback) {
	if (udpServer != null) {
		udpServer.send(JSON.stringify(json), remotePort, remoteAddress, function(error) {
			callback(error);
		});
		
		return true;
	} else {
		return false;
	}
};

module.exports.init = function() {
	udpServer = dgram.createSocket('udp4');
	
	udpServer.on('listening', function() {
		udpServer.setBroadcast(true);
		
		var address = udpServer.address();
		
		console.log('UDP Server is running on PORT: ' + address.port);
	});

	udpServer.on('message', function(message, remote) {		
		var json;
		
		try {
			json = JSON.parse(message);
		} catch (error) {
			console.log(error);
		}
		
 		if (json != null) {
 			if (command = json.command) {
				switch (command) {
					case 'scan_device': {
						const json = {
							command: 'device_info',
							status: WebSocket.isConnected() ? 'online' : 'offline',
							device_alias: SharedManager.deviceSettings.device_alias,
							device_identifier: SharedManager.deviceSettings.device_identifier,
							hardware: SharedManager.deviceSettings.hardware,
						  	hardware_info: SharedManager.hardwareInfo,
						  	firmware_version: SharedManager.firmwareSettings.firmware_version,
						  	hardware_version: SharedManager.deviceSettings.hardware_version,
						  	bootloader_version: SharedManager.bootloaderSettings.bootloader_version,
						  	local_api_server_port: SharedManager.deviceSettings.local_api_server_port,
						  	connected_at: WebSocket.connectedAt,
						  	disconnected_at: WebSocket.disconnectedAt,
						  	heartbeat_at: WebSocket.heartbeatAt,
						  	services: SharedManager.deviceSettings.services.map(function(service) {
						  		return {
							  		service_alias: service.service_alias,
							  		service_type: service.service_type,
							  		service_folder: service.service_folder,
									local_api_server_port: service.local_api_server_port,
									manufacturer: service.manufacturer
						  		};
						  	})
						};
						
						module.exports.udpSend(remote.address, remote.port, json, function(error) {
							if (error) {
								console.log(error);
							}
						});
						break;
					}
				}
			}
 		}
	});
	
	udpServer.bind(SharedManager.deviceSettings.udp_server_port);
};