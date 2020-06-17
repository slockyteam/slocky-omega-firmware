const express = require('express');
const expressListEndpoints = require('express-list-endpoints');
const { exec, execSync } = require('child_process');

const SharedManager = require('./../shared_manager.js');
const SharedFunctions = require('./../shared_functions.js');
const WebSocket = require('./../web_socket.js');

/**
 * Variables
 */

var router = express.Router();

/**
 * Router
 */

// Home page

router.get('/', function(req, res) {
	return res.status(200).send(expressListEndpoints(router));
});

router.get('/device_info', function(req, res) {
	var results = {
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
	
	return res.status(200).send(results);
});

router.get('/network_info', function(req, res) {
	SharedFunctions.loadNetworkInfo(function(error, results) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send(results);
		}
	});
});

router.get('/wifi_access_point_settings', function(req, res) {
	SharedFunctions.loadWifiAccessPointSettings(function(error, results) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send(results);
		}
	});
});

router.get('/cellular_settings', function(req, res) {
	SharedFunctions.loadCellularSettings(function(error, results) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send(results);
		}
	});
});

router.post('/wifi_access_point_settings', function(req, res) {
	SharedFunctions.saveWifiAccessPointSettings(req.body, function(error) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send();
		}
	});
});

router.post('/cellular_settings', function(req, res) {
	SharedFunctions.saveCellularSettings(req.body, function(error) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send();
		}
	});
});

router.get('/device_settings', function(req, res) {
	SharedFunctions.loadDeviceSettings(function(error, results) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send(results);
		}
	});
});

router.post('/device_settings', function(req, res) {
	SharedFunctions.saveDeviceSettings(req.body, function(error) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send();
		}
	});
});

router.get('/wifi_scan', function(req, res) {
	SharedFunctions.wifiScan(function(error, results) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send(results);
		}
	});
});

router.get('/wifi_connections', function(req, res) {
	SharedFunctions.loadWifiConnections(function(error, results) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send(results);
		}
	});
});

router.delete('/wifi_connection', function(req, res) {
	SharedFunctions.deleteWifiConnection(req.body, function(error) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send();
		}
	});
});

router.put('/connect_wifi_connection', function(req, res) {
	SharedFunctions.connectWifiConnection(req.body, function(error) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send();
		}
	});
});

router.put('/disconnect_wifi_connection', function(req, res) {
	SharedFunctions.disconnectWifiConnection(req.body, function(error) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send();
		}
	});
});

router.post('/reboot_device', function(req, res) {
	res.status(200).send();
	
	SharedFunctions.rebootDevice();
});

/**
 * Module exports
 */

module.exports = router;
