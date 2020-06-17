const fs = require('fs');
const { exec, execSync } = require('child_process');
const http = require('http');

const SharedManager = require('./app/shared_manager.js');
const UdpServer = require('./app/udp_server.js');
const WebSocket = require('./app/web_socket.js');
const LocalApiServer = require('./app/local_api_server/local_api_server.js');

require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l Z' });

/*
 * Constants
 */

const ProcessFilePath = './process.json';

/*
 * Write process file
 */

const processJson = JSON.stringify({
	pid: process.pid
});  
fs.writeFileSync(ProcessFilePath, processJson);

/*
 * Start
 */

SharedManager.readDeviceSettings();

SharedManager.readBootloaderSettings();

SharedManager.readFirmwareSettings();

// Web socket

WebSocket.init();

// UDP server

UdpServer.init();

// Local api server

LocalApiServer.init();

// Services

if (SharedManager.deviceSettings.services != null) {
	SharedManager.deviceSettings.services.forEach(function(service) {
		if (fs.existsSync(SharedManager.servicesFolderPath + '/' + service.service_folder)) {
			function startService() {
				if (fs.existsSync(SharedManager.servicesFolderPath +  '/' + service.service_folder + '/start.sh')) {
					exec('sh start.sh', { cwd: SharedManager.servicesFolderPath +  '/' + service.service_folder }, (error, stdout, stderr) => {
						if (error != null) {
							console.log(error);
						} else {
							console.log("Service started: " + service.service_alias);
						}
					});
				} else {
					console.log("Start script not found for service: " + service.service_alias);
				}	
			};
			
			if (!fs.existsSync(SharedManager.servicesFolderPath + '/' + service.service_folder + '/node_modules')){
				if (fs.existsSync(SharedManager.servicesFolderPath + '/' + service.service_folder + '/install.sh')) {
					console.log("Installing libraries for service: " + service.service_alias);
				
					exec('sh install.sh', { cwd: SharedManager.servicesFolderPath + '/' + service.service_folder }, (error, stdout, stderr) => {		
						if (error != null) {
							console.log(error);
						} else {
							console.log("Libraries installed for service: " + service.service_alias);
							
							startService();
						}
					});
				} else {
					console.log("Install script not found for service: " + service.service_alias);
				}
			} else {
				console.log("Libraries already installed for service: " + service.service_alias);
				
				startService();
			}
		}
	});
}

// Timer

setInterval(function() {
	WebSocket.sendUpdateData();
}, SharedManager.firmwareSettings.web_socket_update_data_interval);